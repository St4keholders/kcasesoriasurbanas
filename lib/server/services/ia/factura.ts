import 'server-only';
import zlib from 'zlib';
import OpenAI from 'openai';
import { parseCOP } from '@/lib/utils/money';
import { parseNitAndDv, isKcNit } from '@/lib/utils/nit';

/**
 * Lectura de facturas para Tesorería y Caja menor.
 * - XML / ZIP de factura electrónica DIAN: lectura exacta, sin IA.
 * - Foto o PDF (con o sin texto): la IA lee el documento completo y llena los campos.
 * La IA solo MAPEA lo que dice la factura (IVA, retenciones, CUFE); no calcula impuestos.
 */

export interface ExtractedInvoice {
  document_type: string;
  cufe: string | null;
  supplier_name: string | null;
  supplier_nit: string | null;
  supplier_dv: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  concept: string | null;
  subtotal: number;
  tax_iva: number;
  withholding_tax: number;
  total: number;
  category_slug: string | null;
  cost_center_name: string | null;
  warnings: string[];
}

export interface CategoryOption {
  slug: string;
  name: string;
  ai_hint: string | null;
}

type ExtractedInvoiceStructured = Omit<ExtractedInvoice, 'category_slug' | 'cost_center_name' | 'warnings'>;

/**
 * Extrae el primer archivo .xml dentro de un archivo .zip en memoria (UBL 2.1 DIAN).
 */
export function extractXmlFromZipBuffer(zipBuffer: Buffer): string | null {
  let offset = 0;
  while (offset + 30 <= zipBuffer.length) {
    const signature = zipBuffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break; // Local file header signature

    const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
    const compressedSize = zipBuffer.readUInt32LE(offset + 18);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
    const extraFieldLength = zipBuffer.readUInt16LE(offset + 28);

    const fileName = zipBuffer
      .subarray(offset + 30, offset + 30 + fileNameLength)
      .toString('utf8');
    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (fileName.toLowerCase().endsWith('.xml') && dataEnd <= zipBuffer.length) {
      const slice = zipBuffer.subarray(dataStart, dataEnd);
      if (compressionMethod === 0) {
        return slice.toString('utf8');
      } else if (compressionMethod === 8) {
        return zlib.inflateRawSync(slice).toString('utf8');
      }
    }

    offset = dataEnd;
  }
  return null;
}

/**
 * Parsea directamente un XML de Factura Electrónica DIAN (UBL 2.1 / AttachedDocument) sin usar IA.
 */
