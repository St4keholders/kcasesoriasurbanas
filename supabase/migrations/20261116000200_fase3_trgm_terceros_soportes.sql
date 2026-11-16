-- =====================================================================
-- KC Asesorías Urbanas S.A.S — Fase 3: pg_trgm, normalización de NIT/DV,
-- eliminación de 000000000, Proveedor Ocasional único y metadatos de soportes
-- =====================================================================

create extension if not exists "pg_trgm";

-- 1. Función SQL para calcular el Dígito de Verificación (Módulo 11 DIAN)
create or replace function public.calculate_dian_dv(p_nit text)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  v_clean text;
  v_primes int[] := array[3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  v_len int;
  v_sum int := 0;
  v_digit int;
  v_rem int;
  i int;
begin
  v_clean := regexp_replace(coalesce(p_nit, ''), '[^0-9]', '', 'g');
  v_len := length(v_clean);
  if v_len = 0 or v_len > 15 then
    return null;
  end if;

  for i in 1..v_len loop
    v_digit := substring(v_clean from (v_len - i + 1) for 1)::int;
    v_sum := v_sum + (v_digit * v_primes[i]);
  end loop;

  v_rem := v_sum % 11;
  if v_rem in (0, 1) then
    return v_rem;
  else
    return 11 - v_rem;
  end if;
end;
$$;

-- 2. Columnas en suppliers para NIT limpio, DV y banderas tributarias
alter table public.suppliers
  add column if not exists nit_normalized text,
  add column if not exists dv text,
  add column if not exists is_occasional boolean not null default false,
  add column if not exists has_rut boolean not null default false,
  add column if not exists is_billing_obligated boolean not null default true;

-- Eliminar el uso del comodín '000000000' y '0' en suppliers y petty_cash_entries
update public.suppliers
set document_number = null
where regexp_replace(coalesce(document_number, ''), '[^0-9]', '', 'g') in ('', '0', '000000000', '0000000000');

update public.petty_cash_entries
set supplier_document = null
where regexp_replace(coalesce(supplier_document, ''), '[^0-9]', '', 'g') in ('', '0', '000000000', '0000000000');

-- Normalizar NIT (si tiene guion ej. 902012620-0 separar NIT y DV)
update public.suppliers
set
  nit_normalized = case
    when document_number is null then null
    when document_number like '%-%' then nullif(regexp_replace(split_part(document_number, '-', 1), '[^0-9]', '', 'g'), '')
    else nullif(regexp_replace(document_number, '[^0-9]', '', 'g'), '')
  end,
  dv = case
    when document_number like '%-%' then nullif(regexp_replace(split_part(document_number, '-', 2), '[^0-9]', '', 'g'), '')
    else dv
  end
where document_number is not null;

-- Garantizar un único tercero "Proveedor Ocasional"
do $$
declare
  v_primary_id uuid;
begin
  select id into v_primary_id
  from public.suppliers
  where lower(trim(name)) = 'proveedor ocasional'
  order by created_at asc
  limit 1;

  if v_primary_id is null then
    insert into public.suppliers (name, document_number, nit_normalized, is_active, is_occasional)
    values ('Proveedor Ocasional', null, null, true, true)
    returning id into v_primary_id;
  else
    update public.suppliers
    set name = 'Proveedor Ocasional',
        document_number = null,
        nit_normalized = null,
        is_occasional = true,
        is_active = true
    where id = v_primary_id;

    update public.purchases
    set supplier_id = v_primary_id
    where supplier_id in (
      select id from public.suppliers
      where lower(trim(name)) = 'proveedor ocasional' and id <> v_primary_id
    );

    update public.suppliers
    set is_active = false
    where lower(trim(name)) = 'proveedor ocasional' and id <> v_primary_id;
  end if;
end $$;

create index if not exists idx_suppliers_nit_normalized on public.suppliers(nit_normalized);
create index if not exists idx_suppliers_name_trgm on public.suppliers using gin (name gin_trgm_ops);

-- Función de búsqueda de proveedor: primero por NIT exacto/prefijo, luego por similitud de nombre (pg_trgm)
create or replace function public.search_suppliers_smart(p_query text, p_limit int default 15)
returns table (
  id uuid,
  name text,
  document_number text,
  nit_normalized text,
  dv text,
  email text,
  phone text,
  address text,
  is_active boolean,
  is_occasional boolean,
  match_type text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with clean_input as (
    select
      trim(coalesce(p_query, '')) as q,
      regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g') as digits
  )
  select
    s.id,
    s.name,
    s.document_number,
    s.nit_normalized,
    s.dv,
    s.email,
    s.phone,
    s.address,
    s.is_active,
    s.is_occasional,
    case
      when ci.digits <> '' and s.nit_normalized = ci.digits then 'nit_exact'
      when ci.digits <> '' and s.nit_normalized like ci.digits || '%' then 'nit_prefix'
      else 'name_trgm'
    end as match_type,
    case
      when ci.digits <> '' and s.nit_normalized = ci.digits then 2.0::real
      when ci.digits <> '' and s.nit_normalized like ci.digits || '%' then 1.5::real
      else greatest(similarity(s.name, ci.q), case when s.name ilike '%' || ci.q || '%' then 0.4::real else 0.0::real end)
    end as score
  from public.suppliers s
  cross join clean_input ci
  where s.is_active = true
    and (
      ci.q = ''
      or (ci.digits <> '' and s.nit_normalized like ci.digits || '%')
      or s.name % ci.q
      or s.name ilike '%' || ci.q || '%'
    )
  order by score desc, s.name asc
  limit p_limit;
$$;

-- 3. Metadatos de soportes en purchases, petty_cash_entries y sales
alter table public.purchases
  add column if not exists support_sha256 text,
  add column if not exists support_storage_path text,
  add column if not exists legacy_drive_url text;

alter table public.petty_cash_entries
  add column if not exists support_sha256 text,
  add column if not exists support_storage_path text,
  add column if not exists legacy_drive_url text;

alter table public.sales
  add column if not exists support_sha256 text,
  add column if not exists support_storage_path text,
  add column if not exists legacy_drive_url text;

create index if not exists idx_purchases_support_sha256 on public.purchases(support_sha256) where support_sha256 is not null;
create index if not exists idx_petty_cash_entries_support_sha256 on public.petty_cash_entries(support_sha256) where support_sha256 is not null;

-- Preservar enlaces históricos de Google Drive en legacy_drive_url
update public.purchases
set legacy_drive_url = coalesce(
  invoice_url,
  substring(notes from 'https?://drive\.google\.com/[^\s]+')
)
where legacy_drive_url is null
  and (
    invoice_url like '%drive.google.com%'
    or notes like '%drive.google.com%'
  );

update public.petty_cash_entries
set legacy_drive_url = receipt_url
where legacy_drive_url is null
  and receipt_url like '%drive.google.com%';

-- Actualizar vista petty_cash_entries_full para exponer support_sha256, support_storage_path y legacy_drive_url
drop view if exists public.petty_cash_entries_full;
create view public.petty_cash_entries_full
with (security_invoker = true)
as
select
  e.id,
  e.box_id,
  e.entry_type,
  e.entry_date,
  e.supplier_name,
  e.supplier_document,
  e.invoice_number,
  e.concept,
  e.tax_amount,
  e.total_amount,
  e.receipt_url,
  e.support_sha256,
  e.support_storage_path,
  e.legacy_drive_url,
  e.status,
  e.voided_at,
  e.voided_by,
  e.void_reason,
  e.created_at,
  e.updated_at,
  e.created_by,
  b.box_number,
  b.cost_center_id,
  c.name as cost_center_name,
  p.full_name as created_by_name
from public.petty_cash_entries e
join public.petty_cash_boxes b on b.id = e.box_id
left join public.cost_centers c on c.id = b.cost_center_id
left join public.profiles p on p.id = e.created_by;

revoke all on public.petty_cash_entries_full from public, anon;
grant select on public.petty_cash_entries_full to authenticated, service_role;
