import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getAdminDb } from '@/lib/server/db';
import { formatCOP, numberToSpanishWordsCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import type { OperationData } from './kc';

// Carta: 612 x 792 pt. Margen izquierdo 3.5 cm (99 pt) para perforar y archivar en AZ.
const W = 612;
const H = 792;
const ML = 99;
const MR = 36;
const CW = W - ML - MR;

const INK = rgb(0.08, 0.14, 0.2);
const SOFT = rgb(0.27, 0.37, 0.46);
const LINE = rgb(0.83, 0.89, 0.94);
const BAND = rgb(0.95, 0.97, 0.99);
const ACCENT = rgb(0.14, 0.36, 0.58);

interface Fonts {
  r: PDFFont;
  b: PDFFont;
}

export function clean(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function fit(text: string, font: PDFFont, size: number, max: number) {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > max) t = t.slice(0, -1);
  return t + '...';
}

function txt(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size = 9, color = INK) {
  page.drawText(clean(s), { x, y, size, font, color });
}

function right(page: PDFPage, s: string, xRight: number, y: number, font: PDFFont, size = 9, color = INK) {
  const t = clean(s);
  page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
}

function hr(page: PDFPage, y: number, color = LINE) {
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.6, color });
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente de revisión',
  aprobado: 'Aprobado',
  anulado: 'ANULADO',
};

const TYPE_LABEL: Record<string, string> = {
  CC: 'Comprobante de causación',
  CE: 'Comprobante de egreso',
  RC: 'Recibo de caja',
  NC: 'Nota de contabilidad',
};

function drawEntry(page: PDFPage, f: Fonts, entry: OperationData['entries'][number], yStart: number) {
  let y = yStart;
  // Título del comprobante
  txt(page, TYPE_LABEL[entry.entry_type] || entry.entry_type, ML, y, f.b, 10.5, ACCENT);
  right(page, `${entry.entry_number}  ·  ${formatDateCO(entry.entry_date)}  ·  ${STATUS_LABEL[entry.status] || entry.status}`, W - MR, y, f.r, 8.5, SOFT);
  y -= 16;

  // Encabezado de tabla
  const cCode = ML + 6;
  const cName = ML + 62;
  const cDebit = W - MR - 92;
  const cCredit = W - MR - 6;
  page.drawRectangle({ x: ML, y: y - 5, width: CW, height: 17, color: BAND });
  txt(page, 'CÓDIGO', cCode, y, f.b, 7.5, SOFT);
  txt(page, 'CUENTA / DETALLE', cName, y, f.b, 7.5, SOFT);
  right(page, 'DÉBITO', cDebit, y, f.b, 7.5, SOFT);
  right(page, 'CRÉDITO', cCredit, y, f.b, 7.5, SOFT);
  y -= 18;

  let d = 0;
  let c = 0;
  for (const l of entry.lines) {
    txt(page, l.account_code, cCode, y, f.b, 8.5);
    txt(page, fit(l.account_name, f.r, 8.5, cDebit - cName - 80), cName, y, f.r, 8.5);
    right(page, l.debit ? formatCOP(l.debit) : '', cDebit, y, f.r, 8.5);
    right(page, l.credit ? formatCOP(l.credit) : '', cCredit, y, f.r, 8.5);
    if (l.description) {
      y -= 10;
      txt(page, fit(l.description, f.r, 7, cDebit - cName - 80), cName, y, f.r, 7, SOFT);
    }
    d += l.debit;
    c += l.credit;
    y -= 14;
  }
  hr(page, y + 8);
  txt(page, 'Sumas iguales', cName, y - 3, f.b, 8.5);
  right(page, formatCOP(d), cDebit, y - 3, f.b, 8.5);
  right(page, formatCOP(c), cCredit, y - 3, f.b, 8.5);
  return y - 24;
}