export function parseDianXmlInvoice(xmlRaw: string): ExtractedInvoiceStructured {
  // Si es un AttachedDocument que contiene un CDATA con el <Invoice>, desenvolver el CDATA interior
  let xml = xmlRaw;
  const cdataMatch = xmlRaw.match(/<!\[CDATA\[([\s\S]*?<Invoice[\s\S]*?)\]\]>/i);
  if (cdataMatch && cdataMatch[1]) {
    xml = cdataMatch[1];
  }

  const cufe =
    xml.match(/<cbc:UUID[^>]*>([a-f0-9]{64,128})<\/cbc:UUID>/i)?.[1] || null;

  // Bloque del proveedor (<cac:AccountingSupplierParty> o <cac:SenderParty>)
  const supplierBlock =
    xml.match(/<cac:AccountingSupplierParty>([\s\S]*?)<\/cac:AccountingSupplierParty>/i)?.[1] ||
    xml.match(/<cac:SenderParty>([\s\S]*?)<\/cac:SenderParty>/i)?.[1] ||
    xml;

  const supplierName =
    supplierBlock
      .match(/<cbc:RegistrationName[^>]*>([\s\S]*?)<\/cbc:RegistrationName>/i)?.[1]
      ?.trim() ||
    supplierBlock.match(/<cbc:Name[^>]*>([\s\S]*?)<\/cbc:Name>/i)?.[1]?.trim() ||
    null;

  const companyIdMatch = supplierBlock.match(
    /<cbc:CompanyID([^>]*)>([\s\S]*?)<\/cbc:CompanyID>/i
  );
  let supplierNit: string | null = companyIdMatch?.[2]?.trim() || null;
  let supplierDv: string | null =
    companyIdMatch?.[1]?.match(/schemeID="(\d)"/i)?.[1] || null;

  if (supplierNit && isKcNit(supplierNit)) {
    supplierNit = null;
    supplierDv = null;
  } else if (supplierNit) {
    const parsed = parseNitAndDv(
      supplierDv ? `${supplierNit}-${supplierDv}` : supplierNit
    );
    supplierNit = parsed.nit || null;
    supplierDv = parsed.dv;
  }

  const invoiceNumber =
    xml.match(/<cbc:ParentDocumentID[^>]*>([\s\S]*?)<\/cbc:ParentDocumentID>/i)?.[1]?.trim() ||
    xml.match(/<Invoice[\s\S]*?<cbc:ID[^>]*>([\s\S]*?)<\/cbc:ID>/i)?.[1]?.trim() ||
    xml.match(/<cbc:ID[^>]*>([A-Z0-9-]+)<\/cbc:ID>/i)?.[1]?.trim() ||
    null;

  const issueDate =
    xml.match(/<cbc:IssueDate[^>]*>(\d{4}-\d{2}-\d{2})<\/cbc:IssueDate>/i)?.[1] ||
    null;

  const monetaryBlock =
    xml.match(/<cac:LegalMonetaryTotal>([\s\S]*?)<\/cac:LegalMonetaryTotal>/i)?.[1] || '';

  const lineExt = parseCOP(
    monetaryBlock.match(/<cbc:LineExtensionAmount[^>]*>([\d.,]+)<\/cbc:LineExtensionAmount>/i)?.[1]
  );
  const taxExcl = parseCOP(
    monetaryBlock.match(/<cbc:TaxExclusiveAmount[^>]*>([\d.,]+)<\/cbc:TaxExclusiveAmount>/i)?.[1]
  );
  const taxIncl = parseCOP(
    monetaryBlock.match(/<cbc:TaxInclusiveAmount[^>]*>([\d.,]+)<\/cbc:TaxInclusiveAmount>/i)?.[1]
  );
  const payable = parseCOP(
    monetaryBlock.match(/<cbc:PayableAmount[^>]*>([\d.,]+)<\/cbc:PayableAmount>/i)?.[1]
  );

  // Impuesto IVA (TaxScheme ID 01)
  const taxBlocks = Array.from(
    xml.matchAll(/<cac:TaxTotal>([\s\S]*?)<\/cac:TaxTotal>/gi)
  ).map((m) => m[1]);
  let taxIva = 0;
  for (const tb of taxBlocks) {
    if (/<cbc:ID[^>]*>01<\/cbc:ID>/i.test(tb) || /IVA/i.test(tb)) {
      const amt = parseCOP(
        tb.match(/<cbc:TaxAmount[^>]*>([\d.,]+)<\/cbc:TaxAmount>/i)?.[1]
      );
      taxIva += amt;
    }
  }

  // Retenciones (<cac:WithholdingTaxTotal>)
  const withholdingBlocks = Array.from(
    xml.matchAll(/<cac:WithholdingTaxTotal>([\s\S]*?)<\/cac:WithholdingTaxTotal>/gi)
  ).map((m) => m[1]);
  let withholdingTax = 0;
  for (const wb of withholdingBlocks) {
    const amt = parseCOP(
      wb.match(/<cbc:TaxAmount[^>]*>([\d.,]+)<\/cbc:TaxAmount>/i)?.[1]
    );
    withholdingTax += amt;
  }

  const subtotal = lineExt || taxExcl || Math.max(0, (taxIncl || payable) - taxIva);
  const total =
    withholdingTax > 0 && taxIncl > 0
      ? Math.max(0, subtotal + taxIva - withholdingTax)
      : payable || taxIncl || Math.max(0, subtotal + taxIva - withholdingTax);

  // Concepto a partir de las descripciones de los ítems (<cac:InvoiceLine> -> <cbc:Description>)
  const descriptions = Array.from(
    xml.matchAll(/<cac:Item>[\s\S]*?<cbc:Description[^>]*>([\s\S]*?)<\/cbc:Description>/gi)
  )
    .map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
    .filter(Boolean);

  const concept =
    descriptions.slice(0, 3).join('; ') ||
    `Factura electrónica ${invoiceNumber || ''}`.trim();

  return {
    document_type: 'factura_electronica',
    cufe,
    supplier_name: supplierName,
    supplier_nit: supplierNit,
    supplier_dv: supplierDv,
    invoice_number: invoiceNumber,
    issue_date: issueDate,
    concept,
    subtotal,
    tax_iva: taxIva,
    withholding_tax: withholdingTax,
    total,
  };
}

