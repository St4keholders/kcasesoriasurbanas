-- =====================================================================
-- Contabilidad simplificada KC (16-nov-2026)
-- - Categorías de gasto/costo controladas por el contador (oficina / obra)
-- - Estados de comprobante: pendiente → aprobado (bloqueado) | anulado
-- - Numeración CC-KCU-0001 / CE-KCU-0001 / RC-KCU-0001 / NC-KCU-0001
-- - Generación de CC + CE desde Tesorería / Caja menor (función única)
-- - IVA y retenciones se MAPEAN desde la factura, no se calculan
-- No borra comprobantes ni operaciones.
-- =====================================================================

-- ---------- 1. Plan de cuentas: auxiliares y cuentas nuevas ----------
alter table public.chart_of_accounts drop constraint if exists chart_of_accounts_level_check;
alter table public.chart_of_accounts add constraint chart_of_accounts_level_check check (level in ('clase','grupo','cuenta','subcuenta','auxiliar'));

insert into public.chart_of_accounts (code, name, account_class, level, parent_code, nature, is_postable, requires_third_party, requires_cost_center, is_active)
values
  ('51050601', 'PERSONAL OBRA O LABOR', 5, 'auxiliar', '510506', 'debito', true, true, true, true),
  ('51050602', 'SUELDOS ACCIONISTAS', 5, 'auxiliar', '510506', 'debito', true, true, true, true),
  ('51109501', 'CONTRATISTAS', 5, 'auxiliar', '511095', 'debito', true, true, true, true),
  ('52', 'OPERACIONALES DE VENTAS', 5, 'grupo', '5', 'debito', false, false, true, true),
  ('5235', 'SERVICIOS', 5, 'cuenta', '52', 'debito', false, true, true, true),
  ('523560', 'PUBLICIDAD, PROPAGANDA Y PROMOCIÓN', 5, 'subcuenta', '5235', 'debito', true, true, true, true),
  ('5295', 'DIVERSOS', 5, 'cuenta', '52', 'debito', false, true, true, true),
  ('529505', 'COMISIONES', 5, 'subcuenta', '5295', 'debito', true, true, true, true),
  ('513040', 'FLOTA Y EQUIPO DE TRANSPORTE', 5, 'subcuenta', '5130', 'debito', true, true, true, true),
  ('519535', 'COMBUSTIBLES Y LUBRICANTES', 5, 'subcuenta', '5195', 'debito', true, true, true, true),
  ('51959501', 'PAGOS CON TARJETA DE CRÉDITO Y DIVISAS', 5, 'auxiliar', '519595', 'debito', true, true, true, true),
  ('51959502', 'CUOTAS DE CRÉDITOS Y FINANCIACIONES', 5, 'auxiliar', '519595', 'debito', true, true, true, true),
  ('61201001', 'MATERIALES DE OBRA', 6, 'auxiliar', '612010', 'debito', true, true, true, true),
  ('61201002', 'MANO DE OBRA', 6, 'auxiliar', '612010', 'debito', true, true, true, true),
  ('61201003', 'TRANSPORTE DE OBRA', 6, 'auxiliar', '612010', 'debito', true, true, true, true),
  ('61201007', 'ESTUDIOS TÉCNICOS', 6, 'auxiliar', '612010', 'debito', true, true, true, true),
  ('61201095', 'OTROS COSTOS DE OBRA', 6, 'auxiliar', '612010', 'debito', true, true, true, true)
on conflict (code) do update set name = excluded.name, is_active = true, is_postable = excluded.is_postable;

update public.chart_of_accounts set name = 'CONSTRUCCIÓN DE EDIFICIOS Y OBRAS DE INGENIERÍA CIVIL' where code = '612010';
update public.chart_of_accounts set name = 'NOTARIALES Y REGISTRO ASUMIDOS (FACTURA A NOMBRE DEL CLIENTE)' where code = '615595';

-- ---------- 2. Categorías ----------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 100,
  office_account text not null references public.chart_of_accounts(code),
  obra_account text references public.chart_of_accounts(code),
  payable_account text not null default '230505' references public.chart_of_accounts(code),
  withholding_account text not null default '236525' references public.chart_of_accounts(code),
  is_deductible boolean not null default true,
  ai_hint text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expense_categories enable row level security;
