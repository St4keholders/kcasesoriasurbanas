-- =====================================================================
-- KC Asesorías — Migración para permitir eliminación de transacciones
-- y cajas menores a asesores y tesorería
-- =====================================================================

-- 1. Actualizar políticas de eliminación en petty_cash_boxes
-- Permitir eliminar a admin, tesorería, o al asesor que abrió la caja menor.
DROP POLICY IF EXISTS petty_cash_boxes_delete ON public.petty_cash_boxes;

CREATE POLICY petty_cash_boxes_delete ON public.petty_cash_boxes
  FOR DELETE USING (
    public.is_admin()
    OR public.current_user_role() = 'tesoreria'
    OR (public.current_user_role() = 'asesor' AND opened_by = auth.uid())
  );

-- 2. Actualizar políticas de eliminación en petty_cash_entries
-- Permitir eliminar a admin, tesorería, al asesor que creó el registro,
-- o al asesor que sea dueño de la caja menor asociada.
DROP POLICY IF EXISTS petty_cash_entries_delete ON public.petty_cash_entries;

CREATE POLICY petty_cash_entries_delete ON public.petty_cash_entries
  FOR DELETE USING (
    public.is_admin()
    OR public.current_user_role() = 'tesoreria'
    OR (public.current_user_role() = 'asesor' AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.petty_cash_boxes b
        WHERE b.id = box_id AND b.opened_by = auth.uid()
      )
    ))
  );