/** Dibuja una operación (CC + CE en la misma hoja). Devuelve la página creada. */
export function drawOperationPage(pdf: PDFDocument, f: Fonts, op: OperationData, company: { name: string; nit: string }) {
  const page = pdf.addPage([W, H]);
  let y = H - 44;

  // Encabezado
  txt(page, company.name.toUpperCase(), ML, y, f.b, 13);
  const numbers = op.entries.map((e) => e.entry_number).join('  /  ');
  right(page, numbers, W - MR, y, f.b, 11, ACCENT);
  y -= 14;
  txt(page, `NIT ${company.nit}`, ML, y, f.r, 8.5, SOFT);
  right(page, `Fecha: ${formatDateCO(op.date)}`, W - MR, y, f.r, 8.5, SOFT);
  y -= 12;
  hr(page, y, ACCENT);
  y -= 18;

  // Datos de la operación (dos columnas)
  const col2 = ML + CW / 2 + 6;
  const row = (label: string, value: string, x: number, yy: number, max: number) => {
    txt(page, label, x, yy, f.b, 7.5, SOFT);
    txt(page, fit(value || '-', f.r, 9, max), x, yy - 11, f.r, 9);
  };
  row('TERCERO', `${op.supplier_name}${op.supplier_doc ? '  ·  NIT/CC ' + op.supplier_doc : ''}`, ML, y, CW / 2 - 10);
  row('CONCEPTO', op.concept, col2, y, CW / 2 - 6);
  y -= 30;
  row('CENTRO DE COSTO', op.cost_center || '-', ML, y, CW / 4);
  row('CATEGORÍA', op.category || '-', ML + CW / 4 + 4, y, CW / 4 - 8);
  row('FACTURA / DOC.', op.invoice_number || '-', col2, y, CW / 4);
  row('OPERACIÓN', op.number || '-', col2 + CW / 4, y, CW / 4 - 10);
  y -= 30;
  // Resumen de valores de la factura (mapeados, no calculados)
  page.drawRectangle({ x: ML, y: y - 8, width: CW, height: 24, color: BAND });
  const quarter = CW / 4;
  const vals: [string, number][] = [
    ['Base', op.base],
    ['IVA', op.iva],
    ['Retención', op.withholding],
    ['Total pagado', op.total],
  ];
  vals.forEach(([l, v], i) => {
    txt(page, l, ML + 8 + i * quarter, y + 4, f.r, 7.5, SOFT);
    txt(page, formatCOP(v), ML + 8 + i * quarter, y - 5, i === 3 ? f.b : f.r, 9);
  });
  y -= 34;

  for (const entry of op.entries) {
    if (y < 120) break;
    y = drawEntry(page, f, entry, y);
  }

  txt(page, `SON: ${numberToSpanishWordsCOP(op.total)}`, ML, y, f.b, 8.5);
  y -= 14;
  if (op.support && op.support.startsWith('http')) {
    txt(page, fit(`Soporte: ${op.support}`, f.r, 7, CW), ML, y, f.r, 7, SOFT);
  }

  right(page, `Generado ${formatDateCO(new Date())}`, W - MR, 24, f.r, 7, SOFT);
  return page;
}

function driveId(url: string) {
  return url.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1] || null;
}

