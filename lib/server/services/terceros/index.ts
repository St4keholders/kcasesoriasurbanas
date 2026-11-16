import { getServerDb } from '@/lib/server/db';
import { normalizeNitDigits, parseNitAndDv } from '@/lib/utils/nit';

export async function getOccasionalSupplier() {
  const db = await getServerDb();
  const { data: existing } = await db
    .from('suppliers')
    .select('*')
    .or('is_occasional.eq.true,name.ilike.Proveedor Ocasional')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('suppliers')
    .insert({
      name: 'Proveedor Ocasional',
      document_number: null,
      nit_normalized: null,
      dv: null,
      is_active: true,
      is_occasional: true,
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error('No se pudo obtener o crear Proveedor Ocasional: ' + error?.message);
  }
  return created;
}

export async function searchSuppliers(query: string, limit = 15) {
  const db = await getServerDb();
  const { data, error } = await db.rpc('search_suppliers_smart', {
    p_query: query.trim(),
    p_limit: limit,
  });

  if (error) {
    throw new Error('Error buscando terceros: ' + error.message);
  }
  return data || [];
}

export async function resolveOrCreateSupplier(params: {
  name?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  const db = await getServerDb();
  const cleanName = (params.name || '').trim();
  const parsedNit = parseNitAndDv(params.documentNumber);

  if (
    (!cleanName || cleanName.toLowerCase() === 'proveedor ocasional') &&
    !parsedNit.nit
  ) {
    return getOccasionalSupplier();
  }

  // 1. Buscar primero por NIT normalizado si existe
  if (parsedNit.nit) {
    const { data: byNit } = await db
      .from('suppliers')
      .select('*')
      .eq('nit_normalized', parsedNit.nit)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (byNit) {
      return byNit;
    }
  }

  // 2. Buscar por nombre con pg_trgm / coincidencia exacta
  if (cleanName) {
    const { data: byExactName } = await db
      .from('suppliers')
      .select('*')
      .ilike('name', cleanName)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (byExactName) {
      if (parsedNit.nit && !byExactName.nit_normalized) {
        const { data: updated } = await db
          .from('suppliers')
          .update({
            document_number: parsedNit.formatted,
            nit_normalized: parsedNit.nit,
            dv: parsedNit.dv,
          })
          .eq('id', byExactName.id)
          .select('*')
          .single();
        if (updated) return updated;
      }
      return byExactName;
    }

    const { data: trgmMatches } = await db.rpc('search_suppliers_smart', {
      p_query: cleanName,
      p_limit: 1,
    });
    const best = trgmMatches?.[0];
    if (best && best.score >= 0.85) {
      const { data: fullSupplier } = await db
        .from('suppliers')
        .select('*')
        .eq('id', best.id)
        .single();
      if (fullSupplier) return fullSupplier;
    }
  }

  // 3. Crear tercero sin usar jamás '000000000'
  const nitNorm = normalizeNitDigits(params.documentNumber);
  const { data: created, error } = await db
    .from('suppliers')
    .insert({
      name: cleanName || 'Proveedor Ocasional',
      document_number: nitNorm ? parsedNit.formatted : null,
      nit_normalized: nitNorm || null,
      dv: nitNorm ? parsedNit.dv : null,
      email: params.email?.trim() || null,
      phone: params.phone?.trim() || null,
      address: params.address?.trim() || null,
      is_active: true,
      is_occasional: false,
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error('Error creando tercero: ' + (error?.message || 'Desconocido'));
  }

  return created;
}
