import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const envPath = path.resolve(process.cwd(), '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=\s*(\S+)/) || env.match(/project_url=\s*(\S+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=\s*(\S+)/) || env.match(/Secret_key=\s*(\S+)/);

if (!urlMatch || !keyMatch) {
  console.error('No se encontraron las credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const privateDir = path.resolve(process.cwd(), '../kc-datos-privados');

const files = {
  pettyCash: path.join(privateDir, 'CAJAS MENORES JUNIO.xlsx'),
  purchases: {
    'Apto Bello': path.join(privateDir, 'COMPRAS APTO BELLO.xlsx'),
    'KC ASESORÍAS': path.join(privateDir, 'COMPRAS MEDELLIN KC ASESORIAS.xlsx'),
    'TOLÚ': path.join(privateDir, 'COMPRAS TOLU.xlsx'),
  },
};

const cleanStr = (str: unknown): string => {
  if (str === null || str === undefined) return '';
  if (typeof str === 'object' && 'result' in (str as Record<string, unknown>)) {
    return String((str as Record<string, unknown>).result ?? '').trim();
  }
  return String(str).trim();
};

const parseAmount = (val: unknown): number => {
  if (!val) return 0;
  const num = Number(cleanStr(val).replace(/[^0-9.-]+/g, ''));
  return Number.isNaN(num) ? 0 : num;
};

async function readSheetRows(filePath: string): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: unknown[][] = [];
  ws.eachRow((row) => {
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(vals);
  });
  return rows;
}

async function seedDatabase() {
  console.log('Verificando centros de costo y datos base (sin borrar datos existentes)...');
  const { data: existingCCs, error: ccErr } = await supabase.from('cost_centers').select('*');
  if (ccErr) throw ccErr;

  const ccMap: Record<string, string> = {};
  for (const cc of existingCCs || []) {
    ccMap[String(cc.name).toLowerCase()] = String(cc.id);
  }

  for (const [ccName, file] of Object.entries(files.purchases)) {
    if (!fs.existsSync(file)) continue;
    const rows = await readSheetRows(file);
    console.log(`Leídas ${rows.length} filas de ${path.basename(file)} para ${ccName} (id=${ccMap[ccName.toLowerCase()] ?? 'N/A'})`);
  }

  if (fs.existsSync(files.pettyCash)) {
    const pcRows = await readSheetRows(files.pettyCash);
    console.log(`Leídas ${pcRows.length} filas de ${path.basename(files.pettyCash)} (monto ej: ${parseAmount(pcRows[1]?.[8])})`);
  }
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Error en seed:', err);
    process.exit(1);
  });
}
