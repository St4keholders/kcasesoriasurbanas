-- =====================================================================
-- KC Asesorías Urbanas S.A.S — Fase 2: Saneamiento de Seguridad, RLS,
-- Vistas, Consecutivos Atómicos, Auditoría y Anulación sin DELETE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ÍNDICES DE CLAVES FORÁNEAS FALTANTES (Advisors Performance)
-- ---------------------------------------------------------------------
create index if not exists idx_appointments_created_by on public.appointments(created_by);
create index if not exists idx_appointments_service_type on public.appointments(service_type_id);
create index if not exists idx_leads_created_by on public.leads(created_by);
create index if not exists idx_petty_cash_boxes_cost_center on public.petty_cash_boxes(cost_center_id);
create index if not exists idx_purchases_created_by on public.purchases(created_by);
create index if not exists idx_sale_items_service_type on public.sale_items(service_type_id);
create index if not exists idx_sales_appointment on public.sales(appointment_id);

-- ---------------------------------------------------------------------
-- 2. FUNCIÓN public.has_role(variadic public.user_role[]) Y SEGURIDAD EN FUNCIONES
-- ---------------------------------------------------------------------
create or replace function public.has_role(variadic allowed_roles public.user_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.has_role(variadic public.user_role[]) from public, anon;
grant execute on function public.has_role(variadic public.user_role[]) to authenticated, service_role;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid()) and is_active = true;
$$;

revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role('admin'::public.user_role);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Fijar search_path = public en funciones existentes y revocar ejecución innecesaria
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.calc_purchase_total()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total := coalesce(new.amount, 0)
             + coalesce(new.tax_iva, 0)
             - coalesce(new.withholding_tax, 0);
  return new;
end;
$$;

create or replace function public.kpi_for_date(target_date date)
returns table (
  date date, appointments_scheduled int, appointments_attended int,
  attendance_rate numeric, sales_count int, sales_total numeric,
  conversion_rate numeric, average_ticket numeric,
  purchases_total numeric, net_cashflow numeric
)
language sql
stable
set search_path = public
as $$
  with sched as (
    select count(*)::int as n from public.appointments
     where scheduled_at::date = target_date
  ),
  attended as (
    select count(*)::int as n from public.appointments
     where scheduled_at::date = target_date and status = 'atendida'
  ),
  sales_d as (
    select count(*)::int as n, coalesce(sum(total),0)::numeric as t
      from public.sales
     where paid_at::date = target_date and status = 'pagada'
  ),
  purch_d as (
    select coalesce(sum(total),0)::numeric as t
      from public.purchases
     where transaction_date = target_date and status != 'anulado'
  )
  select target_date, sched.n, attended.n,
    case when sched.n = 0 then 0 else round(attended.n::numeric*100/sched.n,2) end,
    sales_d.n, sales_d.t,
    case when attended.n = 0 then 0 else round(sales_d.n::numeric*100/attended.n,2) end,
    case when sales_d.n = 0 then 0 else round(sales_d.t/sales_d.n,2) end,
    purch_d.t,
    (sales_d.t - purch_d.t)
  from sched, attended, sales_d, purch_d;
$$;

do $$ begin
  revoke all on function public.handle_new_user() from public, anon, authenticated;
exception when undefined_function then null; end $$;

do $$ begin
  revoke all on function public.create_test_user(text, text, text, public.user_role) from public, anon, authenticated;
exception when undefined_function then null; end $$;

-- ---------------------------------------------------------------------
-- 3. CAMPOS DE ANULACIÓN Y PROHIBICIÓN DE DELETE EN TABLAS FINANCIERAS
-- ---------------------------------------------------------------------
alter type public.petty_cash_status add value if not exists 'anulada';

alter table public.purchases
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id),
  add column if not exists void_reason text;

alter table public.sales
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id),
  add column if not exists void_reason text;

alter table public.petty_cash_boxes
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id),
  add column if not exists void_reason text;

alter table public.petty_cash_entries
  add column if not exists status text not null default 'activo' check (status in ('activo', 'anulado')),
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id),
  add column if not exists void_reason text;

