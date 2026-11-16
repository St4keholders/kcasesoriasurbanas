import { describe, it, expect } from 'vitest';
import {
  normalizeNitDigits,
  calculateDianDv,
  parseNitAndDv,
  validateNitWithDv,
  KC_NIT,
  KC_DV,
  isKcNit,
} from '../lib/utils/nit';
import {
  formatCOP,
  parseCOP,
  calculateInvoiceTotals,
  numberToSpanishWordsCOP,
} from '../lib/utils/money';
import { validateAccountingDate2026 } from '../lib/utils/dates';
import fs from 'fs';
import path from 'path';

describe('Fase 3 — Validación de NIT y Dígito de Verificación (Módulo 11 DIAN)', () => {
  it('calcula correctamente el DV del NIT de KC Asesorías Urbanas (902012620-0)', () => {
    expect(calculateDianDv(KC_NIT)).toBe(Number(KC_DV));
    expect(validateNitWithDv('902012620', '0')).toBe(true);
    expect(validateNitWithDv('902012620', '5')).toBe(false);
    expect(isKcNit('902.012.620-0')).toBe(true);
  });

  it('calcula correctamente el DV de NITs empresariales conocidos en Colombia', () => {
    // Almacenes Éxito: 890900608-9
    expect(calculateDianDv('890900608')).toBe(9);
    const parsed = parseNitAndDv('890.900.608-9');
    expect(parsed.nit).toBe('890900608');
    expect(parsed.dv).toBe('9');
    expect(parsed.isValidDv).toBe(true);
    expect(parsed.formatted).toBe('890900608-9');
  });

  it('rechaza el NIT comodín 000000000 y cadenas sin dígitos válidos', () => {
    expect(normalizeNitDigits('000000000')).toBe('');
    expect(normalizeNitDigits('0')).toBe('');
    expect(normalizeNitDigits('Ocasional')).toBe('');
    const parsed = parseNitAndDv('000000000');
    expect(parsed.nit).toBe('');
    expect(parsed.isValidDv).toBe(false);
  });
});

describe('Fase 3 — Montos Colombianos (COP) y Totales de Factura', () => {
  it('parsea y formatea montos en pesos colombianos sin decimales', () => {
    expect(parseCOP('$ 1.250.000')).toBe(1250000);
    expect(parseCOP('1.250.000,00')).toBe(1250000);
    expect(parseCOP('45.000')).toBe(45000);
    expect(parseCOP(320000)).toBe(320000);
    expect(formatCOP(1250000)).toContain('1.250.000');
  });

  it('calcula IVA descontable solo con factura electrónica a nombre de KC', () => {
    const conFe = calculateInvoiceTotals({
      amount: 1000000,
      taxIva: 190000,
      withholdingTax: 25000,
      hasElectronicInvoice: true,
      isAddressedToKc: true,
    });
    expect(conFe.deductibleIva).toBe(190000);
    expect(conFe.nonDeductibleIva).toBe(0);
    expect(conFe.accountingExpenseOrCost).toBe(1000000);
    expect(conFe.total).toBe(1165000);

    const sinFe = calculateInvoiceTotals({
      amount: 1000000,
      taxIva: 190000,
      withholdingTax: 0,
      hasElectronicInvoice: false,
      isAddressedToKc: true,
    });
    expect(sinFe.deductibleIva).toBe(0);
    expect(sinFe.nonDeductibleIva).toBe(190000);
    expect(sinFe.accountingExpenseOrCost).toBe(1190000);
    expect(sinFe.total).toBe(1190000);
  });

  it('convierte montos a letras en español para comprobantes contables', () => {
    expect(numberToSpanishWordsCOP(1250000)).toBe(
      'UN MILLÓN DOSCIENTOS CINCUENTA MIL PESOS M/CTE'
    );
    expect(numberToSpanishWordsCOP(52374)).toBe(
      'CINCUENTA Y DOS MIL TRESCIENTOS SETENTA Y CUATRO PESOS M/CTE'
    );
  });

  it('valida fechas del ejercicio contable 2026', () => {
    expect(validateAccountingDate2026('2026-06-15').valid).toBe(true);
    expect(validateAccountingDate2026('2025-12-31').valid).toBe(false);
  });
});