drop policy if exists expense_categories_read on public.expense_categories;
create policy expense_categories_read on public.expense_categories for select to authenticated using (true);
drop policy if exists expense_categories_write on public.expense_categories;
create policy expense_categories_write on public.expense_categories for all to authenticated
  using (public.has_role(variadic array['admin'::public.user_role]))
  with check (public.has_role(variadic array['admin'::public.user_role]));

insert into public.expense_categories (slug, name, sort_order, office_account, obra_account, payable_account, withholding_account, is_deductible, ai_hint) values
  ('nomina', 'Nómina (obra o labor)', 10, '51050601', '61201002', '230505', '236525', true, 'Pagos de nómina, quincenas, primas, cesantías, liquidaciones y aportes de empleados por obra o labor'),
  ('sueldo_accionistas', 'Sueldo accionistas', 20, '51050602', null, '230505', '236525', true, 'Sueldo de Andrea Vergara, Catalina Castaño o Edwart Mauricio Jaramillo'),
  ('contratistas', 'Contratistas y logística', 30, '51109501', '61201002', '230505', '236525', true, 'Pagos a personas por trabajos, logística, cortes de obra, vigilancia, cuentas de cobro'),
  ('materiales', 'Materiales y ferretería', 40, '514510', '61201001', '210505', '236540', true, 'Ferretería, materiales de construcción, pintura, herramientas'),
  ('honorarios', 'Honorarios', 50, '511095', '61201007', '230505', '236515', true, 'Contador, abogado, mediciones, levantamientos, planos, diseños'),
  ('comisiones', 'Comisiones a terceros', 60, '529505', null, '230505', '236525', true, 'Comisiones por negocios o ventas'),
  ('arriendo', 'Arriendo', 70, '512010', '61201095', '230505', '236530', true, 'Arriendo de oficina o inmuebles'),
  ('energia_agua', 'Energía y agua', 80, '513530', null, '230505', '236525', true, 'EPM, energía, acueducto, gas'),
  ('internet_telefonia', 'Internet y telefonía', 90, '513535', null, '230505', '236525', true, 'Claro, Tigo, Movistar, planes de celular e internet'),
  ('combustible_peajes', 'Combustible y peajes', 100, '519535', '61201003', '230505', '236540', true, 'Gasolina, ACPM, peajes, parqueaderos'),
  ('transporte_fletes', 'Transporte y fletes', 110, '513550', '61201003', '230505', '236525', true, 'Fletes, acarreos, taxis, mensajería, domicilios'),
  ('alimentacion', 'Alimentación y cafetería', 120, '519525', '61201095', '230505', '236540', true, 'Almuerzos, cafetería, mercado, aseo'),
  ('papeleria', 'Papelería, impresiones y planos', 130, '519530', '61201095', '210505', '236540', true, 'Papelería, impresiones, fotocopias, escaneos, planos'),
  ('notariales', 'Notariales y registro', 140, '615595', '615595', '230505', '236525', true, 'Notaría, registro, escrituras, catastro, curaduría; factura a nombre del cliente'),
  ('tramites_impuestos', 'Trámites, licencias e impuestos', 150, '514015', '61201095', '230505', '236525', true, 'Trámites, licencias, impuestos, SOAT, tecnomecánica'),
  ('publicidad', 'Publicidad', 160, '523560', null, '230505', '236525', true, 'Publicidad, pauta, vallas, material publicitario'),
  ('bancarios', 'Gastos bancarios', 170, '530505', null, '230505', '236525', true, 'Cuotas de manejo, comisiones bancarias, 4x1000'),
  ('viajes', 'Viajes (pasajes y hospedaje)', 180, '515515', '61201095', '230505', '236525', true, 'Pasajes, tiquetes, hoteles, viáticos'),
  ('seguros', 'Seguros y pólizas', 185, '513040', null, '230505', '236525', true, 'Pólizas y seguros'),
  ('equipos', 'Equipos y tecnología', 188, '152805', '61201001', '210505', '236540', true, 'Computadores, celulares, periféricos, muebles'),
  ('tarjetas_divisas', 'Tarjetas de crédito y divisas', 190, '51959501', null, '230505', '236525', true, 'Pagos de tarjetas de crédito y compra de dólares'),
  ('creditos', 'Cuotas de créditos y financiaciones', 195, '51959502', null, '230505', '236525', true, 'Cuotas de vehículos, créditos de libre inversión, Tuya, GM Financial'),
  ('traslado_caja_menor', 'Traslado a caja menor', 197, '110510', '110510', '230505', '236525', true, 'Dinero enviado para abrir o recargar una caja menor'),
  ('personal_no_deducible', 'Gasto personal (no deducible)', 200, '531595', null, '230505', '236525', false, 'Gastos personales de socios o accionistas'),
  ('otros', 'Otros', 999, '519595', '61201095', '230505', '236525', true, 'Lo que no encaja en otra categoría')
