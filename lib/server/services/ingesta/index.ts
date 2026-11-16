import zlib from 'zlib';
import { z } from 'zod';
import OpenAI from 'openai';
import { getServerDb } from '@/lib/server/db';
import { parseNitAndDv, isKcNit, validateNitWithDv } from '@/lib/utils/nit';
import { parseCOP } from '@/lib/utils/money';
import { validateAccountingDate2026 } from '@/lib/utils/dates';
import {
  loadClassifierContext,
  ensureDraftEntriesForPurchase,
} from '@/lib/server/services/contabilidad';
import { classifyTransaction } from '@/lib/server/services/ia/clasificador';
import {
  resolveOrCreateSupplier,
  getOccasionalSupplier,
} from '@/lib/server/services/terceros';

export const ExtractedInvoiceStructuredSchema = z.object({
  document_type: z
    .enum([
      'factura_electronica',
      'documento_soporte',
      'tirilla_pos',
      'cuenta_cobro',
      'recibo_caja_menor',
      'otro',
    ])
    .default('factura_electronica'),
  cufe: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  supplier_nit: z.string().nullable().optional(),
  supplier_dv: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  concept: z.string().nullable().optional(),
  subtotal: z.number().default(0),
  tax_iva: z.number().default(0),
  withholding_tax: z.number().default(0),
  total: z.number().default(0),
});

export type ExtractedInvoiceStructured = z.infer<typeof ExtractedInvoiceStructuredSchema>;

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

/**
 * Extrae datos de texto plano de un PDF (buscando CUFE, NIT distinto al de KC, fechas y valores).
 */
export function parseInvoiceFromText(rawText: string, filename = ''): ExtractedInvoiceStructured {
  const cufe = rawText.match(/\b([a-f0-9]{96})\b/i)?.[1] || null;

  const nitMatches = Array.from(
    rawText.matchAll(/\b(?:NIT|CC|DOC)[:\s.]*([0-9.]{6,13}(?:-\d)?)\b/gi)
  ).map((m) => m[1]);

  let supplierNit: string | null = null;
  let supplierDv: string | null = null;
  for (const rawCandidate of nitMatches) {
    if (!isKcNit(rawCandidate)) {
      const parsed = parseNitAndDv(rawCandidate);
      if (parsed.nit) {
        supplierNit = parsed.nit;
        supplierDv = parsed.dv;
        break;
      }
    }
  }

  const dateMatch = rawText.match(/\b(202\d-\d{2}-\d{2})\b/)?.[1] || null;
  const invMatch =
    rawText.match(/\b(?:Factura|No\.|Nro\.|FE)[:\s-]*([A-Z]{0,4}-?\d{2,10})\b/i)?.[1] ||
    filename.replace(/\.[^/.]+$/, '');

  const totalMatch = rawText.match(/(?:TOTAL A PAGAR|VALOR TOTAL|TOTAL)[:\s$]*([\d.,]{4,16})/i)?.[1];
  const ivaMatch = rawText.match(/(?:IVA|IMPUESTO)[:\s$]*([\d.,]{3,15})/i)?.[1];
  const subMatch = rawText.match(/(?:SUBTOTAL|BASE)[:\s$]*([\d.,]{4,16})/i)?.[1];

  const total = parseCOP(totalMatch);
  const taxIva = parseCOP(ivaMatch);
  const subtotal = subMatch ? parseCOP(subMatch) : Math.max(0, total - taxIva);

  return {
    document_type: cufe ? 'factura_electronica' : 'otro',
    cufe,
    supplier_name: null,
    supplier_nit: supplierNit,
    supplier_dv: supplierDv,
    invoice_number: invMatch,
    issue_date: dateMatch,
    concept: `Documento procesado: ${filename}`,
    subtotal,
    tax_iva: taxIva,
    withholding_tax: 0,
    total,
  };
}

export interface IngestionValidationResult {
  warnings: string[];
  hasBlockingZeroWarning: boolean;
  isDuplicate: boolean;
  isValidDv: boolean;
}

