-- =====================================================================
-- KC Asesorías — Migración para Cajas Menores: Ingresos vs Egresos y Centro de Costos
-- =====================================================================

-- 1. Agregar columna de tipo de registro a la tabla petty_cash_entries
ALTER TABLE public.petty_cash_entries
ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'egreso' CHECK (entry_type IN ('ingreso', 'egreso'));

-- 2. Agregar centro de costos a la caja menor (petty_cash_boxes)
ALTER TABLE public.petty_cash_boxes
ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);

-- 3. Recrear la vista completa (petty_cash_entries_full) para incluir la nueva columna y el centro de costos
DROP VIEW IF EXISTS public.petty_cash_entries_full;

CREATE VIEW public.petty_cash_entries_full AS
SELECT 
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
    e.created_at,
    e.updated_at,
    e.created_by,
    b.box_number,
    b.cost_center_id,
    c.name as cost_center_name,
    p.full_name as created_by_name
FROM public.petty_cash_entries e
JOIN public.petty_cash_boxes b ON b.id = e.box_id
LEFT JOIN public.cost_centers c ON c.id = b.cost_center_id
LEFT JOIN public.profiles p ON p.id = e.created_by;

-- 4. Recrear la vista de resumen de cajas (petty_cash_box_summary) para incluir centro de costos
DROP VIEW IF EXISTS public.petty_cash_box_summary;

CREATE OR REPLACE VIEW public.petty_cash_box_summary AS
SELECT
  b.id,
  b.box_number,
  b.name,
  b.opened_by,
  p.full_name                          AS opened_by_name,
  b.opened_at,
  b.status,
  b.closed_at,
  b.reimbursed_at,
  b.cost_center_id,
  cc.name                              AS cost_center_name,
  count(e.id)::int                     AS total_entries,
  coalesce(sum(e.total_amount), 0)     AS total_spent,
  coalesce(sum(e.tax_amount), 0)       AS total_tax,
  max(e.entry_date)                    AS last_entry_date
FROM public.petty_cash_boxes b
LEFT JOIN public.profiles p            ON p.id = b.opened_by
LEFT JOIN public.cost_centers cc       ON cc.id = b.cost_center_id
LEFT JOIN public.petty_cash_entries e  ON e.box_id = b.id
GROUP BY b.id, p.full_name, cc.name;