on conflict (slug) do nothing;

alter table public.purchases add column if not exists category_id uuid references public.expense_categories(id);
alter table public.petty_cash_entries add column if not exists category_id uuid references public.expense_categories(id);
create index if not exists idx_purchases_category on public.purchases(category_id);
create index if not exists idx_petty_cash_entries_category on public.petty_cash_entries(category_id);

-- Retención que nos aplican los clientes en ventas (dato de la factura)
alter table public.sales add column if not exists withholding_tax numeric(14,2) not null default 0;
alter table public.sales add column if not exists applies_iva boolean not null default false;

-- ---------- 3. Estados del comprobante ----------
alter table public.journal_entries drop constraint if exists journal_entries_status_check;
update public.journal_entries set status = 'pendiente' where status = 'borrador';
update public.journal_entries set status = 'aprobado' where status = 'contabilizado';
alter table public.journal_entries add constraint journal_entries_status_check check (status in ('pendiente', 'aprobado', 'anulado'));
alter table public.journal_entries alter column status set default 'pendiente';
alter table public.journal_entries add column if not exists duplicate_of uuid references public.journal_entries(id);
create index if not exists idx_journal_entries_status on public.journal_entries(status);
create index if not exists idx_journal_entries_date on public.journal_entries(entry_date);

create or replace function public.trg_validate_journal_entry()
returns trigger language plpgsql set search_path = public as $$
declare
  v_d numeric(14,2);
  v_c numeric(14,2);
  v_n int;
begin
  if tg_op = 'DELETE' then
    raise exception 'No se permite eliminar comprobantes (%). Use anulación.', old.entry_number;
  end if;

  if tg_op = 'UPDATE' and old.status = 'aprobado' then
    if new.status <> 'anulado' then
      raise exception 'El comprobante % ya fue aprobado y está bloqueado.', old.entry_number;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'anulado' and new.status <> 'anulado' then
    raise exception 'El comprobante % está anulado.', old.entry_number;
  end if;

  if new.status = 'aprobado' and (tg_op = 'INSERT' or old.status <> 'aprobado') then
    select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
      into v_n, v_d, v_c
      from public.journal_lines where entry_id = new.id;
    if v_n < 2 or v_d <= 0 or abs(v_d - v_c) > 0.01 then
      raise exception 'El comprobante % no cuadra (débitos % / créditos %).', new.entry_number, v_d, v_c;
    end if;
    new.posted_at := coalesce(new.posted_at, now());
  end if;

  new.updated_at := now();
  return new;
end $$;

create or replace function public.trg_protect_posted_journal_lines()
returns trigger language plpgsql set search_path = public as $$
declare v_status text;
begin
  select status into v_status from public.journal_entries
   where id = case when tg_op = 'DELETE' then old.entry_id else new.entry_id end;
  if v_status in ('aprobado', 'anulado') then
    raise exception 'No se pueden modificar líneas de un comprobante aprobado o anulado.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop policy if exists journal_lines_delete on public.journal_lines;
create policy journal_lines_delete on public.journal_lines for delete to authenticated
  using (public.has_role(variadic array['admin'::public.user_role, 'tesoreria'::public.user_role])
         and exists (select 1 from public.journal_entries je where je.id = journal_lines.entry_id and je.status = 'pendiente'));

-- ---------- 4. Numeración KCU ----------
create or replace function public.kc_next_entry_number(p_type text)
returns text language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.document_sequences (prefix, period_year, last_value, padding, updated_at)
  values ('KCU-' || p_type, 0, 1, 4, now())
  on conflict (prefix, period_year) do update set last_value = public.document_sequences.last_value + 1, updated_at = now()
  returning last_value into v;
  return p_type || '-KCU-' || lpad(v::text, 4, '0');
