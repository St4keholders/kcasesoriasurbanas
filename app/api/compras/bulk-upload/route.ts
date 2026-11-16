import { NextResponse } from 'next/server';
export const maxDuration = 60;
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getAdminDb, getServerDb } from '@/lib/server/db';
import { SOPORTES_BUCKET } from '@/lib/server/storage';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';
import { parseCOP } from '@/lib/utils/money';
import { isKcNit } from '@/lib/utils/nit';
import OpenAI from 'openai';
import crypto from 'crypto';

interface ExtractedInvoice {
  supplier_name?: string;
  supplier_document?: string;
  invoice_number?: string;
  transaction_date?: string;
  amount?: number | string;
  tax_iva?: number | string;
  withholding_tax?: number | string;
  total?: number | string;
  concept?: string;
  transaction_type?: 'costo_gasto' | 'inversion' | 'otro';
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleApi(['admin', 'tesoreria']);

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const selectedCostCenterId = (formData.get('costCenterId') as string | null) || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No se enviaron archivos', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = await getServerDb();
    const adminDb = getAdminDb();

    let finalCostCenterId: string | null = selectedCostCenterId || null;
    if (!finalCostCenterId) {
      const { data: costCenters } = await supabase.from('cost_centers').select('id').limit(1);
      finalCostCenterId = costCenters?.[0]?.id ?? null;
    }

    const results: Array<{
      fileName: string;
      status: 'success' | 'error';
      storagePath?: string;
      link?: string;
      extractedData?: ExtractedInvoice;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
        const storagePath = `compras/${new Date().toISOString().slice(0, 7)}/${sha256.slice(0, 16)}-${Date.now()}.${ext}`;

        const { error: uploadError } = await adminDb.storage
          .from(SOPORTES_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Error en Storage: ${uploadError.message}`);
        }

        const fullStoragePath = `${SOPORTES_BUCKET}/${storagePath}`;
        const viewUrl = `/api/soportes/view?path=${encodeURIComponent(fullStoragePath)}`;

        let extracted: ExtractedInvoice = {};
        if (process.env.OPENAI_API_KEY && file.type.startsWith('image/')) {
          try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const model = process.env.AI_MODEL_OCR || 'gpt-4o';
            const dataUri = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
            const completion = await openai.chat.completions.create({
              model,
              temperature: 0,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content:
                    'Extrae los datos de esta factura en JSON: supplier_name, supplier_document, invoice_number, transaction_date (YYYY-MM-DD), amount, tax_iva, withholding_tax, total, concept, transaction_type ("costo_gasto" | "inversion" | "otro"). Excluye siempre el NIT 902012620-0 de KC Asesorías Urbanas.',
                },
                {
                  role: 'user',
                  content: [{ type: 'image_url', image_url: { url: dataUri } }],
                },
              ],
            });
            const rawContent = completion.choices[0]?.message?.content;
            if (rawContent) {
              extracted = JSON.parse(rawContent) as ExtractedInvoice;
            }
          } catch (aiErr) {
            console.error('Error en OCR OpenAI:', aiErr);
          }
        }

        const rawDoc = isKcNit(extracted.supplier_document) ? null : extracted.supplier_document;
        const supplier = await resolveOrCreateSupplier({
          name: extracted.supplier_name || 'Proveedor Ocasional',
          documentNumber: rawDoc,
        });

        const amountNum = parseCOP(extracted.amount);
        const taxNum = parseCOP(extracted.tax_iva);
        const withholdingNum = parseCOP(extracted.withholding_tax);
        const totalNum = Math.max(0, amountNum + taxNum - withholdingNum);

        const txType =
          extracted.transaction_type &&
          ['costo_gasto', 'inversion', 'otro'].includes(extracted.transaction_type)
            ? extracted.transaction_type
            : 'costo_gasto';

        const { error: dbError } = await supabase.from('purchases').insert({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          cost_center_id: finalCostCenterId,
          invoice_number: extracted.invoice_number || file.name,
          concept: extracted.concept || `Soporte cargado: ${file.name}`,
          transaction_type: txType,
          amount: amountNum,
          tax_iva: taxNum,
          withholding_tax: withholdingNum,
          total: totalNum,
          status: 'pendiente_pago',
          transaction_date:
            extracted.transaction_date || new Date().toISOString().split('T')[0],
          invoice_url: viewUrl,
          support_sha256: sha256,
          support_storage_path: fullStoragePath,
          notes: `Archivo: ${file.name}`,
          created_by: user.id,
        });

        if (dbError) {
          throw new Error(`Error BD: ${dbError.message}`);
        }

        results.push({
          fileName: file.name,
          status: 'success',
          storagePath: fullStoragePath,
          link: viewUrl,
          extractedData: extracted,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        results.push({
          fileName: file.name,
          status: 'error',
          error: msg,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: { results },
      results,
    });
  } catch (err: unknown) {
    if (err instanceof RoleError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : 'Error interno en carga masiva';
    return NextResponse.json({ ok: false, error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
