-- Una fila por operación (compra, movimiento de caja menor o venta) con sus comprobantes.
-- Alimenta el panel de Auditoría y la descarga AZ.
create or replace view public.v_kc_operaciones with (security_invoker = true) as
with ops as (
  select je.source_table, je.source_id,
         min(je.entry_date) as fecha,
         max(je.entry_number) filter (where je.entry_type in ('CC', 'RC')) as cc_number,
         max(je.entry_number) filter (where je.entry_type = 'CE') as ce_number,
         (array_agg(je.id) filter (where je.entry_type in ('CC', 'RC')))[1] as cc_id,
         (array_agg(je.id) filter (where je.entry_type = 'CE'))[1] as ce_id,
         case when bool_and(je.status = 'anulado') then 'anulado'
              when bool_or(je.status = 'pendiente') then 'pendiente'
              else 'aprobado' end as estado,
         max(je.posted_at) as aprobado_en,
         bool_or(abs(je.total_debit - je.total_credit) > 0.01 or je.total_debit <= 0) as descuadrado
    from public.journal_entries je
   where je.source_table is not null
   group by je.source_table, je.source_id
), base as (
  select o.*,
         coalesce(p.supplier_name, e.supplier_name, l.full_name, 'Sin tercero') as tercero,
         coalesce(p.concept, e.concept, 'Venta ' || s.sale_number) as concepto,
         coalesce(p.category_id, e.category_id) as category_id,
         coalesce(p.cost_center_id, b.cost_center_id) as cost_center_id,
         coalesce(p.amount, e.total_amount - coalesce(e.tax_amount, 0), s.subtotal - coalesce(s.discount, 0)) as base,
         coalesce(p.tax_iva, e.tax_amount, s.tax, 0) as iva,
         coalesce(p.withholding_tax, s.withholding_tax, 0) as retencion,
         coalesce(p.total, e.total_amount, s.total) as total,
         coalesce(p.support_storage_path, p.legacy_drive_url, p.invoice_url, e.support_storage_path, e.legacy_drive_url, e.receipt_url, s.support_storage_path, s.receipt_url) as soporte,
         coalesce(p.invoice_number, e.invoice_number) as factura,
         coalesce(p.purchase_number, b.name, s.sale_number) as referencia,
         coalesce(p.status::text, e.status::text, s.status::text) as estado_origen,
         e.entry_type as tipo_caja
    from ops o
    left join public.purchases p on o.source_table = 'purchases' and p.id = o.source_id
    left join public.petty_cash_entries e on o.source_table = 'petty_cash_entries' and e.id = o.source_id
    left join public.petty_cash_boxes b on b.id = e.box_id
    left join public.sales s on o.source_table = 'sales' and s.id = o.source_id
    left join public.leads l on l.id = s.lead_id
)
select b.*,
       c.name as categoria,
       cc.name as centro_costo,
       (b.estado <> 'anulado' and count(*) filter (where b.estado <> 'anulado') over (
          partition by lower(regexp_replace(b.tercero, '\s+', ' ', 'g')), b.fecha, b.total) > 1) as posible_duplicado,
       (b.soporte is null) as sin_soporte,
       (b.fecha < '2026-01-01' or b.fecha > current_date) as fecha_revisar,
       coalesce(b.cc_number, b.ce_number) as orden
  from base b
  left join public.expense_categories c on c.id = b.category_id
  left join public.cost_centers cc on cc.id = b.cost_center_id;

revoke all on public.v_kc_operaciones from anon;
grant select on public.v_kc_operaciones to authenticated;
