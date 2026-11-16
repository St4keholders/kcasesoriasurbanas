-- =====================================================================
-- KC - Migración inicial Supabase
-- Módulos: Citas, Ventas, Compras (Tesorería), KPIs, Admin (RBAC)
-- =====================================================================
-- Ejecutar en: Supabase SQL Editor (o `supabase db push` si usas CLI)
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT donde corresponde
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'asesor', 'tesoreria');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum
    ('agendada','en_curso','reprogramada','cancelada','atendida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum
    ('cotizacion','pendiente_pago','pagada','anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_status as enum
    ('pendiente_pago','pagado','anulado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum
    ('efectivo','transferencia','tarjeta','nequi','daviplata','pse','otro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. PROFILES  (extiende auth.users con rol y datos)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  phone       text,
  role        public.user_role not null default 'asesor',
  is_active   boolean not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. CATÁLOGOS
-- ---------------------------------------------------------------------
create table if not exists public.service_types (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  base_price   numeric(12,2),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.cost_centers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  document_number text,                 -- NIT / Cédula
  email           text,
  phone           text,
  address         text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. LEADS / CLIENTES (compartidos entre Citas y Ventas)
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  document_number  text,
  email            text,
  phone            text not null,
  source           text,                 -- WhatsApp, Web, Referido…
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_leads_phone on public.leads(phone);
create index if not exists idx_leads_document on public.leads(document_number);

-- ---------------------------------------------------------------------
-- 5. MÓDULO 1 — CITAS
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references public.leads(id) on delete restrict,
  service_type_id      uuid references public.service_types(id),
  assigned_advisor_id  uuid references public.profiles(id),
  scheduled_at         timestamptz not null,
  duration_minutes     int not null default 60,
  status               public.appointment_status not null default 'agendada',
  notes                text,
  reminder_sent        boolean not null default false,
  attended_at          timestamptz,
  created_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);
create index if not exists idx_appointments_advisor     on public.appointments(assigned_advisor_id);
create index if not exists idx_appointments_status      on public.appointments(status);
create index if not exists idx_appointments_lead        on public.appointments(lead_id);

-- ---------------------------------------------------------------------
-- 6. MÓDULO 2 — VENTAS
-- ---------------------------------------------------------------------
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  sale_number     text unique,                          -- V-2026-0001 (auto)
  lead_id         uuid not null references public.leads(id),
  appointment_id  uuid references public.appointments(id),
  closed_by       uuid references public.profiles(id),  -- asesor que cerró
  status          public.sale_status not null default 'cotizacion',
  subtotal        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_method  public.payment_method,
  paid_at         timestamptz,
  notes           text,
  receipt_url     text,                                 -- ruta en Storage
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references public.sales(id) on delete cascade,
  service_type_id  uuid references public.service_types(id),
  description      text not null,
  quantity         numeric(10,2) not null default 1,
  unit_price       numeric(12,2) not null,
  subtotal         numeric(12,2) not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_sales_status     on public.sales(status);
create index if not exists idx_sales_closed_by  on public.sales(closed_by);
create index if not exists idx_sales_paid_at    on public.sales(paid_at);
create index if not exists idx_sales_lead       on public.sales(lead_id);
create index if not exists idx_sale_items_sale  on public.sale_items(sale_id);

-- ---------------------------------------------------------------------
-- 7. MÓDULO 3 — COMPRAS / TESORERÍA
-- ---------------------------------------------------------------------
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  purchase_number text unique,                          -- C-2026-0001 (auto)
  supplier_id     uuid references public.suppliers(id),
  supplier_name   text,                                 -- fallback si no hay proveedor en catálogo
  cost_center_id  uuid not null references public.cost_centers(id),
  invoice_number  text,                                 -- número de factura del proveedor
  description     text not null,
  amount          numeric(12,2) not null,
  tax             numeric(12,2) not null default 0,
  total           numeric(12,2) not null,
  status          public.purchase_status not null default 'pendiente_pago',
  payment_method  public.payment_method,
  invoice_date    date not null,
  due_date        date,
  paid_at         timestamptz,
  invoice_url     text,                                 -- PDF en Storage
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_purchases_status        on public.purchases(status);
create index if not exists idx_purchases_invoice_date  on public.purchases(invoice_date);
create index if not exists idx_purchases_cost_center   on public.purchases(cost_center_id);
create index if not exists idx_purchases_supplier      on public.purchases(supplier_id);

-- ---------------------------------------------------------------------
-- 8. AUDIT LOG
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,                            -- INSERT, UPDATE, DELETE
  table_name  text not null,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_table_record on public.audit_log(table_name, record_id);
create index if not exists idx_audit_user         on public.audit_log(user_id);

-- ---------------------------------------------------------------------
-- 9. FUNCIONES HELPER
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- 10. TRIGGERS
-- ---------------------------------------------------------------------

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_updated_at on public.sales;
create trigger trg_sales_updated_at before update on public.sales
  for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated_at on public.purchases;
create trigger trg_purchases_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

-- Numeración consecutiva
create or replace function public.generate_sale_number()
returns trigger language plpgsql as $$
begin
  if new.sale_number is null then
    new.sale_number := 'V-' || to_char(now(),'YYYY') || '-' ||
      lpad((
        select coalesce(count(*),0) + 1
        from public.sales
        where extract(year from created_at) = extract(year from now())
      )::text, 4, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_sales_number on public.sales;
create trigger trg_sales_number before insert on public.sales
  for each row execute function public.generate_sale_number();

create or replace function public.generate_purchase_number()
returns trigger language plpgsql as $$
begin
  if new.purchase_number is null then
    new.purchase_number := 'C-' || to_char(now(),'YYYY') || '-' ||
      lpad((
        select coalesce(count(*),0) + 1
        from public.purchases
        where extract(year from created_at) = extract(year from now())
      )::text, 4, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_purchases_number on public.purchases;
create trigger trg_purchases_number before insert on public.purchases
  for each row execute function public.generate_purchase_number();

-- Crear profile automáticamente al registrar usuario en auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'asesor')
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 11. VISTA DE KPIs (cálculo en vivo)
-- ---------------------------------------------------------------------
create or replace view public.kpi_daily as
with target as (select current_date as d),
sched as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = d
),
attended as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = d and status = 'atendida'
),
sales_today as (
  select count(*)::int as n, coalesce(sum(total),0)::numeric as t
    from public.sales, target
   where paid_at::date = d and status = 'pagada'
),
purchases_today as (
  select coalesce(sum(total),0)::numeric as t
    from public.purchases, target
   where paid_at::date = d and status = 'pagado'
)
select
  (select d from target)                              as date,
  sched.n                                             as appointments_scheduled,
  attended.n                                          as appointments_attended,
  case when sched.n = 0 then 0
       else round(attended.n::numeric * 100 / sched.n, 2) end as attendance_rate,
  sales_today.n                                       as sales_count,
  sales_today.t                                       as sales_total,
  case when attended.n = 0 then 0
       else round(sales_today.n::numeric * 100 / attended.n, 2) end as conversion_rate,
  case when sales_today.n = 0 then 0
       else round(sales_today.t / sales_today.n, 2) end as average_ticket,
  purchases_today.t                                   as purchases_total,
  (sales_today.t - purchases_today.t)                 as net_cashflow
from sched, attended, sales_today, purchases_today;

-- Función para KPIs por rango (útil para gráficas históricas)
create or replace function public.kpi_for_date(target_date date)
returns table (
  date date, appointments_scheduled int, appointments_attended int,
  attendance_rate numeric, sales_count int, sales_total numeric,
  conversion_rate numeric, average_ticket numeric,
  purchases_total numeric, net_cashflow numeric
)
language sql stable as $$
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
     where paid_at::date = target_date and status = 'pagado'
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

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY  (Panel de Administración / RBAC)
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.service_types enable row level security;
alter table public.cost_centers  enable row level security;
alter table public.suppliers     enable row level security;
alter table public.leads         enable row level security;
alter table public.appointments  enable row level security;
alter table public.sales         enable row level security;
alter table public.sale_items    enable row level security;
alter table public.purchases     enable row level security;
alter table public.audit_log     enable row level security;

-- PROFILES: cada usuario ve su perfil; admin ve y administra todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- SERVICE_TYPES: lectura para todos los autenticados, escritura solo admin
drop policy if exists service_types_read on public.service_types;
create policy service_types_read on public.service_types
  for select using (auth.uid() is not null);
drop policy if exists service_types_write on public.service_types;
create policy service_types_write on public.service_types
  for all using (public.is_admin()) with check (public.is_admin());

-- COST_CENTERS: solo tesorería y admin
drop policy if exists cost_centers_read on public.cost_centers;
create policy cost_centers_read on public.cost_centers
  for select using (public.current_user_role() in ('admin','tesoreria'));
drop policy if exists cost_centers_write on public.cost_centers;
create policy cost_centers_write on public.cost_centers
  for all using (public.is_admin()) with check (public.is_admin());

-- SUPPLIERS: solo tesorería y admin
drop policy if exists suppliers_read on public.suppliers;
create policy suppliers_read on public.suppliers
  for select using (public.current_user_role() in ('admin','tesoreria'));
drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers
  for all using (public.current_user_role() in ('admin','tesoreria'))
  with check (public.current_user_role() in ('admin','tesoreria'));

-- LEADS: asesores y admin
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads
  for select using (public.current_user_role() in ('admin','asesor'));
drop policy if exists leads_write on public.leads;
create policy leads_write on public.leads
  for all using (public.current_user_role() in ('admin','asesor'))
  with check (public.current_user_role() in ('admin','asesor'));

-- APPOINTMENTS: asesores y admin
drop policy if exists appointments_read on public.appointments;
create policy appointments_read on public.appointments
  for select using (public.current_user_role() in ('admin','asesor'));
drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments
  for all using (public.current_user_role() in ('admin','asesor'))
  with check (public.current_user_role() in ('admin','asesor'));

-- SALES: asesores y admin
drop policy if exists sales_read on public.sales;
create policy sales_read on public.sales
  for select using (public.current_user_role() in ('admin','asesor'));
drop policy if exists sales_write on public.sales;
create policy sales_write on public.sales
  for all using (public.current_user_role() in ('admin','asesor'))
  with check (public.current_user_role() in ('admin','asesor'));

drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items
  for select using (public.current_user_role() in ('admin','asesor'));
drop policy if exists sale_items_write on public.sale_items;
create policy sale_items_write on public.sale_items
  for all using (public.current_user_role() in ('admin','asesor'))
  with check (public.current_user_role() in ('admin','asesor'));

-- PURCHASES: solo tesorería y admin (aislamiento total)
drop policy if exists purchases_read on public.purchases;
create policy purchases_read on public.purchases
  for select using (public.current_user_role() in ('admin','tesoreria'));
drop policy if exists purchases_write on public.purchases;
create policy purchases_write on public.purchases
  for all using (public.current_user_role() in ('admin','tesoreria'))
  with check (public.current_user_role() in ('admin','tesoreria'));

-- AUDIT_LOG: solo admin lee
drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select using (public.is_admin());
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log
  for insert with check (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 13. STORAGE BUCKETS
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('receipts','receipts', false),
  ('invoices','invoices', false),
  ('avatars','avatars',   true)
on conflict (id) do nothing;

-- Receipts (PDFs de Ventas) — asesor y admin
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects
  for select using (bucket_id = 'receipts' and public.current_user_role() in ('admin','asesor'));
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert with check (bucket_id = 'receipts' and public.current_user_role() in ('admin','asesor'));
drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects
  for update using (bucket_id = 'receipts' and public.current_user_role() in ('admin','asesor'));

-- Invoices (PDFs de Compras) — tesorería y admin
drop policy if exists invoices_read on storage.objects;
create policy invoices_read on storage.objects
  for select using (bucket_id = 'invoices' and public.current_user_role() in ('admin','tesoreria'));
drop policy if exists invoices_insert on storage.objects;
create policy invoices_insert on storage.objects
  for insert with check (bucket_id = 'invoices' and public.current_user_role() in ('admin','tesoreria'));
drop policy if exists invoices_update on storage.objects;
create policy invoices_update on storage.objects
  for update using (bucket_id = 'invoices' and public.current_user_role() in ('admin','tesoreria'));

-- Avatars públicos
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 14. SEED DATA (datos iniciales del negocio)
-- ---------------------------------------------------------------------
insert into public.service_types (name, description) values
  ('Legalización de Posesiones', 'Trámite de legalización de posesión de bienes inmuebles'),
  ('Trámites Notariales',        'Servicios notariales generales'),
  ('Desenglobes',                'Trámite de desenglobe de propiedades'),
  ('Escrituración',              'Proceso de escrituración'),
  ('Sucesiones',                 'Trámites sucesorales'),
  ('Promesa de Compraventa',     'Elaboración de promesa de compraventa')
on conflict (name) do nothing;

insert into public.cost_centers (name, description) values
  ('Papelería',         'Insumos de oficina'),
  ('Marketing',         'Publicidad y mercadeo'),
  ('Viáticos',          'Transporte y desplazamientos'),
  ('Pagos Notariales',  'Pagos a notarías y registros'),
  ('Servicios Públicos','Agua, luz, internet'),
  ('Nómina',            'Pagos de personal'),
  ('Arrendamiento',     'Pago de oficina'),
  ('Otros',             'Gastos misceláneos')
on conflict (name) do nothing;

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- Próximos pasos:
--   1) Crear el primer usuario en Authentication > Users
--   2) Asignarle role='admin' con:
--      update public.profiles set role='admin' where email='tu@correo.com';
--   3) Conectar Claude Code usando SUPABASE_URL y SUPABASE_ANON_KEY
-- =====================================================================
