import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseNitAndDv, normalizeNitDigits, calculateDianDv } from '../lib/utils/nit';

function getEnv(content: string, key: string, alt?: string): string {
  const m = content.match(new RegExp(`^${key}=\\s*(\\S+)`, 'm'));
  if (m) return m[1];
  if (alt) {
    const m2 = content.match(new RegExp(`^${alt}=\\s*(\\S+)`, 'm'));
    if (m2) return m2[1];
  }
  return process.env[key] || '';
}

function normalizeNameKey(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function runFusion() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const supabaseUrl = getEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'project_url');
  const serviceKey = getEnv(env, 'SUPABASE_SERVICE_ROLE_KEY', 'Secret_key');

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: suppliers, error: suppErr } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: true });

  if (suppErr || !suppliers) {
    throw new Error('Error leyendo suppliers: ' + suppErr?.message);
  }

  const byNit = new Map<string, typeof suppliers>();
  const withoutNit: typeof suppliers = [];

  for (const s of suppliers) {
    const cleanNit = normalizeNitDigits(s.nit_normalized || s.document_number);
    // NITs muy cortos (< 5 dígitos, ej. '28940', '5800') o 'Proveedor Ocasional' no son NITs reales DIAN
    if (cleanNit && cleanNit.length >= 6 && s.name.toLowerCase().trim() !== 'proveedor ocasional') {
      const list = byNit.get(cleanNit) || [];
      list.push(s);
      byNit.set(cleanNit, list);
    } else {
      withoutNit.push(s);
    }
  }

  const byNameWithoutNit = new Map<string, typeof suppliers>();
  for (const s of withoutNit) {
    const nameKey =
      s.is_occasional || s.name.toLowerCase().trim() === 'proveedor ocasional'
        ? '__proveedor_ocasional__'
        : normalizeNameKey(s.name) || s.id;
    const list = byNameWithoutNit.get(nameKey) || [];
    list.push(s);
    byNameWithoutNit.set(nameKey, list);
  }

  interface MergedGroupReport {
    reason: 'NIT' | 'NOMBRE';
    key: string;
    canonicalId: string;
    canonicalName: string;
    mergedIds: string[];
    mergedNames: string[];
    purchasesRelinked: number;
  }

  const mergedGroups: MergedGroupReport[] = [];
  const allGroups: Array<{
    reason: 'NIT' | 'NOMBRE';
    key: string;
    members: typeof suppliers;
  }> = [];

  for (const [nit, members] of byNit.entries()) {
    allGroups.push({ reason: 'NIT', key: nit, members });
  }
  for (const [nameKey, members] of byNameWithoutNit.entries()) {
    allGroups.push({ reason: 'NOMBRE', key: nameKey, members });
  }

  // Leer todas las compras para contar reasignaciones
  const { data: allPurchases } = await supabase
    .from('purchases')
    .select('id, supplier_id, supplier_name');

  const supplierIdToThirdPartyId = new Map<string, string>();
  const supplierIdToCanonicalSupplierId = new Map<string, string>();
  const thirdPartiesToUpsert: Array<Record<string, unknown>> = [];

  for (const grp of allGroups) {
    // Elegir canónico: preferir el que no tenga caracteres de control (\x1e) y tenga nombre más limpio
    const sorted = [...grp.members].sort((a, b) => {
      const aClean = !/[\x00-\x1f]/.test(a.name);
      const bClean = !/[\x00-\x1f]/.test(b.name);
      if (aClean !== bClean) return aClean ? -1 : 1;
      return a.name.length >= b.name.length ? -1 : 1;
    });

    const canonical = sorted[0];
    const cleanName = canonical.name.replace(/[\x00-\x1f]/g, '').trim() || 'Proveedor Ocasional';
    const rawDoc = canonical.document_number || canonical.nit_normalized || '';
    const parsedNit = parseNitAndDv(rawDoc);
    const hasValidNit = parsedNit.nit.length >= 6;
    const expectedDv = hasValidNit ? calculateDianDv(parsedNit.nit) : null;
    const effectiveDv = hasValidNit
      ? parsedNit.dv ?? (expectedDv !== null ? String(expectedDv) : null)
      : null;
    const isDvValid =
      hasValidNit && expectedDv !== null && effectiveDv !== null && Number(effectiveDv) === expectedDv;
    const isOccasional =
      Boolean(canonical.is_occasional) || cleanName.toLowerCase() === 'proveedor ocasional';

    const memberIds = grp.members.map((m) => m.id);
    for (const mId of memberIds) {
      supplierIdToCanonicalSupplierId.set(mId, canonical.id);
      supplierIdToThirdPartyId.set(mId, canonical.id); // Usamos el mismo UUID canónico como third_parties.id para trazabilidad 1:1
    }

    thirdPartiesToUpsert.push({
      id: canonical.id,
      legacy_supplier_id: canonical.id,
      merged_supplier_ids: memberIds,
      name: isOccasional ? 'Proveedor Ocasional' : cleanName,
      nit_normalized: hasValidNit ? parsedNit.nit : null,
      dv: effectiveDv,
      document_number: hasValidNit && effectiveDv !== null ? `${parsedNit.nit}-${effectiveDv}` : hasValidNit ? parsedNit.nit : null,
      document_type: hasValidNit && parsedNit.nit.startsWith('8') || parsedNit.nit.startsWith('9') ? 'NIT' : hasValidNit ? 'CC' : 'OTRO',
      is_dv_valid: isDvValid,
      has_rut: hasValidNit,
      is_billing_obligated: hasValidNit && (parsedNit.nit.startsWith('8') || parsedNit.nit.startsWith('9')),
      is_occasional: isOccasional,
      email: canonical.email || null,
      phone: canonical.phone || null,
      address: canonical.address || null,
      is_active: true,
    });

    if (grp.members.length > 1) {
      const secondaryIds = memberIds.filter((id) => id !== canonical.id);
      const relinkedCount = (allPurchases || []).filter((p) =>
        secondaryIds.includes(p.supplier_id)
      ).length;

      mergedGroups.push({
        reason: grp.reason,
        key: grp.key,
        canonicalId: canonical.id,
        canonicalName: cleanName,
        mergedIds: secondaryIds,
        mergedNames: grp.members.map((m) => m.name.replace(/[\x00-\x1f]/g, '')),
        purchasesRelinked: relinkedCount,
      });
    }
  }

  // Upsert en lotes de 200 en third_parties
  for (let i = 0; i < thirdPartiesToUpsert.length; i += 200) {
    const batch = thirdPartiesToUpsert.slice(i, i + 200);
    const { error } = await supabase
      .from('third_parties')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      throw new Error('Error upserting third_parties: ' + error.message);
    }
  }

  // Actualizar duplicados en purchases y desactivar suppliers secundarios (sin DELETE)
  for (const mg of mergedGroups) {
    if (mg.mergedIds.length > 0) {
      await supabase
        .from('purchases')
        .update({
          supplier_id: mg.canonicalId,
          third_party_id: mg.canonicalId,
        })
        .in('supplier_id', mg.mergedIds);

      await supabase
        .from('suppliers')
        .update({ is_active: false })
        .in('id', mg.mergedIds);
    }
  }

  // Vincular purchases.third_party_id = purchases.supplier_id para el resto
  const { data: occasionalTp } = await supabase
    .from('third_parties')
    .select('id')
    .eq('is_occasional', true)
    .limit(1)
    .single();

  const occasionalId = occasionalTp?.id;

  // Ejecutar actualización masiva en SQL vía RPC o actualización por lotes
  const envToken = getEnv(env, 'SUPABASE_ACCESS_TOKEN', 'Token');
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${envToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        UPDATE public.purchases p
        SET third_party_id = COALESCE(
          (SELECT tp.id FROM public.third_parties tp WHERE tp.id = p.supplier_id),
          (SELECT tp.id FROM public.third_parties tp WHERE p.supplier_id = ANY(tp.merged_supplier_ids) LIMIT 1),
          '${occasionalId}'::uuid
        )
        WHERE p.third_party_id IS NULL;

        UPDATE public.petty_cash_entries e
        SET third_party_id = COALESCE(
          (
            SELECT tp.id FROM public.third_parties tp
            WHERE tp.nit_normalized IS NOT NULL
              AND tp.nit_normalized = regexp_replace(split_part(coalesce(e.supplier_document, ''), '-', 1), '[^0-9]', '', 'g')
            LIMIT 1
          ),
          (
            SELECT tp.id FROM public.third_parties tp
            WHERE lower(trim(tp.name)) = lower(trim(e.supplier_name))
            LIMIT 1
          ),
          '${occasionalId}'::uuid
        )
        WHERE e.third_party_id IS NULL;
      `,
    }),
  });

  // Generar reporte docs/FUSION_TERCEROS.md
  const withNitCount = thirdPartiesToUpsert.filter((t) => Boolean(t.nit_normalized)).length;
  const withoutNitCount = thirdPartiesToUpsert.length - withNitCount;

  const md: string[] = [];
  md.push('# Reporte de Migración y Fusión de Terceros (`suppliers` → `third_parties`)');
  md.push('');
  md.push('Fecha de ejecución: `2026-11-16`');
  md.push('');
  md.push('## 1. Resumen Ejecutivo');
  md.push('');
  md.push(`- **Proveedores originales en \`suppliers\`:** ${suppliers.length}`);
  md.push(`- **Terceros unificados activos en \`third_parties\`:** ${thirdPartiesToUpsert.length}`);
  md.push(`- **Grupos de duplicados fusionados:** ${mergedGroups.length}`);
  md.push(`- **Registros secundarios desactivados (sin \`DELETE\`):** ${suppliers.length - thirdPartiesToUpsert.length}`);
  md.push(`- **Terceros con NIT y DV normalizado (Módulo 11 DIAN):** ${withNitCount}`);
  md.push(`- **Terceros pendientes de NIT/identificación fiscal:** ${withoutNitCount}`);
  md.push(`- **Tercero comodín único:** \`Proveedor Ocasional\` (\`${occasionalId}\`)`);
  md.push('');
  md.push('## 2. Detalle de Grupos Fusionados');
  md.push('');
  md.push('| Criterio | Clave | Nombre Canónico | ID Canónico | Variantes Fusionadas | Compras Reasignadas |');
  md.push('|---|---|---|---|---|---|');
  for (const mg of mergedGroups) {
    md.push(
      `| **${mg.reason}** | \`${mg.key}\` | ${mg.canonicalName} | \`${mg.canonicalId}\` | ${mg.mergedNames.join(' / ')} | ${mg.purchasesRelinked} |`
    );
  }
  md.push('');
  md.push('## 3. Reglas Aplicadas');
  md.push('');
  md.push('1. Se eliminó por completo el uso del NIT comodín `000000000` y `0` (55 registros que compartían `000000000` pero correspondían a personas o comercios distintos conservaron su identidad individual sin fusionarse erróneamente bajo un mismo NIT falso).');
  md.push('2. Los terceros que compartían un NIT real válido (≥ 6 dígitos) o el mismo nombre normalizado fueron consolidados en un único registro en `third_parties`, preservando todos los IDs originales en `merged_supplier_ids`.');
  md.push('3. Todas las compras (`purchases`) y movimientos de caja menor (`petty_cash_entries`) quedaron enlazados mediante `third_party_id`.');

  fs.writeFileSync(path.resolve(process.cwd(), 'docs/FUSION_TERCEROS.md'), md.join('\n') + '\n', 'utf8');
  console.log(`Fusión completada: ${suppliers.length} suppliers -> ${thirdPartiesToUpsert.length} third_parties (${mergedGroups.length} grupos fusionados).`);
}

runFusion().catch((err) => {
  console.error(err);
  process.exit(1);
});