/**
 * Validaciones de Fase 6B:
 * - base + IVA − retenciones ≈ total (±1 peso)
 * - DV válido
 * - fecha no futura y dentro de 2026
 * - duplicados (sha256 / NIT + número / NIT + fecha + total)
 * - total en $0 -> advertencias (nunca guardar en $0 sin revisión)
 * - proveedor no identificado -> advertencia "identificar tercero"
 */
export async function validateExtractedInvoice(params: {
  sha256: string;
  extracted: ExtractedInvoiceStructured;
}): Promise<IngestionValidationResult> {
  const warnings: string[] = [];
  const { extracted, sha256 } = params;

  const expectedTotal =
    Number(extracted.subtotal || 0) +
    Number(extracted.tax_iva || 0) -
    Number(extracted.withholding_tax || 0);
  const actualTotal = Number(extracted.total || 0);

  if (Math.abs(expectedTotal - actualTotal) > 1) {
    warnings.push(
      `Descuadre aritmético: Base ($${extracted.subtotal}) + IVA ($${extracted.tax_iva}) − Retenciones ($${extracted.withholding_tax}) = $${expectedTotal} ≠ Total ($${actualTotal}).`
    );
  }

  let hasBlockingZeroWarning = false;
  if (actualTotal <= 0) {
    hasBlockingZeroWarning = true;
    warnings.push('Total en $0: requiere revisión obligatoria (nunca se guarda en $0 sin revisión).');
  }

  let isValidDv = false;
  if (!extracted.supplier_nit && (!extracted.supplier_name || extracted.supplier_name === 'Proveedor Ocasional')) {
    warnings.push('identificar tercero');
  } else if (extracted.supplier_nit) {
    if (extracted.supplier_dv) {
      isValidDv = validateNitWithDv(extracted.supplier_nit, extracted.supplier_dv);
      if (!isValidDv) {
        warnings.push(
          `Dígito de verificación inválido para NIT ${extracted.supplier_nit}-${extracted.supplier_dv}.`
        );
      }
    } else {
      warnings.push(`El NIT ${extracted.supplier_nit} no especifica dígito de verificación (DV).`);
    }
  } else {
    warnings.push('identificar tercero');
  }

  const dateValidation = validateAccountingDate2026(extracted.issue_date);
  if (!dateValidation.valid && dateValidation.reason) {
    warnings.push(dateValidation.reason);
  }

  // Verificar duplicados en BD (sha256, NIT + número, NIT + fecha + total)
  const db = await getServerDb();
  let isDuplicate = false;

  const { data: shaMatch } = await db
    .from('purchases')
    .select('id, purchase_number')
    .eq('support_sha256', sha256)
    .neq('status', 'anulado')
    .limit(1)
    .maybeSingle();

  if (shaMatch) {
    isDuplicate = true;
    warnings.push(`Posible duplicado por archivo idéntico (SHA-256) en compra ${shaMatch.purchase_number}.`);
  }

  if (extracted.supplier_nit) {
    const { data: tp } = await db
      .from('third_parties')
      .select('id')
      .eq('nit_normalized', extracted.supplier_nit)
      .limit(1)
      .maybeSingle();

    if (tp) {
      if (extracted.invoice_number) {
        const { data: invDup } = await db
          .from('purchases')
          .select('id, purchase_number')
          .eq('third_party_id', tp.id)
          .ilike('invoice_number', extracted.invoice_number.trim())
          .neq('status', 'anulado')
          .limit(1)
          .maybeSingle();

        if (invDup) {
          isDuplicate = true;
          warnings.push(
            `Posible duplicado por (NIT + número de factura ${extracted.invoice_number}) en ${invDup.purchase_number}.`
          );
        }
      }

      if (extracted.issue_date && actualTotal > 0) {
        const { data: dateTotalDup } = await db
          .from('purchases')
          .select('id, purchase_number')
          .eq('third_party_id', tp.id)
          .eq('transaction_date', extracted.issue_date)
          .eq('total', actualTotal)
          .neq('status', 'anulado')
          .limit(1)
          .maybeSingle();

        if (dateTotalDup) {
          isDuplicate = true;
          warnings.push(
            `Posible duplicado por (NIT + fecha + valor total) en ${dateTotalDup.purchase_number}.`
          );
        }
      }
    }
  }

  return {
    warnings,
    hasBlockingZeroWarning,
    isDuplicate,
    isValidDv,
  };
}

