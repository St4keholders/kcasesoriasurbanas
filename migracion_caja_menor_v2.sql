-- =====================================================================
-- KC Asesorías Urbanas — Módulo Caja Menor (v2)
-- =====================================================================
-- Cambios respecto a v1:
--   • Empleado ya NO es texto libre: se deriva del usuario logueado
--     (created_by → profiles.full_name).
--   • Cajas se crean dinámicamente (no seed de 10 cajas vacías).
--   • Box number autoincrementa con secuencia.
--   • Estado de la caja: abierta / cerrada / reembolsada.
--   • Vista petty_cash_box_summary lista para el panel inicial.
-- Correr en: Supabase SQL Editor
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. LIMPIEZA si ya corriste la v1 (descomentar solo si aplica)
-- ---------------------------------------------------------------------
-- drop view if exists public.petty_cash_box_summary;
-- drop table if exists public.petty_cash_entries cascade;
-- drop table if exists public.petty_cash_boxes cascade;
-- drop sequence if exists public.petty_cash_box_seq;

-- ---------------------------------------------------------------------
-- 1. ENUM: estado de la caja
-- ---------------------------------------------------------------------
do $$ begin
  create type public.petty_cash_status as enum
    ('abierta', 'cerrada', 'reembolsada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. SECUENCIA para box_number auto-incremental
-- ---------------------------------------------------------------------
create sequence if not exists public.petty_cash_box_seq start 1;

-- ---------------------------------------------------------------------
-- 3. TABLA: petty_cash_boxes  (cada "Caja Menor #N")
-- ---------------------------------------------------------------------
create table if not exists public.petty_cash_boxes (
  id              uuid primary key default gen_random_uuid(),
  box_number      int unique not null default nextval('public.petty_cash_box_seq'),
  name            text,                                       -- "Caja Junio Paola" (opcional)
  opened_by       uuid not null references public.profiles(id) default auth.uid(),
  opened_at       timestamptz not null default now(),
  status          public.petty_cash_status not null default 'abierta',
  closed_at       timestamptz,
  reimbursed_at   timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_petty_cash_boxes_opened_by
  on public.petty_cash_boxes(opened_by);
create index if not exists idx_petty_cash_boxes_status
  on public.petty_cash_boxes(status);

-- ---------------------------------------------------------------------
-- 4. TABLA: petty_cash_entries  (gastos dentro de cada caja)
-- ---------------------------------------------------------------------
create table if not exists public.petty_cash_entries (
  id                uuid primary key default gen_random_uuid(),
  box_id            uuid not null references public.petty_cash_boxes(id) on delete restrict,
  entry_date        date not null,
  supplier_name     text not null,                            -- texto libre
  supplier_document text,                                     -- NIT / cédula
  invoice_number    text,                                     -- opcional
  concept           text not null,
  tax_amount        numeric(12,2) not null default 0,         -- IVA
  total_amount      numeric(12,2) not null,                   -- valor total
  receipt_url       text,                                     -- ruta en Storage (foto/PDF)
  created_by        uuid not null references public.profiles(id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_petty_cash_entries_box
  on public.petty_cash_entries(box_id);
create index if not exists idx_petty_cash_entries_date
  on public.petty_cash_entries(entry_date);
create index if not exists idx_petty_cash_entries_created_by
  on public.petty_cash_entries(created_by);

-- ---------------------------------------------------------------------
-- 5. TRIGGERS updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_petty_cash_boxes_updated_at on public.petty_cash_boxes;
create trigger trg_petty_cash_boxes_updated_at
  before update on public.petty_cash_boxes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_petty_cash_entries_updated_at on public.petty_cash_entries;
create trigger trg_petty_cash_entries_updated_at
  before update on public.petty_cash_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. VISTA: petty_cash_box_summary
--     Lo que consume el panel inicial (grid de cards)
-- ---------------------------------------------------------------------
create or replace view public.petty_cash_box_summary as
select
  b.id,
  b.box_number,
  b.name,
  b.opened_by,
  p.full_name                          as opened_by_name,
  b.opened_at,
  b.status,
  b.closed_at,
  b.reimbursed_at,
  count(e.id)::int                     as total_entries,
  coalesce(sum(e.total_amount), 0)     as total_spent,
  coalesce(sum(e.tax_amount), 0)       as total_tax,
  max(e.entry_date)                    as last_entry_date
from public.petty_cash_boxes b
left join public.profiles p           on p.id = b.opened_by
left join public.petty_cash_entries e on e.box_id = b.id
group by b.id, p.full_name;

-- ---------------------------------------------------------------------
-- 7. VISTA: petty_cash_entries_full
--     Lo que consume el detalle de una caja (incluye nombre del empleado)
-- ---------------------------------------------------------------------
create or replace view public.petty_cash_entries_full as
select
  e.id,
  e.box_id,
  b.box_number,
  e.entry_date,
  p.full_name        as employee_name,
  e.created_by,
  e.supplier_name,
  e.supplier_document,
  e.invoice_number,
  e.concept,
  e.tax_amount,
  e.total_amount,
  e.receipt_url,
  e.created_at,
  e.updated_at
from public.petty_cash_entries e
left join public.profiles p          on p.id = e.created_by
left join public.petty_cash_boxes b  on b.id = e.box_id;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.petty_cash_boxes   enable row level security;
alter table public.petty_cash_entries enable row level security;

-- BOXES ---------------------------------------------------------------

-- Lectura: admin, asesor, tesoreria
drop policy if exists petty_cash_boxes_read on public.petty_cash_boxes;
create policy petty_cash_boxes_read on public.petty_cash_boxes
  for select using (
    public.current_user_role() in ('admin','asesor','tesoreria')
  );

-- Apertura de caja: asesor abre la suya, admin abre cualquiera
drop policy if exists petty_cash_boxes_insert on public.petty_cash_boxes;
create policy petty_cash_boxes_insert on public.petty_cash_boxes
  for insert with check (
    public.current_user_role() in ('admin','asesor')
    and opened_by = auth.uid()
  );

-- Actualización (cerrar / reembolsar):
--   • Asesor puede cerrar la suya
--   • Admin puede actualizar cualquiera (incluido reembolsada)
--   • Tesoreria puede marcar como reembolsada
drop policy if exists petty_cash_boxes_update on public.petty_cash_boxes;
create policy petty_cash_boxes_update on public.petty_cash_boxes
  for update using (
    public.is_admin()
    or (public.current_user_role() = 'asesor' and opened_by = auth.uid())
    or public.current_user_role() = 'tesoreria'
  )
  with check (
    public.is_admin()
    or (public.current_user_role() = 'asesor' and opened_by = auth.uid())
    or public.current_user_role() = 'tesoreria'
  );

-- Eliminar: solo admin
drop policy if exists petty_cash_boxes_delete on public.petty_cash_boxes;
create policy petty_cash_boxes_delete on public.petty_cash_boxes
  for delete using (public.is_admin());

-- ENTRIES -------------------------------------------------------------

-- Lectura: admin, asesor, tesoreria
drop policy if exists petty_cash_entries_read on public.petty_cash_entries;
create policy petty_cash_entries_read on public.petty_cash_entries
  for select using (
    public.current_user_role() in ('admin','asesor','tesoreria')
  );

-- Crear gasto: asesor + admin, y created_by SIEMPRE = auth.uid()
-- (esto bloquea que un asesor reporte gastos a nombre de otro)
drop policy if exists petty_cash_entries_insert on public.petty_cash_entries;
create policy petty_cash_entries_insert on public.petty_cash_entries
  for insert with check (
    public.current_user_role() in ('admin','asesor')
    and created_by = auth.uid()
  );

-- Editar gasto: asesor solo edita los suyos; admin edita todo
drop policy if exists petty_cash_entries_update on public.petty_cash_entries;
create policy petty_cash_entries_update on public.petty_cash_entries
  for update using (
    public.is_admin()
    or (public.current_user_role() = 'asesor' and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.current_user_role() = 'asesor' and created_by = auth.uid())
  );

-- Eliminar: admin, o el asesor que lo creó
drop policy if exists petty_cash_entries_delete on public.petty_cash_entries;
create policy petty_cash_entries_delete on public.petty_cash_entries
  for delete using (
    public.is_admin()
    or (public.current_user_role() = 'asesor' and created_by = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 9. STORAGE BUCKET para soportes (fotos de facturas)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('petty-cash-receipts', 'petty-cash-receipts', false)
on conflict (id) do nothing;

drop policy if exists petty_cash_receipts_read on storage.objects;
create policy petty_cash_receipts_read on storage.objects
  for select using (
    bucket_id = 'petty-cash-receipts'
    and public.current_user_role() in ('admin','asesor','tesoreria')
  );

drop policy if exists petty_cash_receipts_insert on storage.objects;
create policy petty_cash_receipts_insert on storage.objects
  for insert with check (
    bucket_id = 'petty-cash-receipts'
    and public.current_user_role() in ('admin','asesor')
  );

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================
-- Cómo consultar desde la app:
--
--   • Panel inicial (grid de cajas):
--       select * from petty_cash_box_summary order by box_number desc;
--
--   • Detalle de una caja específica:
--       select * from petty_cash_entries_full
--       where box_id = '<uuid>'
--       order by entry_date desc, created_at desc;
--
--   • Abrir nueva caja (el opened_by se setea solo a auth.uid()):
--       insert into petty_cash_boxes (name) values ('Caja Junio 2026');
--
--   • Registrar gasto (created_by se setea solo a auth.uid()):
--       insert into petty_cash_entries
--         (box_id, entry_date, supplier_name, supplier_document,
--          invoice_number, concept, tax_amount, total_amount)
--       values ('<box-uuid>', '2026-06-23', 'Ciber Color',
--               '43.156.109-0', null, '6 Planos', 0, 60000);
-- =====================================================================