create index if not exists idx_purchases_voided_by on public.purchases(voided_by);
create index if not exists idx_sales_voided_by on public.sales(voided_by);
create index if not exists idx_petty_cash_boxes_voided_by on public.petty_cash_boxes(voided_by);
create index if not exists idx_petty_cash_entries_voided_by on public.petty_cash_entries(voided_by);

create or replace function public.prevent_financial_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'No se permite eliminar registros en %. Utilice la anulación (status = anulado) indicando motivo, usuario y fecha.', tg_table_name;
end;
$$;

drop trigger if exists trg_prevent_delete_purchases on public.purchases;
create trigger trg_prevent_delete_purchases
  before delete on public.purchases
  for each row execute function public.prevent_financial_delete();

drop trigger if exists trg_prevent_delete_sales on public.sales;
create trigger trg_prevent_delete_sales
  before delete on public.sales
  for each row execute function public.prevent_financial_delete();

drop trigger if exists trg_prevent_delete_sale_items on public.sale_items;
create trigger trg_prevent_delete_sale_items
  before delete on public.sale_items
  for each row execute function public.prevent_financial_delete();

drop trigger if exists trg_prevent_delete_petty_cash_boxes on public.petty_cash_boxes;
create trigger trg_prevent_delete_petty_cash_boxes
  before delete on public.petty_cash_boxes
  for each row execute function public.prevent_financial_delete();

drop trigger if exists trg_prevent_delete_petty_cash_entries on public.petty_cash_entries;
create trigger trg_prevent_delete_petty_cash_entries
  before delete on public.petty_cash_entries
  for each row execute function public.prevent_financial_delete();

-- ---------------------------------------------------------------------
-- 4. CONSECUTIVOS SIN CHOQUES: document_sequences + next_document_number()
-- ---------------------------------------------------------------------
create table if not exists public.document_sequences (
  prefix      text not null,
  period_year int not null,
  last_value  int not null default 0,
  padding     int not null default 4,
  updated_at  timestamptz not null default now(),
  primary key (prefix, period_year)
);

alter table public.document_sequences enable row level security;

-- Inicializar secuencias actuales de compras (C), ventas (V) y comprobantes (CC, CE, RC, NC)
insert into public.document_sequences (prefix, period_year, last_value, padding)
values
  (
    'C',
    2026,
    coalesce((
      select max(nullif(regexp_replace(split_part(purchase_number, '-', 3), '[^0-9]', '', 'g'), '')::int)
      from public.purchases
      where purchase_number like 'C-2026-%'
    ), (select count(*)::int from public.purchases), 0),
    4
  ),
  (
    'V',
    2026,
    coalesce((
      select max(nullif(regexp_replace(split_part(sale_number, '-', 3), '[^0-9]', '', 'g'), '')::int)
      from public.sales
      where sale_number like 'V-2026-%'
    ), (select count(*)::int from public.sales), 0),
    4
  ),
  ('CC', 2026, 0, 6),
  ('CE', 2026, 0, 6),
  ('RC', 2026, 0, 6),
  ('NC', 2026, 0, 6)
on conflict (prefix, period_year) do update
  set last_value = greatest(public.document_sequences.last_value, excluded.last_value);