end $$;

-- ---------- 5. Generación de comprobantes ----------
create or replace function public.kc_category_account(p_category uuid, p_class int)
returns text language sql stable set search_path = public as $$
  select case when p_class = 6 then coalesce(c.obra_account, c.office_account) else c.office_account end
    from public.expense_categories c
   where c.id = coalesce(p_category, (select id from public.expense_categories where slug = 'otros'));
$$;

-- Crea o actualiza (si está pendiente) un comprobante con sus líneas.
create or replace function public.kc_upsert_entry(
  p_type text, p_source_table text, p_source_id uuid, p_date date, p_third_party uuid,
  p_cost_center uuid, p_concept text, p_support text, p_lines jsonb, p_user uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_status text;
  v_d numeric(14,2);
  v_c numeric(14,2);
  l jsonb;
  i int := 0;
begin
  select coalesce(sum((x->>'debit')::numeric), 0), coalesce(sum((x->>'credit')::numeric), 0)
    into v_d, v_c from jsonb_array_elements(p_lines) x;

  select id, status into v_id, v_status from public.journal_entries
   where source_table = p_source_table and source_id = p_source_id and entry_type = p_type;

  if v_id is not null and v_status <> 'pendiente' then
    return v_id; -- aprobado o anulado: no se toca
  end if;

  if v_id is null then
    insert into public.journal_entries (entry_number, entry_type, entry_date, status, source_table, source_id,
      third_party_id, cost_center_id, concept, total_debit, total_credit, support_url, created_by)
    values (public.kc_next_entry_number(p_type), p_type, p_date, 'pendiente', p_source_table, p_source_id,
      p_third_party, p_cost_center, p_concept, v_d, v_c, p_support, p_user)
    returning id into v_id;
  else
    update public.journal_entries set entry_date = p_date, third_party_id = p_third_party,
      cost_center_id = p_cost_center, concept = p_concept, total_debit = v_d, total_credit = v_c,
      support_url = coalesce(p_support, support_url)
     where id = v_id;
    delete from public.journal_lines where entry_id = v_id;
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    i := i + 1;
    insert into public.journal_lines (entry_id, line_order, account_code, third_party_id, cost_center_id, description, debit, credit, base_amount, is_deductible)
    values (v_id, i, l->>'account', p_third_party, p_cost_center, l->>'description',
      coalesce((l->>'debit')::numeric, 0), coalesce((l->>'credit')::numeric, 0),
      coalesce(nullif(l->>'base', '')::numeric, 0), coalesce((l->>'deductible')::boolean, true));
  end loop;
  return v_id;
end $$;

-- Tesorería: compra → CC (causación) + CE (egreso si está pagada)
create or replace function public.kc_post_purchase(p_purchase uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p record;
  cat record;
  v_class int;
  v_exp text;
  v_base numeric(14,2);
  v_pay_acct text;
  v_lines jsonb;
  v_cc uuid;
  v_ce_date date;
  v_tp uuid;
begin
  if not public.has_role(variadic array['admin'::public.user_role, 'tesoreria'::public.user_role]) and auth.uid() is not null then
    raise exception 'Sin permiso para generar comprobantes';
  end if;

  select * into p from public.purchases where id = p_purchase;
  if not found then return; end if;

  if p.status = 'anulado' then
    update public.journal_entries set status = 'anulado', voided_at = now(), void_reason = coalesce(p.void_reason, 'Operación anulada en Tesorería')
     where source_table = 'purchases' and source_id = p.id and status = 'pendiente';
    return;
  end if;

  select * into cat from public.expense_categories
   where id = coalesce(p.category_id, (select id from public.expense_categories where slug = 'otros'));
  select coalesce(accounting_class, 5) into v_class from public.cost_centers where id = p.cost_center_id;
  v_class := coalesce(v_class, 5);
  v_exp := case when v_class = 6 then coalesce(cat.obra_account, cat.office_account) else cat.office_account end;
  v_tp := coalesce(p.third_party_id, p.supplier_id);
  v_base := case when coalesce(p.amount, 0) > 0 then p.amount else p.total - coalesce(p.tax_iva, 0) + coalesce(p.withholding_tax, 0) end;

  v_lines := jsonb_build_array(jsonb_build_object('account', v_exp, 'description', p.concept, 'debit', v_base, 'credit', 0, 'deductible', cat.is_deductible));
  if coalesce(p.tax_iva, 0) > 0 then
    v_lines := v_lines || jsonb_build_object('account', '240810', 'description', 'IVA de la factura', 'debit', p.tax_iva, 'credit', 0, 'base', v_base);
  end if;
  if coalesce(p.withholding_tax, 0) > 0 then
    v_lines := v_lines || jsonb_build_object('account', cat.withholding_account, 'description', 'Retención en la fuente de la factura', 'debit', 0, 'credit', p.withholding_tax, 'base', v_base);
  end if;
  v_lines := v_lines || jsonb_build_object('account', cat.payable_account, 'description', 'Por pagar a ' || coalesce(p.supplier_name, 'tercero'), 'debit', 0, 'credit', p.total);

  v_cc := public.kc_upsert_entry('CC', 'purchases', p.id, p.transaction_date, v_tp, p.cost_center_id,
    p.concept, coalesce(p.support_storage_path, p.legacy_drive_url), v_lines, coalesce(auth.uid(), p.created_by));

  if p.status = 'pagado' then
    v_pay_acct := case when p.payment_method = 'efectivo' then '110505' else '111005' end;
    v_ce_date := case when p.due_date is not null and p.paid_at is not null then p.paid_at::date else p.transaction_date end;
    perform public.kc_upsert_entry('CE', 'purchases', p.id, v_ce_date, v_tp, p.cost_center_id,
      'Pago: ' || coalesce(p.concept, ''), coalesce(p.support_storage_path, p.legacy_drive_url),
      jsonb_build_array(
        jsonb_build_object('account', cat.payable_account, 'description', 'Cancelación ' || coalesce(p.purchase_number, ''), 'debit', p.total, 'credit', 0),
        jsonb_build_object('account', v_pay_acct, 'description', 'Pago por ' || coalesce(p.payment_method::text, 'transferencia'), 'debit', 0, 'credit', p.total)
      ), coalesce(auth.uid(), p.created_by));
  end if;
end $$;

-- Caja menor: egreso → CC + CE (sale de 110510); ingreso → CE (D 110510 / C 111005)
create or replace function public.kc_post_petty_cash(p_entry uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  e record;
  b record;
  cat record;
  v_class int;
  v_exp text;
  v_base numeric(14,2);
begin
  if auth.uid() is not null and not public.has_role(variadic array['admin'::public.user_role, 'tesoreria'::public.user_role, 'asesor'::public.user_role]) then
    raise exception 'Sin permiso para generar comprobantes';
  end if;

  select * into e from public.petty_cash_entries where id = p_entry;
  if not found then return; end if;
  select * into b from public.petty_cash_boxes where id = e.box_id;

  if e.status::text in ('anulado', 'anulada') then
    update public.journal_entries set status = 'anulado', voided_at = now(), void_reason = coalesce(e.void_reason, 'Anulado en caja menor')
     where source_table = 'petty_cash_entries' and source_id = e.id and status = 'pendiente';
    return;
  end if;

  if e.entry_type = 'ingreso' then
    perform public.kc_upsert_entry('CE', 'petty_cash_entries', e.id, e.entry_date, e.third_party_id, b.cost_center_id,
      coalesce(e.concept, 'Recarga caja menor ' || coalesce(b.name, '')), coalesce(e.support_storage_path, e.legacy_drive_url, e.receipt_url),
      jsonb_build_array(
        jsonb_build_object('account', '110510', 'description', 'Recarga caja menor', 'debit', e.total_amount, 'credit', 0),
        jsonb_build_object('account', '111005', 'description', 'Traslado desde bancos', 'debit', 0, 'credit', e.total_amount)
      ), coalesce(auth.uid(), e.created_by));
    return;
  end if;

  select * into cat from public.expense_categories
   where id = coalesce(e.category_id, (select id from public.expense_categories where slug = 'otros'));
  select coalesce(accounting_class, 5) into v_class from public.cost_centers where id = b.cost_center_id;
  v_class := coalesce(v_class, 5);
  v_exp := case when v_class = 6 then coalesce(cat.obra_account, cat.office_account) else cat.office_account end;
  v_base := e.total_amount - coalesce(e.tax_amount, 0);

  perform public.kc_upsert_entry('CC', 'petty_cash_entries', e.id, e.entry_date, e.third_party_id, b.cost_center_id,
    e.concept, coalesce(e.support_storage_path, e.legacy_drive_url, e.receipt_url),
    (jsonb_build_array(jsonb_build_object('account', v_exp, 'description', e.concept, 'debit', v_base, 'credit', 0, 'deductible', cat.is_deductible))
      || case when coalesce(e.tax_amount, 0) > 0 then jsonb_build_array(jsonb_build_object('account', '240810', 'description', 'IVA de la factura', 'debit', e.tax_amount, 'credit', 0, 'base', v_base)) else '[]'::jsonb end
      || jsonb_build_array(jsonb_build_object('account', cat.payable_account, 'description', 'Por pagar a ' || coalesce(e.supplier_name, 'tercero'), 'debit', 0, 'credit', e.total_amount))),
    coalesce(auth.uid(), e.created_by));

  perform public.kc_upsert_entry('CE', 'petty_cash_entries', e.id, e.entry_date, e.third_party_id, b.cost_center_id,
    'Pago caja menor: ' || coalesce(e.concept, ''), coalesce(e.support_storage_path, e.legacy_drive_url, e.receipt_url),
    jsonb_build_array(
      jsonb_build_object('account', cat.payable_account, 'description', 'Cancelación', 'debit', e.total_amount, 'credit', 0),
      jsonb_build_object('account', '110510', 'description', 'Pago desde caja menor ' || coalesce(b.name, ''), 'debit', 0, 'credit', e.total_amount)
    ), coalesce(auth.uid(), e.created_by));
end $$;

-- Ventas pagadas → RC: D bancos (neto) + D retención a favor ; C 413505 ; C 240805 IVA generado
create or replace function public.kc_post_sale(p_sale uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s record; v_base numeric(14,2);
begin
  select * into s from public.sales where id = p_sale;
  if not found then return; end if;
  if s.status::text = 'anulada' then
    update public.journal_entries set status = 'anulado', voided_at = now(), void_reason = coalesce(s.void_reason, 'Venta anulada')
     where source_table = 'sales' and source_id = s.id and status = 'pendiente';
    return;
  end if;
  if s.status::text <> 'pagada' then return; end if;
  v_base := coalesce(s.subtotal, 0) - coalesce(s.discount, 0);
  perform public.kc_upsert_entry('RC', 'sales', s.id, coalesce(s.paid_at::date, s.created_at::date), s.third_party_id, null,
    'Venta ' || s.sale_number, coalesce(s.support_storage_path, s.receipt_url),
    jsonb_build_array(jsonb_build_object('account', '111005', 'description', 'Recaudo', 'debit', s.total - coalesce(s.withholding_tax, 0), 'credit', 0))
    || case when coalesce(s.withholding_tax, 0) > 0 then jsonb_build_array(jsonb_build_object('account', '135515', 'description', 'Retención que nos aplicó el cliente', 'debit', s.withholding_tax, 'credit', 0, 'base', v_base)) else '[]'::jsonb end
    || jsonb_build_array(jsonb_build_object('account', '413505', 'description', 'Venta', 'debit', 0, 'credit', v_base))
    || case when coalesce(s.tax, 0) > 0 then jsonb_build_array(jsonb_build_object('account', '240805', 'description', 'IVA generado', 'debit', 0, 'credit', s.tax, 'base', v_base)) else '[]'::jsonb end,
    coalesce(auth.uid(), s.closed_by));
end $$;

-- Aprobación del contador (bloquea)
create or replace function public.kc_approve_entries(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(variadic array['admin'::public.user_role]) then
    raise exception 'Solo el contador (admin) puede aprobar comprobantes';
  end if;
  update public.journal_entries set status = 'aprobado', posted_by = auth.uid(), posted_at = now()
   where id = any(p_ids) and status = 'pendiente';
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.kc_post_purchase(uuid) to authenticated;
grant execute on function public.kc_post_petty_cash(uuid) to authenticated;
grant execute on function public.kc_post_sale(uuid) to authenticated;
grant execute on function public.kc_approve_entries(uuid[]) to authenticated;
revoke execute on function public.kc_upsert_entry(text, text, uuid, date, uuid, uuid, text, text, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.kc_next_entry_number(text) from public, anon, authenticated;