async function fetchSupportBytes(support: string): Promise<{ bytes: Uint8Array; kind: 'pdf' | 'png' | 'jpg' } | null> {
  try {
    let bytes: Uint8Array | null = null;
    let hint = support.toLowerCase();
    if (support.startsWith('http')) {
      const id = driveId(support);
      if (!id) return null;
      const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, {
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (!res.ok) return null;
      hint = res.headers.get('content-type') || '';
      if (hint.includes('text/html')) return null; // archivo privado o vista previa
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      let bucket = 'soportes';
      let path = support.replace(/^\/api\/soportes\/view\?path=/, '');
      path = decodeURIComponent(path);
      if (path.startsWith('petty-cash-receipts/')) {
        bucket = 'petty-cash-receipts';
        path = path.replace(/^petty-cash-receipts\//, '');
      } else {
        path = path.replace(/^soportes\//, '');
      }
      const { data } = await getAdminDb().storage.from(bucket).download(path);
      if (!data) return null;
      hint = (data.type || '') + ' ' + path.toLowerCase();
      bytes = new Uint8Array(await data.arrayBuffer());
    }
    if (!bytes) return null;
    const head = Array.from(bytes.slice(0, 4));
    if (head[0] === 0x25 && head[1] === 0x50) return { bytes, kind: 'pdf' };
    if (head[0] === 0x89 && head[1] === 0x50) return { bytes, kind: 'png' };
    if (head[0] === 0xff && head[1] === 0xd8) return { bytes, kind: 'jpg' };
    if (hint.includes('pdf')) return { bytes, kind: 'pdf' };
    return null;
  } catch {
    return null;
  }
}

export async function appendSupport(pdf: PDFDocument, f: Fonts, op: OperationData) {
  if (!op.support) return;
  const file = await fetchSupportBytes(op.support);
  if (!file) return;
  try {
    if (file.kind === 'pdf') {
      const src = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
      const pages = await pdf.copyPages(src, src.getPageIndices());
      pages.forEach((p) => pdf.addPage(p));
      return;
    }
    const img = file.kind === 'png' ? await pdf.embedPng(file.bytes) : await pdf.embedJpg(file.bytes);
    const page = pdf.addPage([W, H]);
    txt(page, `Soporte · ${op.entries.map((e) => e.entry_number).join(' / ')} · ${op.supplier_name}`, ML, H - 36, f.r, 8, SOFT);
    const maxW = CW;
    const maxH = H - 80;
    const s = Math.min(maxW / img.width, maxH / img.height, 1);
    page.drawImage(img, { x: ML, y: H - 50 - img.height * s, width: img.width * s, height: img.height * s });
  } catch {
    // soporte ilegible: se omite sin romper el comprobante
  }
}

export async function newDoc() {
  const pdf = await PDFDocument.create();
  const f: Fonts = {
    r: await pdf.embedFont(StandardFonts.Helvetica),
    b: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  return { pdf, f };
}

/** Portada del archivo AZ: rango, totales, índice y firmas (solo aquí van las firmas). */
export function drawAzCover(
  pdf: PDFDocument,
  f: Fonts,
  params: {
    company: { name: string; nit: string };
    from: string;
    to: string;
    lot: string;
    ops: OperationData[];
    firmas: { elaboro: string; reviso: string; aprobo: string };
  }
) {
  let page = pdf.addPage([W, H]);
  let y = H - 60;
  txt(page, params.company.name.toUpperCase(), ML, y, f.b, 16);
  y -= 16;
  txt(page, `NIT ${params.company.nit}`, ML, y, f.r, 9, SOFT);
  y -= 34;
  txt(page, 'Archivo de comprobantes contables', ML, y, f.b, 20, ACCENT);
  y -= 20;
  txt(page, `Del ${formatDateCO(params.from)} al ${formatDateCO(params.to)}  ·  ${params.lot}`, ML, y, f.r, 10, SOFT);
  y -= 28;

  const total = params.ops.reduce((a, o) => a + o.total, 0);
  page.drawRectangle({ x: ML, y: y - 10, width: CW, height: 30, color: BAND });
  txt(page, `Operaciones: ${params.ops.length}`, ML + 10, y, f.b, 10);
  right(page, `Total pagado: ${formatCOP(total)}`, W - MR - 10, y, f.b, 10);
  y -= 40;

  // Firmas
  const boxW = (CW - 24) / 3;
  [['Elaboró', params.firmas.elaboro], ['Revisó', params.firmas.reviso], ['Aprobó', params.firmas.aprobo]].forEach(([l, n], i) => {
    const x = ML + i * (boxW + 12);
    page.drawLine({ start: { x, y: y - 40 }, end: { x: x + boxW, y: y - 40 }, thickness: 0.8, color: INK });
    txt(page, l, x, y - 52, f.b, 9);
    txt(page, fit(n || '', f.r, 8.5, boxW), x, y - 64, f.r, 8.5, SOFT);
  });
  y -= 100;

  // Índice
  txt(page, 'Índice', ML, y, f.b, 11);
  y -= 16;
  const header = () => {
    page.drawRectangle({ x: ML, y: y - 4, width: CW, height: 15, color: BAND });
    txt(page, 'COMPROBANTES', ML + 4, y, f.b, 7, SOFT);
    txt(page, 'FECHA', ML + 150, y, f.b, 7, SOFT);
    txt(page, 'TERCERO', ML + 205, y, f.b, 7, SOFT);
    right(page, 'TOTAL', W - MR - 4, y, f.b, 7, SOFT);
    y -= 15;
  };
  header();
  for (const op of params.ops) {
    if (y < 50) {
      page = pdf.addPage([W, H]);
      y = H - 50;
      header();
    }
    txt(page, op.entries.map((e) => e.entry_number).join(' / '), ML + 4, y, f.r, 7.5);
    txt(page, formatDateCO(op.date), ML + 150, y, f.r, 7.5);
    txt(page, fit(op.supplier_name, f.r, 7.5, CW - 205 - 80), ML + 205, y, f.r, 7.5);
    right(page, formatCOP(op.total), W - MR - 4, y, f.r, 7.5);
    y -= 11;
  }
}
