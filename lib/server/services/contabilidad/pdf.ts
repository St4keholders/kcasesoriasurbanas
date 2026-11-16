import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { getServerDb, getAdminDb } from '@/lib/server/db';
import { formatCOP, numberToSpanishWordsCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';

// Tamaño Carta (US Letter): 612 x 792 pt. Margen izquierdo 3.5 cm = 99.21 pt para perforación AZ.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN_AZ = 99.21; // 3.5 cm exactos
const RIGHT_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN_AZ - RIGHT_MARGIN;

export interface ComprobanteFullData {
  id: string;
  entry_number: string;
  entry_type: string;
  entry_date: string;
  status: string;
  concept: string;
  total_debit: number;
  total_credit: number;
  support_url: string | null;
  elaboro_name: string;
  reviso_name: string;
  aprobo_name: string;
  linked_entry?: { id: string; entry_number: string; entry_type: string } | null;
  third_party?: { name: string; document_number: string | null } | null;
  cost_center?: { name: string } | null;
  lines: Array<{
    line_order: number;
    account_code: string;
    account_name: string;
    cost_center_name: string;
    description: string;
    debit: number;
    credit: number;
  }>;
}

function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

async function tryAppendSupportToPdf(pdfDoc: PDFDocument, supportUrl: string | null) {
  if (!supportUrl) return;
  try {
    let storageBucket = 'soportes';
    let objectPath = '';

    if (supportUrl.includes('/api/soportes/view?path=')) {
      const urlObj = new URL(supportUrl, 'http://localhost');
      const rawPath = decodeURIComponent(urlObj.searchParams.get('path') || '');
      if (rawPath.startsWith('petty-cash-receipts/')) {
        storageBucket = 'petty-cash-receipts';
        objectPath = rawPath.replace(/^petty-cash-receipts\//, '');
      } else {
        storageBucket = 'soportes';
        objectPath = rawPath.replace(/^soportes\//, '');
      }
    } else if (!supportUrl.startsWith('http')) {
      objectPath = supportUrl.replace(/^soportes\//, '');
    }

    if (!objectPath) return;

    const admin = getAdminDb();
    const { data: blob, error } = await admin.storage.from(storageBucket).download(objectPath);
    if (error || !blob) return;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const lower = objectPath.toLowerCase();

    if (lower.endsWith('.pdf')) {
      const attachmentPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copiedPages = await pdfDoc.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
      for (const p of copiedPages) {
        pdfDoc.addPage(p);
      }
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
      const img = lower.endsWith('.png')
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const maxW = CONTENT_WIDTH;
      const maxH = PAGE_HEIGHT - 120;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      page.drawImage(img, {
        x: LEFT_MARGIN_AZ + (maxW - drawW) / 2,
        y: PAGE_HEIGHT - 70 - drawH,
        width: drawW,
        height: drawH,
      });
    }
  } catch {
    // Si el anexo es un enlace externo o falla su lectura, no bloquea el comprobante
  }
}

export async function renderVoucherToPdfDoc(
  pdfDoc: PDFDocument,
  voucher: ComprobanteFullData,
  company: { company_name: string; company_nit: string },
  folioNumber?: number
) {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Marca de agua BORRADOR o ANULADO cuando aplique
  if (voucher.status === 'borrador' || voucher.status === 'anulado') {
    const watermarkText = voucher.status === 'borrador' ? 'BORRADOR' : 'ANULADO';
    page.drawText(watermarkText, {
      x: LEFT_MARGIN_AZ + 65,
      y: 260,
      size: 68,
      font: fontBold,
      color:
        voucher.status === 'borrador'
          ? rgb(0.86, 0.9, 0.94)
          : rgb(0.95, 0.82, 0.82),
      rotate: degrees(38),
      opacity: 0.45,
    });
  }

  // Guía sutil de margen AZ (3.5 cm)
  page.drawLine({
    start: { x: LEFT_MARGIN_AZ - 12, y: 36 },
    end: { x: LEFT_MARGIN_AZ - 12, y: PAGE_HEIGHT - 36 },
    thickness: 0.5,
    color: rgb(0.82, 0.88, 0.93),
  });

  let y = PAGE_HEIGHT - 48;

  // Encabezado con razón social, NIT, número y fecha
  page.drawText(sanitizePdfText(company.company_name.toUpperCase()), {
    x: LEFT_MARGIN_AZ,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.24),
  });

  page.drawText(sanitizePdfText(voucher.entry_number), {
    x: PAGE_WIDTH - RIGHT_MARGIN - 135,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.11, 0.38, 0.62),
  });

  y -= 15;
  page.drawText(`NIT: ${sanitizePdfText(company.company_nit)}`, {
    x: LEFT_MARGIN_AZ,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.35, 0.45, 0.55),
  });

  const typeLabel =
    voucher.entry_type === 'CC'
      ? 'COMPROBANTE DE CAUSACIÓN'
      : voucher.entry_type === 'CE'
      ? 'COMPROBANTE DE EGRESO'
      : voucher.entry_type === 'RC'
      ? 'RECIBO DE CAJA'
      : 'NOTA CONTABLE';

  page.drawText(typeLabel, {
    x: PAGE_WIDTH - RIGHT_MARGIN - 135,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.35, 0.45, 0.55),
  });

  y -= 14;
  page.drawText(`Fecha: ${sanitizePdfText(formatDateCO(voucher.entry_date))}   |   Estado: ${voucher.status.toUpperCase()}`, {
    x: LEFT_MARGIN_AZ,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.25, 0.35, 0.45),
  });

  if (folioNumber !== undefined) {
    page.drawText(`Folio AZ #${String(folioNumber).padStart(4, '0')}`, {
      x: PAGE_WIDTH - RIGHT_MARGIN - 135,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.25, 0.35, 0.45),
    });
  }

  y -= 12;
  page.drawLine({
    start: { x: LEFT_MARGIN_AZ, y },
    end: { x: PAGE_WIDTH - RIGHT_MARGIN, y },
    thickness: 1.2,
    color: rgb(0.22, 0.52, 0.78),
  });

  // Bloque Tercero, Concepto y Comprobante Enlazado
  y -= 20;
  const tpName = sanitizePdfText(voucher.third_party?.name || 'Proveedor Ocasional');
  const tpDoc = sanitizePdfText(voucher.third_party?.document_number || 'Sin NIT registrado');

  page.drawText('Tercero:', {
    x: LEFT_MARGIN_AZ,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.25, 0.35, 0.45),
  });
  page.drawText(`${tpName} (${tpDoc})`, {
    x: LEFT_MARGIN_AZ + 58,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.08, 0.16, 0.24),
  });

  y -= 15;
  page.drawText('Concepto:', {
    x: LEFT_MARGIN_AZ,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.25, 0.35, 0.45),
  });
  page.drawText(sanitizePdfText(voucher.concept).slice(0, 82), {
    x: LEFT_MARGIN_AZ + 58,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.08, 0.16, 0.24),
  });

  y -= 15;
  const linkedText = voucher.linked_entry
    ? `${voucher.linked_entry.entry_number} (${voucher.linked_entry.entry_type})`
    : 'No aplica';
  page.drawText('Comprobante enlazado:', {
    x: LEFT_MARGIN_AZ,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.25, 0.35, 0.45),
  });
  page.drawText(sanitizePdfText(linkedText), {
    x: LEFT_MARGIN_AZ + 110,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.11, 0.38, 0.62),
  });

  // Tabla de líneas contables
  y -= 22;
  page.drawRectangle({
    x: LEFT_MARGIN_AZ,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.93, 0.96, 0.99),
  });

  const colCodeX = LEFT_MARGIN_AZ + 4;
  const colAccX = LEFT_MARGIN_AZ + 52;
  const colCcX = LEFT_MARGIN_AZ + 235;
  const colDebX = LEFT_MARGIN_AZ + 325;
  const colCredX = LEFT_MARGIN_AZ + 402;

  page.drawText('CÓDIGO', { x: colCodeX, y, size: 8, font: fontBold, color: rgb(0.15, 0.25, 0.35) });
  page.drawText('CUENTA CONTABLE', { x: colAccX, y, size: 8, font: fontBold, color: rgb(0.15, 0.25, 0.35) });
  page.drawText('CENTRO COSTO', { x: colCcX, y, size: 8, font: fontBold, color: rgb(0.15, 0.25, 0.35) });
  page.drawText('DÉBITO', { x: colDebX, y, size: 8, font: fontBold, color: rgb(0.15, 0.25, 0.35) });
  page.drawText('CRÉDITO', { x: colCredX, y, size: 8, font: fontBold, color: rgb(0.15, 0.25, 0.35) });

  y -= 18;
  for (const line of voucher.lines) {
    if (y < 180) break;
    page.drawText(sanitizePdfText(line.account_code), {
      x: colCodeX,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.18, 0.26),
    });
    page.drawText(sanitizePdfText(line.account_name).slice(0, 34), {
      x: colAccX,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.18, 0.26),
    });
    page.drawText(sanitizePdfText(line.cost_center_name || 'Medellín').slice(0, 16), {
      x: colCcX,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.4, 0.5),
    });
    page.drawText(sanitizePdfText(formatCOP(line.debit)), {
      x: colDebX,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.18, 0.26),
    });
    page.drawText(sanitizePdfText(formatCOP(line.credit)), {
      x: colCredX,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.18, 0.26),
    });

    y -= 14;
    page.drawLine({
      start: { x: LEFT_MARGIN_AZ, y: y + 4 },
      end: { x: PAGE_WIDTH - RIGHT_MARGIN, y: y + 4 },
      thickness: 0.4,
      color: rgb(0.88, 0.92, 0.96),
    });
  }

  // Totales y valor en letras
  y -= 8;
  page.drawRectangle({
    x: LEFT_MARGIN_AZ,
    y: y - 6,
    width: CONTENT_WIDTH,
    height: 20,
    color: rgb(0.95, 0.97, 1),
  });

  page.drawText('SUMAS IGUALES:', {
    x: colCcX - 10,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.24),
  });
  page.drawText(sanitizePdfText(formatCOP(voucher.total_debit)), {
    x: colDebX,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.24),
  });
  page.drawText(sanitizePdfText(formatCOP(voucher.total_credit)), {
    x: colCredX,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.24),
  });

  y -= 24;
  const words = numberToSpanishWordsCOP(voucher.total_debit);
  page.drawText(`SON: ${sanitizePdfText(words)}`, {
    x: LEFT_MARGIN_AZ,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.2, 0.3, 0.4),
  });

  // Bloque de firmas (Sección B): Elaboró (automático), Revisó (con línea), Aprobó (con línea)
  const sigY = 95;
  const boxW = (CONTENT_WIDTH - 24) / 3;

  // 1. Elaboró
  page.drawLine({
    start: { x: LEFT_MARGIN_AZ, y: sigY },
    end: { x: LEFT_MARGIN_AZ + boxW, y: sigY },
    thickness: 0.8,
    color: rgb(0.3, 0.4, 0.5),
  });
  page.drawText(sanitizePdfText(voucher.elaboro_name || 'Sistema KC'), {
    x: LEFT_MARGIN_AZ + 4,
    y: sigY + 6,
    size: 8.5,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.35),
  });
  page.drawText('ELABORÓ (Automático)', {
    x: LEFT_MARGIN_AZ + 4,
    y: sigY - 12,
    size: 7.5,
    font: fontBold,
    color: rgb(0.35, 0.45, 0.55),
  });

  // 2. Revisó (con línea para firma a mano)
  const revX = LEFT_MARGIN_AZ + boxW + 12;
  page.drawLine({
    start: { x: revX, y: sigY },
    end: { x: revX + boxW, y: sigY },
    thickness: 0.8,
    color: rgb(0.3, 0.4, 0.5),
  });
  page.drawText(`REVISÓ: ${sanitizePdfText(voucher.reviso_name || 'Contador')}`, {
    x: revX + 4,
    y: sigY - 12,
    size: 7.5,
    font: fontBold,
    color: rgb(0.35, 0.45, 0.55),
  });

  // 3. Aprobó (con línea para firma a mano)
  const aprX = LEFT_MARGIN_AZ + (boxW + 12) * 2;
  page.drawLine({
    start: { x: aprX, y: sigY },
    end: { x: aprX + boxW, y: sigY },
    thickness: 0.8,
    color: rgb(0.3, 0.4, 0.5),
  });
  page.drawText(`APROBÓ: ${sanitizePdfText(voucher.aprobo_name || 'Representante legal')}`, {
    x: aprX + 4,
    y: sigY - 12,
    size: 7.5,
    font: fontBold,
    color: rgb(0.35, 0.45, 0.55),
  });

  // Soportes anexos como páginas siguientes
  await tryAppendSupportToPdf(pdfDoc, voucher.support_url);
}

