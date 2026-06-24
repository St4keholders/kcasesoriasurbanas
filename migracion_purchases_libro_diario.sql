-- =====================================================================
-- KC Asesorías Urbanas — Ajuste tabla Compras (alineación con Libro Diario)
-- =====================================================================
-- Cambios:
--   • Renombra campos para reflejar la nomenclatura del Libro Diario:
--       description     → concept
--       invoice_date    → transaction_date
--       tax             → tax_iva
--   • Agrega transaction_type (enum: costo_gasto, inversion, otro)
--   • Agrega withholding_tax (retención en la fuente)
--   • Hace cost_center_id opcional (no todos los gastos lo tienen)
--   • Trigger auto-calcula total = amount + tax_iva - withholding_tax
-- Idempotente: puede correrse varias veces sin romper nada.
-- Preserva los datos existentes (es ALTER, no DROP).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM: tipo de transacción
-- ---------------------------------------------------------------------
do $$ begin
  create type public.transaction_type as enum
    ('costo_gasto', 'inversion', 'otro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. AGREGAR / RENOMBRAR COLUMNAS
-- ---------------------------------------------------------------------

-- transaction_type (nuevo)
alter table public.purchases
  add column if not exists transaction_type public.transaction_type
  not null default 'costo_gasto';

-- description → concept
do $$ begin
  alter table public.purchases rename column description to concept;
exception
  when undefined_column then null;
  when duplicate_column then null;
end $$;

-- invoice_date → transaction_date
do $$ begin
  alter table public.purchases rename column invoice_date to transaction_date;
exception
  when undefined_column then null;
  when duplicate_column then null;
end $$;

-- tax → tax_iva
do $$ begin
  alter table public.purchases rename column tax to tax_iva;
exception
  when undefined_column then null;
  when duplicate_column then null;
end $$;

-- withholding_tax (nuevo, retención en la fuente)
alter table public.purchases
  add column if not exists withholding_tax numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------
-- 3. AJUSTES DE CONSTRAINTS
-- ---------------------------------------------------------------------

-- cost_center_id: hacer opcional
alter table public.purchases
  alter column cost_center_id drop not null;

-- ---------------------------------------------------------------------
-- 4. COMENTARIOS (documentación in-line)
-- ---------------------------------------------------------------------
comment on column public.purchases.transaction_date is 'Fecha de la transacción (Libro Diario: Fecha)';
comment on column public.purchases.transaction_type is 'Tipo (Libro Diario: Tipo de transacción)';
comment on column public.purchases.supplier_name    is 'Nombre del proveedor o persona (Libro Diario: Nombre)';
comment on column public.purchases.invoice_number   is 'Número de factura (opcional)';
comment on column public.purchases.concept          is 'Descripción / nota del gasto (Libro Diario: Nota)';
comment on column public.purchases.amount           is 'Subtotal / base gravable, sin IVA (Libro Diario: Valor)';
comment on column public.purchases.tax_iva          is 'IVA cobrado por el proveedor — se suma al subtotal';
comment on column public.purchases.withholding_tax  is 'Retención en la fuente — se resta del pago al proveedor';
comment on column public.purchases.total            is 'Total a pagar = amount + tax_iva - withholding_tax (calculado automáticamente)';

-- ---------------------------------------------------------------------
-- 5. TRIGGER: auto-calcular total
-- ---------------------------------------------------------------------
create or replace function public.calc_purchase_total()
returns trigger language plpgsql as $$
begin
  -- Recalcula total = amount + tax_iva - withholding_tax
  new.total := coalesce(new.amount, 0)
             + coalesce(new.tax_iva, 0)
             - coalesce(new.withholding_tax, 0);
  return new;
end; $$;

drop trigger if exists trg_purchases_calc_total on public.purchases;
create trigger trg_purchases_calc_total
  before insert or update of amount, tax_iva, withholding_tax
  on public.purchases
  for each row execute function public.calc_purchase_total();

-- ---------------------------------------------------------------------
-- 6. RECALCULAR totales de registros existentes
--     (corre una vez para sincronizar lo que ya estaba en la tabla)
-- ---------------------------------------------------------------------
update public.purchases
   set total = coalesce(amount, 0)
             + coalesce(tax_iva, 0)
             - coalesce(withholding_tax, 0)
 where total is distinct from
       coalesce(amount, 0) + coalesce(tax_iva, 0) - coalesce(withholding_tax, 0);

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Esta consulta te muestra cómo quedó la tabla. Si todo está bien, verás
-- las columnas nuevas (transaction_type, tax_iva, withholding_tax) y los
-- nombres correctos (concept, transaction_date).
-- =====================================================================
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'purchases'
order by ordinal_position;

-- =====================================================================
-- ESTRUCTURA FINAL DE columnas clave (alineadas con el Libro Diario):
--
--   transaction_date    date         — Fecha
--   transaction_type    enum         — Tipo de transacción
--   supplier_name       text         — Nombre
--   supplier_document   text         — NIT
--   concept             text         — Nota
--   amount              numeric      — Valor (subtotal/base)
--   tax_iva             numeric      — IVA                    (NUEVO)
--   withholding_tax     numeric      — Retención en la fuente (NUEVO)
--   total               numeric      — Total calculado automático
--
-- Más los campos de gestión interna que ya existían:
--   purchase_number, supplier_id, cost_center_id (ahora opcional),
--   invoice_number, status, payment_method, due_date, paid_at,
--   invoice_url, notes, created_by, created_at, updated_at.
-- =====================================================================
