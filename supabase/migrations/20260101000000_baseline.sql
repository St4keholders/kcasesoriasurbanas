-- =====================================================================
-- KC Asesorías Urbanas S.A.S — Migración Baseline del Esquema Real
-- Fecha: 2026-01-01
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.user_role as enum ('admin', 'asesor', 'tesoreria');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum ('agendada', 'en_curso', 'reprogramada', 'cancelada', 'atendida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum ('cotizacion', 'pendiente_pago', 'pagada', 'anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_status as enum ('pendiente_pago', 'pagado', 'anulado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta', 'nequi', 'daviplata', 'pse', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.petty_cash_status as enum ('abierta', 'cerrada', 'reembolsada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('costo_gasto', 'inversion', 'otro');
exception when duplicate_object then null; end $$;

create sequence if not exists public.petty_cash_box_seq start 1;

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
  document_number text,
  email           text,
  phone           text,
  address         text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  document_number  text,
  email            text,
  phone            text not null,
  source           text,
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

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

create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  sale_number     text unique,
  lead_id         uuid not null references public.leads(id),
  appointment_id  uuid references public.appointments(id),
  closed_by       uuid references public.profiles(id),
  status          public.sale_status not null default 'cotizacion',
  subtotal        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_method  public.payment_method,
  paid_at         timestamptz,
  notes           text,
  receipt_url     text,
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

create table if not exists public.purchases (
  id               uuid primary key default gen_random_uuid(),
  purchase_number  text unique,
  supplier_id      uuid references public.suppliers(id),
  supplier_name    text,
  cost_center_id   uuid references public.cost_centers(id),
  invoice_number   text,
  concept          text not null,
  amount           numeric(12,2) not null,
  tax_iva          numeric(12,2) not null default 0,
  withholding_tax  numeric(12,2) not null default 0,
  total            numeric(12,2) not null,
  status           public.purchase_status not null default 'pendiente_pago',
  payment_method   public.payment_method,
  transaction_date date not null,
  due_date         date,
  paid_at          timestamptz,
  invoice_url      text,
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  transaction_type public.transaction_type not null default 'costo_gasto'
);

create table if not exists public.petty_cash_boxes (
  id              uuid primary key default gen_random_uuid(),
  box_number      int unique not null default nextval('public.petty_cash_box_seq'),
  name            text,
  opened_by       uuid not null references public.profiles(id) default auth.uid(),
  opened_at       timestamptz not null default now(),
  status          public.petty_cash_status not null default 'abierta',
  closed_at       timestamptz,
  reimbursed_at   timestamptz,
  notes           text,
  cost_center_id  uuid references public.cost_centers(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.petty_cash_entries (
  id                uuid primary key default gen_random_uuid(),
  box_id            uuid not null references public.petty_cash_boxes(id) on delete restrict,
  entry_type        text default 'egreso' check (entry_type in ('ingreso', 'egreso')),
  entry_date        date not null,
  supplier_name     text not null,
  supplier_document text,
  invoice_number    text,
  concept           text not null,
  tax_amount        numeric(12,2) not null default 0,
  total_amount      numeric(12,2) not null,
  receipt_url       text,
  created_by        uuid not null references public.profiles(id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