const DOC_TYPES = ['factura_electronica', 'tirilla_pos', 'cuenta_cobro', 'documento_soporte', 'comprobante_transferencia', 'recibo', 'otro'];

function buildSchema(categories: CategoryOption[], costCenters: string[]) {
  const num = { type: 'number' };
  const str = { type: ['string', 'null'] };
  return {
    name: 'factura_kc',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'document_type', 'cufe', 'supplier_name', 'supplier_nit', 'supplier_dv', 'invoice_number',
        'issue_date', 'concept', 'subtotal', 'tax_iva', 'withholding_tax', 'total', 'category_slug', 'cost_center_name',
      ],
      properties: {
        document_type: { type: 'string', enum: DOC_TYPES },
        cufe: str,
        supplier_name: str,
        supplier_nit: str,
        supplier_dv: str,
        invoice_number: str,
        issue_date: { type: ['string', 'null'], description: 'Fecha de la factura en formato YYYY-MM-DD' },
        concept: { type: ['string', 'null'], description: 'Qué se compró, en máximo 12 palabras' },
        subtotal: num,
        tax_iva: num,
        withholding_tax: num,
        total: num,
        category_slug: { type: 'string', enum: categories.map((c) => c.slug) },
        cost_center_name: { type: ['string', 'null'], enum: [...costCenters, null] },
      },
    },
  } as const;
}

function systemPrompt(categories: CategoryOption[], costCenters: string[]) {
  return [
    'Eres el auxiliar contable de KC Asesorías Urbanas S.A.S (NIT 902012620-0), Colombia.',
    'Lee la factura, tirilla, cuenta de cobro o comprobante de pago y devuelve SOLO lo que está escrito en el documento.',
    'Reglas:',
    '- El proveedor es quien VENDE o RECIBE el pago. Nunca uses el NIT 902012620 de KC como proveedor.',
    '- supplier_nit: solo dígitos, sin puntos ni dígito de verificación; supplier_dv: el dígito después del guion, si aparece.',
    '- Montos en pesos colombianos como número (1.250.000 = 1250000). subtotal = base antes de IVA.',
    '- tax_iva y withholding_tax: copia los valores que muestra el documento; si no aparecen, 0. No los calcules.',
    '- total = valor efectivamente pagado según el documento.',
    '- issue_date en formato YYYY-MM-DD. Las operaciones son de 2026: si el año se ve ambiguo o cortado, usa 2026.',
    '- Si no puedes leer un dato, devuélvelo en null (o 0 si es un valor). No inventes.',
    '- category_slug: elige la categoría que mejor describe el gasto:',
    ...categories.map((c) => `  · ${c.slug}: ${c.name}${c.ai_hint ? ' — ' + c.ai_hint : ''}`),
    '- Socios/accionistas: Andrea Vergara, Catalina Castaño y Edwart Mauricio Jaramillo. Sus sueldos → sueldo_accionistas; cualquier otro pago a ellos o gasto personal → personal_no_deducible.',
    `- cost_center_name: solo si el documento menciona claramente una obra (${costCenters.join(', ')}); si no, null.`,
  ].join('\n');
}

