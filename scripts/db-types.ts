import fs from 'fs';
import path from 'path';

function getEnv(envContent: string, key: string, fallbackKey?: string): string {
  const m1 = envContent.match(new RegExp(`^${key}=\\s*(\\S+)`, 'm'));
  if (m1) return m1[1];
  if (fallbackKey) {
    const m2 = envContent.match(new RegExp(`^${fallbackKey}=\\s*(\\S+)`, 'm'));
    if (m2) return m2[1];
  }
  return process.env[key] || '';
}

async function generateDbTypes() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const supabaseUrl = getEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'project_url');
  const accessToken = getEnv(env, 'SUPABASE_ACCESS_TOKEN', 'Token');

  if (!supabaseUrl || !accessToken) {
    console.error('Faltan credenciales NEXT_PUBLIC_SUPABASE_URL o SUPABASE_ACCESS_TOKEN en .env.local');
    process.exit(1);
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/types/typescript`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Error generando tipos (${res.status}): ${errText}`);
    process.exit(1);
  }

  const payload = (await res.json()) as { types?: string };
  if (!payload.types) {
    console.error('Respuesta inválida al generar tipos de Supabase');
    process.exit(1);
  }

  const outPath = path.resolve(process.cwd(), 'types/database.ts');
  fs.writeFileSync(outPath, payload.types, 'utf8');
  console.log(`Tipos regenerados exitosamente en types/database.ts (${payload.types.length} bytes).`);
}

generateDbTypes().catch((err) => {
  console.error(err);
  process.exit(1);
});