/**
 * Procesa un documento recién subido a Storage, ejecuta validaciones y el clasificador 6A,
 * guarda en document_ingestions y, si el total > $0 y no es duplicado, crea la compra + CC + CE en borrador.
 */
export async function ingestDocumentService(params: {
  userId: string;
  storagePath: string;
  sha256: string;
  filename: string;
  mimeType: string;
  costCenterId?: string | null;
  rawTextOrXml?: string | null;
}) {
  const db = await getServerDb();

  let extracted: ExtractedInvoiceStructured;
  const lowerName = params.filename.toLowerCase();

  if (
    params.rawTextOrXml &&
    (lowerName.endsWith('.xml') || params.rawTextOrXml.trim().startsWith('<'))
  ) {
    extracted = parseDianXmlInvoice(params.rawTextOrXml);
  } else if (params.rawTextOrXml) {
    extracted = parseInvoiceFromText(params.rawTextOrXml, params.filename);
  } else if (process.env.OPENAI_API_KEY && params.mimeType.startsWith('image/')) {
    // Si hay OPENAI_API_KEY, se puede invocar visión
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.AI_MODEL_OCR || 'gpt-4o';
    const viewUrl = `/api/soportes/view?path=${encodeURIComponent(params.storagePath)}`;
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extrae JSON con: document_type, cufe, supplier_name, supplier_nit, supplier_dv, invoice_number, issue_date (YYYY-MM-DD), concept, subtotal, tax_iva, withholding_tax, total. Excluye siempre el NIT 902012620-0 de KC Asesorías Urbanas.',
          },
          {
            role: 'user',
            content: `Archivo: ${params.filename} (${viewUrl})`,
          },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      extracted = content
        ? ExtractedInvoiceStructuredSchema.parse(JSON.parse(content))
        : parseInvoiceFromText('', params.filename);
    } catch {
      extracted = parseInvoiceFromText('', params.filename);
    }
  } else {
    extracted = parseInvoiceFromText('', params.filename);
  }

  // Excluir NIT de KC si por error vino como proveedor
  if (isKcNit(extracted.supplier_nit)) {
    extracted.supplier_nit = null;
    extracted.supplier_dv = null;
  }

  const validation = await validateExtractedInvoice({
    sha256: params.sha256,
    extracted,
  });

  // Resolver tercero (si no está identificado -> Proveedor Ocasional)
  let thirdPartyId: string | null = null;
  let resolvedSupplierName = extracted.supplier_name || 'Proveedor Ocasional';

  if (extracted.supplier_nit || (extracted.supplier_name && extracted.supplier_name.trim() !== '')) {
    const supp = await resolveOrCreateSupplier({
      name: extracted.supplier_name || 'Proveedor Ocasional',
      documentNumber: extracted.supplier_nit
        ? extracted.supplier_dv
          ? `${extracted.supplier_nit}-${extracted.supplier_dv}`
          : extracted.supplier_nit
        : null,
    });
    thirdPartyId = supp.id;
    resolvedSupplierName = supp.name;
  } else {
    const occ = await getOccasionalSupplier();
    thirdPartyId = occ.id;
    resolvedSupplierName = 'Proveedor Ocasional';
  }

  const { ctx } = await loadClassifierContext();
  let costCenterName = 'Medellín';
  if (params.costCenterId) {
    const { data: cc } = await db
      .from('cost_centers')
      .select('name')
      .eq('id', params.costCenterId)
      .maybeSingle();
    if (cc?.name) costCenterName = cc.name;
  }

  const classification = await classifyTransaction(
    {
      concept: extracted.concept || `Soporte ${params.filename}`,
      supplierName: resolvedSupplierName,
      nitNormalized: extracted.supplier_nit,
      thirdPartyId,
      costCenterId: params.costCenterId,
      costCenterName,
      amount: extracted.subtotal || extracted.total,
    },
    ctx
  );

  let purchaseId: string | null = null;
  let ccEntryId: string | null = null;
  let ceEntryId: string | null = null;

  // Nunca guardar en $0 sin revisión; si total > $0 y no es duplicado, crear compra + CC + CE en borrador
  if (!validation.hasBlockingZeroWarning && !validation.isDuplicate && extracted.total > 0) {
    const issueDate =
      extracted.issue_date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.issue_date)
        ? extracted.issue_date
        : '2026-06-15';

    const { data: createdPurchase, error: pErr } = await db
      .from('purchases')
      .insert({
        supplier_id: thirdPartyId,
        third_party_id: thirdPartyId,
        supplier_name: resolvedSupplierName,
        cost_center_id: params.costCenterId || null,
        invoice_number: extracted.invoice_number || null,
        concept: extracted.concept || `Factura ${extracted.invoice_number || params.filename}`,
        transaction_type: 'costo_gasto',
        amount: extracted.subtotal || extracted.total,
        tax_iva: extracted.tax_iva || 0,
        withholding_tax: extracted.withholding_tax || 0,
        total: extracted.total,
        status: 'pagado',
        payment_method: 'transferencia',
        paid_at: new Date().toISOString(),
        transaction_date: issueDate,
        invoice_url: `/api/soportes/view?path=${encodeURIComponent(params.storagePath)}`,
        support_sha256: params.sha256,
        support_storage_path: params.storagePath,
        created_by: params.userId,
      })
      .select('id')
      .single();

    if (!pErr && createdPurchase) {
      purchaseId = createdPurchase.id;
      const drafts = await ensureDraftEntriesForPurchase({
        purchaseId: createdPurchase.id,
        classification,
      });
      ccEntryId = drafts?.ccEntry?.id || null;
      ceEntryId = drafts?.ceEntry?.id || null;
    }
  }

  const effectiveConfidence =
    validation.warnings.length > 0
      ? Math.min(classification.confidence, 0.75)
      : classification.confidence;

  const { data: ingestion, error: ingErr } = await db
    .from('document_ingestions')
    .insert({
      storage_path: params.storagePath,
      sha256: params.sha256,
      source: lowerName.endsWith('.xml') || lowerName.endsWith('.zip') ? 'xml_dian' : 'manual',
      status:
        effectiveConfidence >= 0.85 && validation.warnings.length === 0 && purchaseId
          ? 'aprobado'
          : 'pendiente_revision',
      document_type: extracted.document_type,
      cufe: extracted.cufe || null,
      supplier_name: resolvedSupplierName,
      supplier_nit: extracted.supplier_nit || null,
      supplier_dv: extracted.supplier_dv || null,
      third_party_id: thirdPartyId,
      cost_center_id: params.costCenterId || null,
      invoice_number: extracted.invoice_number || null,
      issue_date:
        extracted.issue_date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.issue_date)
          ? extracted.issue_date
          : '2026-06-15',
      concept: extracted.concept || `Soporte ${params.filename}`,
      subtotal: extracted.subtotal || 0,
      tax_iva: extracted.tax_iva || 0,
      withholding_tax: extracted.withholding_tax || 0,
      total: extracted.total || 0,
      suggested_account_code: classification.accountCode,
      extracted_data: extracted as unknown as Record<string, unknown>,
      confidence: effectiveConfidence,
      warnings: validation.warnings,
      purchase_id: purchaseId,
      cc_entry_id: ccEntryId,
      ce_entry_id: ceEntryId,
      created_by: params.userId,
    })
    .select('*')
    .single();

  if (ingErr || !ingestion) {
    throw new Error('Error guardando ingesta documental: ' + ingErr?.message);
  }

  return ingestion;
}
