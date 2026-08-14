-- =====================================================================
-- KC Asesorías — Migración: Permisos de asesor (vendedor) en Caja Menor
-- =====================================================================
-- Problema: El rol 'asesor' no puede importar facturas masivamente
-- ni modificar valores en caja menor.
--
-- Cambios:
--   1. suppliers: permitir lectura/escritura al asesor
--   2. cost_centers: permitir lectura al asesor (necesario para vistas)
--   3. petty_cash_entries UPDATE: asesor puede editar entries de sus cajas
-- =====================================================================

-- 1. SUPPLIERS — Agregar asesor a lectura
-- El asesor necesita buscar y crear proveedores durante la carga masiva
-- de facturas en caja menor.
DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers
  FOR SELECT USING (
    public.current_user_role() IN ('admin', 'tesoreria', 'asesor')
  );

-- SUPPLIERS — Agregar asesor a escritura (insert)
DROP POLICY IF EXISTS suppliers_write ON public.suppliers;
CREATE POLICY suppliers_write ON public.suppliers
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'tesoreria', 'asesor')
  );

-- SUPPLIERS — Mantener update solo para admin y tesorería
-- (el asesor solo necesita crear, no modificar proveedores existentes)
DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
CREATE POLICY suppliers_update ON public.suppliers
  FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'tesoreria')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'tesoreria')
  );

-- SUPPLIERS — Eliminar solo admin
DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;
CREATE POLICY suppliers_delete ON public.suppliers
  FOR DELETE USING (
    public.is_admin()
  );

-- 2. COST_CENTERS — Agregar asesor a lectura
-- La vista petty_cash_entries_full hace JOIN con cost_centers.
-- Sin lectura, el asesor no puede ver las entries correctamente.
DROP POLICY IF EXISTS cost_centers_read ON public.cost_centers;
CREATE POLICY cost_centers_read ON public.cost_centers
  FOR SELECT USING (
    public.current_user_role() IN ('admin', 'tesoreria', 'asesor')
  );

-- 3. PETTY_CASH_ENTRIES UPDATE — Ampliar para dueño de la caja
-- El asesor ahora puede editar entries en cajas que ÉL abrió,
-- no solo entries que él mismo creó.
DROP POLICY IF EXISTS petty_cash_entries_update ON public.petty_cash_entries;
CREATE POLICY petty_cash_entries_update ON public.petty_cash_entries
  FOR UPDATE USING (
    public.is_admin()
    OR public.current_user_role() = 'tesoreria'
    OR (public.current_user_role() = 'asesor' AND created_by = auth.uid())
    OR (public.current_user_role() = 'asesor' AND EXISTS (
      SELECT 1 FROM public.petty_cash_boxes b
      WHERE b.id = box_id AND b.opened_by = auth.uid()
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() = 'tesoreria'
    OR (public.current_user_role() = 'asesor' AND created_by = auth.uid())
    OR (public.current_user_role() = 'asesor' AND EXISTS (
      SELECT 1 FROM public.petty_cash_boxes b
      WHERE b.id = box_id AND b.opened_by = auth.uid()
    ))
  );

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- Ejecutar en: Supabase SQL Editor ANTES del deploy
-- =====================================================================
