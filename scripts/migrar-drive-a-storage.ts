import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function getEnv(content: string, key: string, alt?: string): string {
  const m = content.match(new RegExp(`^${key}=\\s*(\\S+)`, 'm'));
  if (m) return m[1];
  if (alt) {
    const m2 = content.match(new RegExp(`^${alt}=\\s*(\\S+)`, 'm'));
    if (m2) return m2[1];
  }
  return process.env[key] || '';
}

async function migrateDriveToStorage() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const supabaseUrl = getEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'project_url');
  const serviceKey = getEnv(env, 'SUPABASE_SERVICE_ROLE_KEY', 'Secret_key');
  const hasDriveCreds =
    Boolean(getEnv(env, 'GOOGLE_CLIENT_ID')) &&
    Boolean(getEnv(env, 'GOOGLE_CLIENT_SECRET')) &&
    Boolean(getEnv(env, 'GOOGLE_REFRESH_TOKEN'));

  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan credenciales de Supabase en .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Respaldo Sección C: Si faltan credenciales de Drive -> No migrar archivos de Drive; guardar el enlace en legacy_drive_url
  if (!hasDriveCreds) {
    console.log(
      'Aplicando respaldo Sección C: credenciales de Google Drive ausentes. Preservando enlaces históricos en legacy_drive_url.'
    );
  }

  const { data: pettyRows } = await supabase
    .from('petty_cash_entries')
    .select('id, receipt_url, legacy_drive_url')
    .not('receipt_url', 'is', null);

  let preservedPetty = 0;
  for (const row of pettyRows || []) {
    if (row.receipt_url?.includes('drive.google.com') && !row.legacy_drive_url) {
      await supabase
        .from('petty_cash_entries')
        .update({ legacy_drive_url: row.receipt_url })
        .eq('id', row.id);
      preservedPetty++;
    }
  }

  const { data: purchaseRows } = await supabase
    .from('purchases')
    .select('id, invoice_url, notes, legacy_drive_url');

  let preservedPurchases = 0;
  for (const row of purchaseRows || []) {
    const driveFromNotes = row.notes?.match(/https?:\/\/drive\.google\.com\/[^\s]+/)?.[0] || null;
    const driveUrl = row.invoice_url?.includes('drive.google.com')
      ? row.invoice_url
      : driveFromNotes;
    if (driveUrl && !row.legacy_drive_url) {
      await supabase
        .from('purchases')
        .update({ legacy_drive_url: driveUrl })
        .eq('id', row.id);
      preservedPurchases++;
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      hasDriveCreds,
      preservedPetty,
      preservedPurchases,
    })
  );
}

migrateDriveToStorage().catch((err) => {
  console.error(err);
  process.exit(1);
});