function normalizeExtracted(raw: ExtractedInvoiceStructured & { category_slug?: string | null; cost_center_name?: string | null }): ExtractedInvoice {
  const warnings: string[] = [];
  let nit: string | null = raw.supplier_nit ? String(raw.supplier_nit) : null;
  let dv: string | null = raw.supplier_dv ? String(raw.supplier_dv) : null;
  if (nit && isKcNit(nit)) {
    nit = null;
    dv = null;
  }
  if (nit) {
    const parsed = parseNitAndDv(dv ? `${nit}-${dv}` : nit);
    nit = parsed.nit || null;
    dv = parsed.dv ?? dv;
    if (dv && parsed.isValidDv === false) warnings.push('El dígito de verificación no coincide con el NIT.');
  }

  const subtotal = parseCOP(raw.subtotal);
  const iva = parseCOP(raw.tax_iva);
  const ret = parseCOP(raw.withholding_tax);
  let total = parseCOP(raw.total);
  if (!total && subtotal) total = subtotal + iva - ret;
  const base = subtotal || Math.max(0, total - iva + ret);
  if (Math.abs(base + iva - ret - total) > 1) warnings.push('Base + IVA − retención no da el total: revisa los valores.');
  if (!total) warnings.push('No se pudo leer el valor total.');

  let date = raw.issue_date && /^\d{4}-\d{2}-\d{2}$/.test(raw.issue_date) ? raw.issue_date : null;
  if (!date) warnings.push('No se pudo leer la fecha.');
  if (date && date < '2026-01-01') {
    date = `2026${date.slice(4)}`;
    warnings.push('El año de la factura se leyó anterior a 2026; se ajustó a 2026. Verifica.');
  }

  return {
    document_type: raw.document_type || 'otro',
    cufe: raw.cufe || null,
    supplier_name: raw.supplier_name?.trim() || null,
    supplier_nit: nit,
    supplier_dv: dv,
    invoice_number: raw.invoice_number?.trim() || null,
    issue_date: date,
    concept: raw.concept?.trim() || null,
    subtotal: base,
    tax_iva: iva,
    withholding_tax: ret,
    total,
    category_slug: raw.category_slug || null,
    cost_center_name: raw.cost_center_name || null,
    warnings,
  };
}

async function askModel(
  content: OpenAI.Chat.Completions.ChatCompletionContentPart[],
  categories: CategoryOption[],
  costCenters: string[]
): Promise<ExtractedInvoice> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL_OCR || 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_schema', json_schema: buildSchema(categories, costCenters) as any },
    messages: [
      { role: 'system', content: systemPrompt(categories, costCenters) },
      { role: 'user', content },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('La IA no devolvió datos.');
  return normalizeExtracted(JSON.parse(raw));
}

const EMPTY: ExtractedInvoice = {
  document_type: 'otro', cufe: null, supplier_name: null, supplier_nit: null, supplier_dv: null,
  invoice_number: null, issue_date: null, concept: null, subtotal: 0, tax_iva: 0, withholding_tax: 0,
  total: 0, category_slug: null, cost_center_name: null, warnings: [],
};

export async function extractInvoice(params: {
  bytes: Buffer;
  mimeType: string;
  filename: string;
  categories: CategoryOption[];
  costCenters: string[];
}): Promise<ExtractedInvoice> {
  const name = params.filename.toLowerCase();
  const mime = params.mimeType || '';
  const hasAi = Boolean(process.env.OPENAI_API_KEY);

  // 1. Factura electrónica XML / ZIP → lectura exacta
  let xml: string | null = null;
  if (name.endsWith('.xml') || mime.includes('xml')) xml = params.bytes.toString('utf8');
  else if (name.endsWith('.zip') || mime.includes('zip')) xml = extractXmlFromZipBuffer(params.bytes);

  if (xml) {
    const parsed = normalizeExtracted({ ...parseDianXmlInvoice(xml), category_slug: null, cost_center_name: null });
    if (hasAi) {
      try {
        const cat = await askModel(
          [{ type: 'text', text: `Clasifica esta compra. Proveedor: ${parsed.supplier_name}. Concepto: ${parsed.concept}. Total: ${parsed.total}. Devuelve los mismos datos y elige category_slug.` }],
          params.categories,
          params.costCenters
        );
        parsed.category_slug = cat.category_slug;
        parsed.cost_center_name = cat.cost_center_name;
      } catch {
        // la clasificación es opcional; el auxiliar la escoge
      }
    }
    return parsed;
  }

  if (!hasAi) {
    return { ...EMPTY, warnings: ['La lectura automática no está configurada (falta OPENAI_API_KEY). Llena los campos a mano.'] };
  }

  const b64 = params.bytes.toString('base64');
  if (mime.startsWith('image/')) {
    return askModel([{ type: 'image_url', image_url: { url: `data:${mime};base64,${b64}`, detail: 'high' } }], params.categories, params.costCenters);
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return askModel(
      [{ type: 'file', file: { filename: params.filename, file_data: `data:application/pdf;base64,${b64}` } }],
      params.categories,
      params.costCenters
    );
  }
  return { ...EMPTY, warnings: ['Formato no soportado. Usa foto, PDF, XML o ZIP.'] };
}