create or replace function public.next_document_number(
  p_prefix text,
  p_year int default extract(year from current_date)::int,
  p_padding int default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_val int;
  v_pad int;
  v_default_pad int;
begin
  v_default_pad := coalesce(p_padding, case when p_prefix in ('CC', 'CE', 'RC', 'NC') then 6 else 4 end);

  insert into public.document_sequences (prefix, period_year, last_value, padding, updated_at)
  values (upper(trim(p_prefix)), p_year, 1, v_default_pad, now())
  on conflict (prefix, period_year)
  do update set
    last_value = public.document_sequences.last_value + 1,
    updated_at = now()
  returning last_value, padding into v_val, v_pad;

  return upper(trim(p_prefix)) || '-' || p_year::text || '-' || lpad(v_val::text, v_pad, '0');
end;
$$;

revoke all on function public.next_document_number(text, int, int) from public, anon;
grant execute on function public.next_document_number(text, int, int) to authenticated, service_role;

create or replace function public.generate_sale_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_year int;
begin
  if new.sale_number is null or trim(new.sale_number) = '' then
    v_year := extract(year from coalesce(new.paid_at, new.created_at, now()))::int;
    new.sale_number := public.next_document_number('V', v_year, 4);
  end if;
  return new;
end;
$$;

create or replace function public.generate_purchase_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_year int;
begin
  if new.purchase_number is null or trim(new.purchase_number) = '' then
    v_year := extract(year from coalesce(new.transaction_date::timestamptz, new.created_at, now()))::int;
    new.purchase_number := public.next_document_number('C', v_year, 4);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. VISTAS CON security_invoker = true, BALANCE DE CAJA MENOR Y REVOKE ANON
-- ---------------------------------------------------------------------
drop view if exists public.petty_cash_box_summary;
create view public.petty_cash_box_summary
with (security_invoker = true)
as
select
  b.id,
  b.box_number,
  b.name,
  b.opened_by,
  p.full_name as opened_by_name,
  b.opened_at,
  b.status,
  b.closed_at,
  b.reimbursed_at,
  b.cost_center_id,
  cc.name as cost_center_name,
  count(e.id) filter (
    where (e.entry_type = 'egreso' or e.entry_type is null)
      and coalesce(e.status, 'activo') <> 'anulado'
  )::int as total_entries,
  coalesce(sum(
    case
      when (e.entry_type = 'egreso' or e.entry_type is null)
        and coalesce(e.status, 'activo') <> 'anulado'
      then e.total_amount
      else 0::numeric
    end
  ), 0::numeric) as total_spent,
  coalesce(sum(
    case
      when e.entry_type = 'ingreso'
        and coalesce(e.status, 'activo') <> 'anulado'
      then e.total_amount
      else 0::numeric
    end
  ), 0::numeric) as total_income,
  coalesce(sum(
    case
      when e.entry_type = 'ingreso' and coalesce(e.status, 'activo') <> 'anulado'
        then e.total_amount
      when (e.entry_type = 'egreso' or e.entry_type is null) and coalesce(e.status, 'activo') <> 'anulado'
        then -e.total_amount
      else 0::numeric
    end
  ), 0::numeric) as balance,
  coalesce(sum(
    case
      when (e.entry_type = 'egreso' or e.entry_type is null)
        and coalesce(e.status, 'activo') <> 'anulado'
      then e.tax_amount
      else 0::numeric
    end
  ), 0::numeric) as total_tax,
  max(e.entry_date) filter (where coalesce(e.status, 'activo') <> 'anulado') as last_entry_date
from public.petty_cash_boxes b
left join public.profiles p on p.id = b.opened_by
left join public.cost_centers cc on cc.id = b.cost_center_id
left join public.petty_cash_entries e on e.box_id = b.id
group by b.id, p.full_name, cc.name;

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

create or replace view public.kpi_daily
with (security_invoker = true)
as
with target as (select current_date as d),
sched as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = target.d
),
attended as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = target.d and status = 'atendida'::public.appointment_status
),
sales_today as (
  select count(*)::int as n, coalesce(sum(total),0)::numeric as t
    from public.sales, target
   where paid_at::date = target.d and status = 'pagada'::public.sale_status
),
purchases_today as (
  select coalesce(sum(total),0)::numeric as t
    from public.purchases, target
   where transaction_date = target.d and status <> 'anulado'::public.purchase_status
)
select
  (select d from target) as date,
  sched.n as appointments_scheduled,
  attended.n as appointments_attended,
  case when sched.n = 0 then 0::numeric
       else round(attended.n::numeric * 100 / sched.n, 2) end as attendance_rate,
  sales_today.n as sales_count,
  sales_today.t as sales_total,
  case when attended.n = 0 then 0::numeric
       else round(sales_today.n::numeric * 100 / attended.n, 2) end as conversion_rate,
  case when sales_today.n = 0 then 0::numeric
       else round(sales_today.t / sales_today.n, 2) end as average_ticket,
  purchases_today.t as purchases_total,
  (sales_today.t - purchases_today.t) as net_cashflow
