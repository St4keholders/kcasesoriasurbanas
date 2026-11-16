import { getServerDb, getAdminDb } from '@/lib/server/db';

export const SOPORTES_BUCKET = 'soportes';

export interface DuplicateSupportInfo {
  isDuplicate: boolean;
  sourceTable?: 'purchases' | 'petty_cash_entries';
  recordId?: string;
  storagePath?: string | null;
}

/**
 * Verifica si un archivo con el mismo hash SHA-256 ya fue cargado en compras o caja menor.
 */
export async function checkSupportSha256Duplicate(sha256: string): Promise<DuplicateSupportInfo> {
  const cleanHash = sha256.trim().toLowerCase();
  if (!cleanHash) return { isDuplicate: false };

  const db = await getServerDb();

  const { data: purchaseMatch } = await db
    .from('purchases')
    .select('id, support_storage_path')
    .eq('support_sha256', cleanHash)
    .neq('status', 'anulado')
    .limit(1)
    .maybeSingle();

  if (purchaseMatch) {
    return {
      isDuplicate: true,
      sourceTable: 'purchases',
      recordId: purchaseMatch.id,
      storagePath: purchaseMatch.support_storage_path,
    };
  }

  const { data: pettyMatch } = await db
    .from('petty_cash_entries')
    .select('id, support_storage_path')
    .eq('support_sha256', cleanHash)
    .neq('status', 'anulado')
    .limit(1)
    .maybeSingle();

  if (pettyMatch) {
    return {
      isDuplicate: true,
      sourceTable: 'petty_cash_entries',
      recordId: pettyMatch.id,
      storagePath: pettyMatch.support_storage_path,
    };
  }

  return { isDuplicate: false };
}

/**
 * Genera una URL firmada de subida directa (signed upload URL) en el bucket privado `soportes`.
 */
export async function createSupportSignedUploadUrl(params: {
  module: 'compras' | 'caja-menor' | 'ventas' | 'ingesta';
  filename: string;
  sha256: string;
}) {
  const admin = getAdminDb();
  const ext = (params.filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const yearMonth = new Date().toISOString().slice(0, 7);
  const storagePath = `${params.module}/${yearMonth}/${params.sha256.slice(0, 16)}-${Date.now()}.${ext}`;

  const duplicate = await checkSupportSha256Duplicate(params.sha256);

  const { data, error } = await admin.storage
    .from(SOPORTES_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(`No se pudo crear URL firmada de carga: ${error?.message || 'Desconocido'}`);
  }

  return {
    bucket: SOPORTES_BUCKET,
    path: storagePath,
    token: data.token,
    signedUrl: data.signedUrl,
    duplicate,
  };
}

/**
 * Genera una URL firmada temporal de lectura para ver o descargar un soporte privado.
 */
export async function createSupportSignedViewUrl(
  pathOrUrl: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // Si es un enlace externo (ej. Drive histórico o URL pública firmada)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const admin = getAdminDb();
  let bucket = SOPORTES_BUCKET;
  let objectPath = trimmed;

  if (trimmed.startsWith('petty-cash-receipts/')) {
    bucket = 'petty-cash-receipts';
    objectPath = trimmed.replace(/^petty-cash-receipts\//, '');
  } else if (trimmed.startsWith('soportes/')) {
    bucket = SOPORTES_BUCKET;
    objectPath = trimmed.replace(/^soportes\//, '');
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}