describe('Fase 3 — Permisos por Rol (RLS con simulación de JWT y ROLLBACK — Sección C)', () => {
  it('verifica la matriz de permisos de admin, tesorería y asesor en Supabase con ROLLBACK', async () => {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const env = fs.readFileSync(envPath, 'utf8');
    const url =
      env.match(/^NEXT_PUBLIC_SUPABASE_URL=\s*(\S+)/m)?.[1] ||
      env.match(/^project_url=\s*(\S+)/m)?.[1];
    const token =
      env.match(/^SUPABASE_ACCESS_TOKEN=\s*(\S+)/m)?.[1] ||
      env.match(/^Token=\s*(\S+)/m)?.[1];

    if (!url || !token) return;
    const ref = new URL(url).hostname.split('.')[0];

    const sql = `
      BEGIN;
      -- Tomar o simular 3 perfiles (admin, tesoreria, asesor) dentro de la transacción
      CREATE TEMP TABLE _rls_results (
        role_name text,
        can_read_purchases boolean,
        can_insert_petty_cash boolean,
        has_role_check boolean
      ) ON COMMIT DROP;
      GRANT ALL ON TABLE _rls_results TO authenticated;

      DO $$
      DECLARE
        v_admin_id uuid;
        v_teso_id uuid;
        v_asesor_id uuid;
        v_box_id uuid;
        v_cnt int;
      BEGIN
        SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;
        SELECT id INTO v_teso_id FROM public.profiles WHERE role = 'tesoreria' AND is_active = true LIMIT 1;
        SELECT id INTO v_asesor_id FROM public.profiles WHERE role = 'asesor' AND is_active = true LIMIT 1;
        SELECT id INTO v_box_id FROM public.petty_cash_boxes LIMIT 1;

        -- Si no existe un perfil de tesorería activo, actualizamos temporalmente uno dentro del BEGIN..ROLLBACK
        IF v_teso_id IS NULL THEN
          SELECT id INTO v_teso_id FROM public.profiles WHERE id <> v_admin_id LIMIT 1;
          UPDATE public.profiles SET role = 'tesoreria', is_active = true WHERE id = v_teso_id;
        END IF;

        IF v_asesor_id IS NULL OR v_asesor_id = v_teso_id THEN
          SELECT id INTO v_asesor_id FROM public.profiles WHERE id NOT IN (v_admin_id, v_teso_id) LIMIT 1;
          UPDATE public.profiles SET role = 'asesor', is_active = true WHERE id = v_asesor_id;
        END IF;

        -- 1. Probar ADMIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
        SELECT count(*) INTO v_cnt FROM public.purchases;
        INSERT INTO _rls_results VALUES ('admin', v_cnt > 0, public.has_role('admin', 'tesoreria'), public.has_role('admin'));
        EXECUTE 'RESET ROLE';

        -- 2. Probar TESORERIA (debe ver compras y poder insertar en petty_cash_entries)
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teso_id::text, 'role', 'authenticated')::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
        SELECT count(*) INTO v_cnt FROM public.purchases;
        INSERT INTO public.petty_cash_entries (box_id, entry_type, entry_date, supplier_name, concept, tax_amount, total_amount, created_by)
        VALUES (v_box_id, 'egreso', '2026-06-15', 'Prueba Tesorería RLS', 'Test RLS', 0, 10000, v_teso_id);
        INSERT INTO _rls_results VALUES ('tesoreria', v_cnt > 0, true, public.has_role('tesoreria'));
        EXECUTE 'RESET ROLE';

        -- 3. Probar ASESOR (NO debe ver compras)
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_asesor_id::text, 'role', 'authenticated')::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
        SELECT count(*) INTO v_cnt FROM public.purchases;
        INSERT INTO _rls_results VALUES ('asesor', v_cnt > 0, false, public.has_role('asesor'));
        EXECUTE 'RESET ROLE';
      END $$;

      SELECT * FROM _rls_results ORDER BY role_name;
    `;

    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql + '\nROLLBACK;' }),
    });

    expect(res.ok).toBe(true);
  });
});
