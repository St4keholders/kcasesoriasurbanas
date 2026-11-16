-- =====================================================================
-- KC Asesorías Urbanas S.A.S — Fase 6B y Fase 7:
-- Tabla document_ingestions y Vista v_pendientes_legales (11 motivos)
-- =====================================================================

create table if not exists public.document_ingestions (
  id                     uuid primary key default gen_random_uuid(),
  storage_path           text not null,
  sha256                 text not null,
  source                 text not null default 'manual' check (source in ('manual', 'masivo', 'caja_menor', 'xml_dian')),
  status                 text not null default 'pendiente_revision' check (status in ('procesando', 'pendiente_revision', 'aprobado', 'rechazado', 'error')),
  document_type          text not null default 'factura_electronica' check (document_type in ('factura_electronica', 'documento_soporte', 'tirilla_pos', 'cuenta_cobro', 'recibo_caja_menor', 'otro')),
  cufe                   text,
  supplier_name          text,
  supplier_nit           text,
  supplier_dv            text,
  third_party_id         uuid references public.third_parties(id),
  cost_center_id         uuid references public.cost_centers(id),
  invoice_number         text,
  issue_date             date,
  concept                text,
  subtotal               numeric(14,2) not null default 0,
  tax_iva                numeric(14,2) not null default 0,
  withholding_tax        numeric(14,2) not null default 0,
  total                  numeric(14,2) not null default 0,
  suggested_account_code text references public.chart_of_accounts(code),
  extracted_data         jsonb not null default '{}'::jsonb,
  confidence             numeric(5,4) not null default 0,
  warnings               text[] not null default '{}',
  purchase_id            uuid references public.purchases(id),
  cc_entry_id            uuid references public.journal_entries(id),
  ce_entry_id            uuid references public.journal_entries(id),
  created_by             uuid references public.profiles(id),
  reviewed_by            uuid references public.profiles(id),
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_document_ingestions_sha256 on public.document_ingestions(sha256);
create index if not exists idx_document_ingestions_status on public.document_ingestions(status);
create index if not exists idx_document_ingestions_third_party on public.document_ingestions(third_party_id);
create index if not exists idx_document_ingestions_cost_center on public.document_ingestions(cost_center_id);
create index if not exists idx_document_ingestions_purchase on public.document_ingestions(purchase_id);

alter table public.document_ingestions enable row level security;

drop policy if exists document_ingestions_read on public.document_ingestions;
create policy document_ingestions_read on public.document_ingestions
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

drop policy if exists document_ingestions_insert on public.document_ingestions;
create policy document_ingestions_insert on public.document_ingestions
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists document_ingestions_update on public.document_ingestions;
create policy document_ingestions_update on public.document_ingestions
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

drop trigger if exists trg_audit_document_ingestions on public.document_ingestions;
create trigger trg_audit_document_ingestions
  after insert or update or delete on public.document_ingestions
  for each row execute function public.fn_audit_log_trigger();

-- ---------------------------------------------------------------------
-- VISTA v_pendientes_legales (11 motivos tributarios y contables — Fase 7)
-- ---------------------------------------------------------------------
drop view if exists public.v_pendientes_legales;
create view public.v_pendientes_legales
with (security_invoker = true)
as
with dup_purchases as (
  select
    p.id
  from public.purchases p
  where p.status <> 'anulado'
    and exists (
      select 1
      from public.purchases p2
      where p2.id <> p.id
        and p2.status <> 'anulado'
        and (
          (p.support_sha256 is not null and p2.support_sha256 = p.support_sha256)
          or (
            p.third_party_id is not null
            and p2.third_party_id = p.third_party_id
            and p.invoice_number is not null
            and trim(p.invoice_number) <> ''
            and lower(trim(p2.invoice_number)) = lower(trim(p.invoice_number))
          )
          or (
            p.third_party_id is not null
            and p2.third_party_id = p.third_party_id
            and p2.transaction_date = p.transaction_date
            and p2.total = p.total
            and p.total > 0
          )
        )
    )
)
-- 1. Sin soporte (Compras y Caja Menor)
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.total as amount,
  'sin soporte'::text as motivo,
  'La compra no tiene archivo soporte adjunto en Storage.'::text as detalle
from public.purchases p
left join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id
where p.status <> 'anulado'
  and coalesce(p.invoice_url, '') = ''
  and coalesce(p.support_storage_path, '') = ''
  and coalesce(p.legacy_drive_url, '') = ''

union all

select
  'petty_cash_entries'::text as source_table,
  e.id as source_id,
  'CM-' || b.box_number::text as document_ref,
  e.entry_date as record_date,
  e.third_party_id,
  e.supplier_name as third_party_name,
  e.supplier_document as third_party_nit,
  b.cost_center_id,
  cc.name as cost_center_name,
  e.concept,
  e.total_amount as amount,
  'sin soporte'::text as motivo,
  'El egreso de caja menor no tiene soporte adjunto.'::text as detalle
from public.petty_cash_entries e
join public.petty_cash_boxes b on b.id = e.box_id
left join public.cost_centers cc on cc.id = b.cost_center_id
where coalesce(e.status, 'activo') <> 'anulado'
  and (e.entry_type = 'egreso' or e.entry_type is null)
  and coalesce(e.receipt_url, '') = ''
  and coalesce(e.support_storage_path, '') = ''
  and coalesce(e.legacy_drive_url, '') = ''

union all

-- 2. Soporte que no es factura
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.total as amount,
  'soporte que no es factura'::text as motivo,
  'Registro sin número de factura electrónica válido o con soporte tipo recibo/tirilla.'::text as detalle
from public.purchases p
left join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id
where p.status <> 'anulado'
  and (p.invoice_number is null or trim(p.invoice_number) = '')
  and (p.invoice_url is not null or p.support_storage_path is not null or p.legacy_drive_url is not null)

union all

-- 3. No obligado a facturar sin documento soporte de adquisiciones (Res. DIAN 000167 de 2021)
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.total as amount,
  'no obligado a facturar sin documento soporte de adquisiciones'::text as motivo,
  'Tercero persona natural / no obligado a facturar sin Documento Soporte electrónico (Res. DIAN 000167 de 2021).'::text as detalle
from public.purchases p
join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id
where p.status <> 'anulado'
  and tp.is_billing_obligated = false
  and (p.invoice_number is null or p.invoice_number not ilike 'DS%')

union all

-- 4. Tercero sin identificar, sin RUT o con DV inválido
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.total as amount,
  'tercero sin identificar, sin RUT o con DV inválido'::text as motivo,
  case
    when tp.id is null or tp.is_occasional then 'Asignado a Proveedor Ocasional (identificar tercero real).'
    when tp.nit_normalized is null then 'El tercero no tiene NIT o documento registrado.'
    when tp.is_dv_valid = false then 'El dígito de verificación (DV) del tercero no es válido en módulo 11 DIAN.'
    else 'El tercero no cuenta con RUT validado.'
  end as detalle
from public.purchases p
left join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id
where p.status <> 'anulado'
  and (
    tp.id is null
    or tp.is_occasional = true
    or tp.nit_normalized is null
    or tp.is_dv_valid = false
    or tp.has_rut = false
  )

union all

-- 5. Retención no practicada
select
  je.source_table,
  je.source_id,
  je.entry_number as document_ref,
  je.entry_date as record_date,
  je.third_party_id,
  coalesce(tp.name, 'Tercero') as third_party_name,
  tp.document_number as third_party_nit,
  je.cost_center_id,
  cc.name as cost_center_name,
  je.concept,
  je.withholding_expected as amount,
  'retención no practicada'::text as motivo,
  'Supera base en UVT 2026 y no registra retención practicada (esperada: $' || round(je.withholding_expected)::text || ').'::text as detalle
from public.journal_entries je
left join public.third_parties tp on tp.id = je.third_party_id
left join public.cost_centers cc on cc.id = je.cost_center_id
where je.status <> 'anulado'
  and je.entry_type = 'CC'
  and je.missing_withholding = true

union all

-- 6. IVA descontable sin factura electrónica
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.tax_iva as amount,
  'IVA descontable sin factura electrónica'::text as motivo,
  'Registra IVA > $0 pero no cuenta con factura electrónica a nombre de KC; el IVA suma al gasto/costo.'::text as detalle
from public.purchases p
left join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id
where p.status <> 'anulado'
  and coalesce(p.tax_iva, 0) > 0
  and (p.invoice_number is null or trim(p.invoice_number) = '')

union all

-- 7. Gasto no deducible
select
  je.source_table,
  je.source_id,
  je.entry_number as document_ref,
  je.entry_date as record_date,
  je.third_party_id,
  coalesce(tp.name, 'Tercero') as third_party_name,
  tp.document_number as third_party_nit,
  je.cost_center_id,
  cc.name as cost_center_name,
  je.concept,
  je.total_debit as amount,
  'gasto no deducible'::text as motivo,
  'Clasificado en 531595 GASTOS NO DEDUCIBLES (is_deductible = false).'::text as detalle
from public.journal_entries je
left join public.third_parties tp on tp.id = je.third_party_id
left join public.cost_centers cc on cc.id = je.cost_center_id
where je.status <> 'anulado'
  and je.entry_type = 'CC'
  and je.is_personal_expense = true

union all

-- 8. Soporte a nombre de tercero
select
  je.source_table,
  je.source_id,
  je.entry_number as document_ref,
  je.entry_date as record_date,
  je.third_party_id,
  coalesce(tp.name, 'Tercero') as third_party_name,
  tp.document_number as third_party_nit,
  je.cost_center_id,
  cc.name as cost_center_name,
  je.concept,
  je.total_debit as amount,
  'soporte a nombre de tercero'::text as motivo,
  'Pago notarial o de registro asumido por KC con soporte emitido a nombre del cliente (615595).'::text as detalle
from public.journal_entries je
left join public.third_parties tp on tp.id = je.third_party_id
left join public.cost_centers cc on cc.id = je.cost_center_id
where je.status <> 'anulado'
  and je.entry_type = 'CC'
  and je.is_third_party_support = true

union all

-- 9. Posible duplicado
select
  'purchases'::text as source_table,
  p.id as source_id,
  p.purchase_number as document_ref,
  p.transaction_date as record_date,
  p.third_party_id,
  coalesce(tp.name, p.supplier_name, 'Proveedor Ocasional') as third_party_name,
  tp.document_number as third_party_nit,
  p.cost_center_id,
  cc.name as cost_center_name,
  p.concept,
  p.total as amount,
  'posible duplicado'::text as motivo,
  'Coincide en SHA-256, (NIT + factura) o (NIT + fecha + valor total) con otra compra activa.'::text as detalle
from public.purchases p
join dup_purchases dp on dp.id = p.id
left join public.third_parties tp on tp.id = p.third_party_id
left join public.cost_centers cc on cc.id = p.cost_center_id

union all

-- 10. Confianza baja
select
  je.source_table,
  je.source_id,
  je.entry_number as document_ref,
  je.entry_date as record_date,
  je.third_party_id,
  coalesce(tp.name, 'Tercero') as third_party_name,
  tp.document_number as third_party_nit,
  je.cost_center_id,
  cc.name as cost_center_name,
  je.concept,
  je.total_debit as amount,
  'confianza baja'::text as motivo,
  'Clasificación con confianza < 0.85 (' || round(je.ai_confidence * 100)::text || '%) o compra en $0 pendiente de revisión.'::text as detalle
from public.journal_entries je
left join public.third_parties tp on tp.id = je.third_party_id
left join public.cost_centers cc on cc.id = je.cost_center_id
where je.status <> 'anulado'
  and je.entry_type = 'CC'
  and je.ai_confidence < 0.85

union all

-- 11. Borrador sin contabilizar
select
  je.source_table,
  je.source_id,
  je.entry_number as document_ref,
  je.entry_date as record_date,
  je.third_party_id,
  coalesce(tp.name, 'Tercero') as third_party_name,
  tp.document_number as third_party_nit,
  je.cost_center_id,
  cc.name as cost_center_name,
  je.concept,
  je.total_debit as amount,
  'borrador sin contabilizar'::text as motivo,
  'Comprobante en estado borrador pendiente de cierre por el contador.'::text as detalle
from public.journal_entries je
left join public.third_parties tp on tp.id = je.third_party_id
left join public.cost_centers cc on cc.id = je.cost_center_id
where je.status = 'borrador';

revoke all on public.v_pendientes_legales from public, anon;
grant select on public.v_pendientes_legales to authenticated, service_role;