export async function loadVoucherFullData(
  idOrSourceId: string,
  sourceType?: string | null
): Promise<{
  vouchers: ComprobanteFullData[];
  company: { company_name: string; company_nit: string };
}> {
  const db = await getServerDb();

  const [accRes, ccRes, setRes] = await Promise.all([
    db.from('chart_of_accounts').select('code, name'),
    db.from('cost_centers').select('id, name'),
    db.from('accounting_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const accNameMap = new Map<string, string>();
  for (const a of accRes.data || []) accNameMap.set(a.code, a.name);

  const ccNameMap = new Map<string, string>();
  for (const c of ccRes.data || []) ccNameMap.set(c.id, c.name);

  let entriesQuery = db
    .from('journal_entries')
    .select('*, third_parties(name, document_number), cost_centers(name), journal_lines(*)')
    .order('entry_type', { ascending: true });

  if (sourceType === 'purchase') {
    entriesQuery = entriesQuery.eq('source_table', 'purchases').eq('source_id', idOrSourceId);
  } else if (sourceType === 'petty_cash_entry') {
    entriesQuery = entriesQuery
      .eq('source_table', 'petty_cash_entries')
      .eq('source_id', idOrSourceId);
  } else if (sourceType === 'petty_cash_box') {
    const { data: boxEntries } = await db
      .from('petty_cash_entries')
      .select('id')
      .eq('box_id', idOrSourceId);
    const ids = (boxEntries || []).map((b) => b.id);
    entriesQuery = entriesQuery
      .eq('source_table', 'petty_cash_entries')
      .in('source_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);
  } else {
    entriesQuery = entriesQuery.eq('id', idOrSourceId);
  }

  const { data: rawEntries } = await entriesQuery;
  const entries = rawEntries || [];

  const linkedIds = entries
    .map((e) => e.linked_entry_id)
    .filter((x): x is string => Boolean(x));

  const linkedMap = new Map<string, { id: string; entry_number: string; entry_type: string }>();
  if (linkedIds.length > 0) {
    const { data: linkedRows } = await db
      .from('journal_entries')
      .select('id, entry_number, entry_type')
      .in('id', linkedIds);
    for (const lr of linkedRows || []) {
      linkedMap.set(lr.id, lr);
    }
  }

  const vouchers: ComprobanteFullData[] = entries.map((e) => {
    const rawLines = (e.journal_lines || []) as Array<{
      line_order: number;
      account_code: string;
      cost_center_id: string | null;
      description: string | null;
      debit: number;
      credit: number;
    }>;

    const sortedLines = [...rawLines].sort((a, b) => a.line_order - b.line_order);

    return {
      id: e.id,
      entry_number: e.entry_number,
      entry_type: e.entry_type,
      entry_date: e.entry_date,
      status: e.status,
      concept: e.concept,
      total_debit: Number(e.total_debit) || 0,
      total_credit: Number(e.total_credit) || 0,
      support_url: e.support_url,
      elaboro_name: e.elaboro_name,
      reviso_name: e.reviso_name,
      aprobo_name: e.aprobo_name,
      linked_entry: e.linked_entry_id ? linkedMap.get(e.linked_entry_id) || null : null,
      third_party: e.third_parties as { name: string; document_number: string | null } | null,
      cost_center: e.cost_centers as { name: string } | null,
      lines: sortedLines.map((l) => ({
        line_order: l.line_order,
        account_code: l.account_code,
        account_name: accNameMap.get(l.account_code) || l.account_code,
        cost_center_name:
          (l.cost_center_id ? ccNameMap.get(l.cost_center_id) : null) ||
          (e.cost_centers as { name: string } | null)?.name ||
          'Medellín',
        description: l.description || e.concept,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    };
  });

  return {
    vouchers,
    company: {
      company_name: setRes.data?.company_name || 'KC Asesorías Urbanas S.A.S',
      company_nit: setRes.data?.company_nit || '902012620-0',
    },
  };
}