from sched, attended, sales_today, purchases_today;

revoke all on public.petty_cash_box_summary from public, anon;
revoke all on public.petty_cash_entries_full from public, anon;
revoke all on public.kpi_daily from public, anon;

grant select on public.petty_cash_box_summary to authenticated, service_role;
grant select on public.petty_cash_entries_full to authenticated, service_role;
grant select on public.kpi_daily to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. TRIGGERS DE AUDITORÍA HACIA audit_log EN TABLAS FINANCIERAS
-- ---------------------------------------------------------------------
create or replace function public.fn_audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_record_id uuid;
begin
  select id into v_user_id from public.profiles where id = (select auth.uid());

  if tg_op = 'DELETE' then
    v_record_id := old.id;
    insert into public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    values (v_user_id, tg_op, tg_table_name, v_record_id, to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    v_record_id := new.id;
    insert into public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    values (v_user_id, case when to_jsonb(new)->>'status' in ('anulado', 'anulada') and to_jsonb(old)->>'status' not in ('anulado', 'anulada') then 'VOID' else tg_op end, tg_table_name, v_record_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'INSERT' then
    v_record_id := new.id;
    insert into public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    values (v_user_id, tg_op, tg_table_name, v_record_id, null, to_jsonb(new));
    return new;
  end if;
  return null;
end;
$$;

revoke all on function public.fn_audit_log_trigger() from public, anon;

drop trigger if exists trg_audit_purchases on public.purchases;
create trigger trg_audit_purchases
  after insert or update or delete on public.purchases
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_sales on public.sales;
create trigger trg_audit_sales
  after insert or update or delete on public.sales
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_sale_items on public.sale_items;
create trigger trg_audit_sale_items
  after insert or update or delete on public.sale_items
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_petty_cash_boxes on public.petty_cash_boxes;
create trigger trg_audit_petty_cash_boxes
  after insert or update or delete on public.petty_cash_boxes
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_petty_cash_entries on public.petty_cash_entries;
create trigger trg_audit_petty_cash_entries
  after insert or update or delete on public.petty_cash_entries
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_suppliers on public.suppliers;
create trigger trg_audit_suppliers
  after insert or update or delete on public.suppliers
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_cost_centers on public.cost_centers;
create trigger trg_audit_cost_centers
  after insert or update or delete on public.cost_centers
  for each row execute function public.fn_audit_log_trigger();

-- ---------------------------------------------------------------------
-- 7. REESCRITURA DE POLÍTICAS RLS USANDO public.has_role(...)
-- ---------------------------------------------------------------------

-- PROFILES
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin', 'tesoreria', 'asesor'));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.has_role('admin') or id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.has_role('admin') or id = (select auth.uid()))
  with check (public.has_role('admin') or id = (select auth.uid()));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.has_role('admin'));

-- SERVICE_TYPES
drop policy if exists service_types_read on public.service_types;
drop policy if exists service_types_write on public.service_types;
drop policy if exists service_types_insert on public.service_types;
drop policy if exists service_types_update on public.service_types;
drop policy if exists service_types_delete on public.service_types;

create policy service_types_read on public.service_types
  for select
  using (is_active = true or public.has_role('admin', 'tesoreria', 'asesor'));

create policy service_types_insert on public.service_types
  for insert to authenticated
  with check (public.has_role('admin'));

create policy service_types_update on public.service_types
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy service_types_delete on public.service_types
  for delete to authenticated
  using (public.has_role('admin'));

-- COST_CENTERS
drop policy if exists cost_centers_read on public.cost_centers;
drop policy if exists cost_centers_write on public.cost_centers;
drop policy if exists cost_centers_insert on public.cost_centers;
drop policy if exists cost_centers_update on public.cost_centers;
drop policy if exists cost_centers_delete on public.cost_centers;

create policy cost_centers_read on public.cost_centers
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy cost_centers_insert on public.cost_centers
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria'));

create policy cost_centers_update on public.cost_centers
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

create policy cost_centers_delete on public.cost_centers
  for delete to authenticated
  using (public.has_role('admin'));

-- SUPPLIERS (Proveedores: crear -> admin, tesoreria, asesor)
drop policy if exists suppliers_read on public.suppliers;
drop policy if exists suppliers_write on public.suppliers;
drop policy if exists suppliers_insert on public.suppliers;
drop policy if exists suppliers_update on public.suppliers;
drop policy if exists suppliers_delete on public.suppliers;

create policy suppliers_read on public.suppliers
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy suppliers_insert on public.suppliers
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy suppliers_update on public.suppliers
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

create policy suppliers_delete on public.suppliers
  for delete to authenticated
  using (public.has_role('admin'));

-- LEADS
drop policy if exists leads_read on public.leads;
drop policy if exists leads_write on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete on public.leads;

create policy leads_read on public.leads
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy leads_insert on public.leads
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy leads_update on public.leads
  for update to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'))
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy leads_delete on public.leads
  for delete to authenticated
  using (public.has_role('admin'));

-- APPOINTMENTS
drop policy if exists appointments_read on public.appointments;
drop policy if exists appointments_write on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;

create policy appointments_read on public.appointments
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy appointments_update on public.appointments
  for update to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'))
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy appointments_delete on public.appointments
  for delete to authenticated
  using (public.has_role('admin'));

-- SALES (sin DELETE)
drop policy if exists sales_read on public.sales;
drop policy if exists sales_write on public.sales;
drop policy if exists sales_insert on public.sales;
drop policy if exists sales_update on public.sales;

create policy sales_read on public.sales
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy sales_insert on public.sales
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy sales_update on public.sales
  for update to authenticated
  using (
    public.has_role('admin', 'tesoreria')
    or (public.has_role('asesor') and closed_by = (select auth.uid()))
  )
  with check (
    public.has_role('admin', 'tesoreria')
    or (public.has_role('asesor') and closed_by = (select auth.uid()))
  );

-- SALE_ITEMS (sin DELETE)
drop policy if exists sale_items_read on public.sale_items;
drop policy if exists sale_items_write on public.sale_items;
drop policy if exists sale_items_insert on public.sale_items;
drop policy if exists sale_items_update on public.sale_items;

create policy sale_items_read on public.sale_items
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy sale_items_insert on public.sale_items
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

create policy sale_items_update on public.sale_items
  for update to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'))
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

-- PURCHASES (Compras / Tesorería -> admin: sí, tesoreria: sí, asesor: no; sin DELETE)
drop policy if exists purchases_read on public.purchases;
drop policy if exists purchases_write on public.purchases;
drop policy if exists purchases_insert on public.purchases;
drop policy if exists purchases_update on public.purchases;

create policy purchases_read on public.purchases
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

create policy purchases_insert on public.purchases
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria'));

create policy purchases_update on public.purchases
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

-- PETTY_CASH_BOXES (ver: todos; crear/editar: admin, tesoreria, asesor solo las que abrió; sin DELETE)
drop policy if exists petty_cash_boxes_read on public.petty_cash_boxes;
drop policy if exists petty_cash_boxes_insert on public.petty_cash_boxes;
drop policy if exists petty_cash_boxes_update on public.petty_cash_boxes;
drop policy if exists petty_cash_boxes_delete on public.petty_cash_boxes;

create policy petty_cash_boxes_read on public.petty_cash_boxes
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy petty_cash_boxes_insert on public.petty_cash_boxes
  for insert to authenticated
  with check (
    public.has_role('admin', 'tesoreria')
    or (public.has_role('asesor') and opened_by = (select auth.uid()))
  );

create policy petty_cash_boxes_update on public.petty_cash_boxes
  for update to authenticated
  using (
    public.has_role('admin', 'tesoreria')
    or (public.has_role('asesor') and opened_by = (select auth.uid()))
  )
  with check (
    public.has_role('admin', 'tesoreria')
    or (public.has_role('asesor') and opened_by = (select auth.uid()))
  );

-- PETTY_CASH_ENTRIES (ver: todos; crear/editar: admin, tesoreria, asesor solo en las cajas que abrió; sin DELETE)
drop policy if exists petty_cash_entries_read on public.petty_cash_entries;
drop policy if exists petty_cash_entries_insert on public.petty_cash_entries;
drop policy if exists petty_cash_entries_update on public.petty_cash_entries;
drop policy if exists petty_cash_entries_delete on public.petty_cash_entries;

create policy petty_cash_entries_read on public.petty_cash_entries
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

create policy petty_cash_entries_insert on public.petty_cash_entries
  for insert to authenticated
  with check (
    public.has_role('admin', 'tesoreria')
    or (
      public.has_role('asesor')
      and exists (
        select 1 from public.petty_cash_boxes b
        where b.id = box_id and b.opened_by = (select auth.uid())
      )
    )
  );

create policy petty_cash_entries_update on public.petty_cash_entries
  for update to authenticated
  using (
    public.has_role('admin', 'tesoreria')
    or (
      public.has_role('asesor')
      and exists (
        select 1 from public.petty_cash_boxes b
        where b.id = box_id and b.opened_by = (select auth.uid())
      )
    )
  )
  with check (
    public.has_role('admin', 'tesoreria')
    or (
      public.has_role('asesor')
      and exists (
        select 1 from public.petty_cash_boxes b
        where b.id = box_id and b.opened_by = (select auth.uid())
      )
    )
  );

-- AUDIT_LOG
drop policy if exists audit_log_read on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;

create policy audit_log_read on public.audit_log
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

-- DOCUMENT_SEQUENCES
drop policy if exists document_sequences_read on public.document_sequences;
create policy document_sequences_read on public.document_sequences
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

-- ---------------------------------------------------------------------
-- 8. STORAGE BUCKETS Y POLÍTICAS (incluyendo bucket privado `soportes` y acceso a tesorería)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'soportes',
  'soportes',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/xml', 'text/xml', 'application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists petty_cash_receipts_read on storage.objects;
drop policy if exists petty_cash_receipts_insert on storage.objects;
drop policy if exists petty_cash_receipts_update on storage.objects;
drop policy if exists invoices_read on storage.objects;
drop policy if exists invoices_insert on storage.objects;
drop policy if exists invoices_update on storage.objects;
drop policy if exists receipts_read on storage.objects;
drop policy if exists receipts_insert on storage.objects;
drop policy if exists receipts_update on storage.objects;
drop policy if exists soportes_read on storage.objects;
drop policy if exists soportes_insert on storage.objects;
drop policy if exists soportes_update on storage.objects;

-- Bucket `soportes` y `petty-cash-receipts`: lectura e inserción para admin, tesoreria y asesor
create policy petty_cash_receipts_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'petty-cash-receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy petty_cash_receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'petty-cash-receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy petty_cash_receipts_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'petty-cash-receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  )
  with check (
    bucket_id = 'petty-cash-receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy soportes_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'soportes'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy soportes_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'soportes'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy soportes_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'soportes'
    and public.has_role('admin', 'tesoreria', 'asesor')
  )
  with check (
    bucket_id = 'soportes'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

-- Buckets `invoices` y `receipts`: admin y tesoreria
create policy invoices_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'invoices'
    and public.has_role('admin', 'tesoreria')
  );

create policy invoices_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'invoices'
    and public.has_role('admin', 'tesoreria')
  );

create policy invoices_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'invoices'
    and public.has_role('admin', 'tesoreria')
  )
  with check (
    bucket_id = 'invoices'
    and public.has_role('admin', 'tesoreria')
  );

create policy receipts_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );

create policy receipts_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  )
  with check (
    bucket_id = 'receipts'
    and public.has_role('admin', 'tesoreria', 'asesor')
  );
