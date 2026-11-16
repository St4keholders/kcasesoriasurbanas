import { NextResponse } from 'next/server';
export const maxDuration = 60;
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getAdminDb, getServerDb } from '@/lib/server/db';
import { SOPORTES_BUCKET } from '@/lib/server/storage';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';
import { parseCOP } from '@/lib/utils/money';
import { isKcNit, parseNitAndDv } from '@/lib/utils/nit';
import OpenAI from 'openai';
import crypto from 'crypto';

interface ExtractedPettyCash {
  supplier_name?: string;
  supplier_document?: string;
  concept?: string;
  entry_date?: string;
  tax_amount?: number | string;
  total_amount?: number | string;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleApi(['admin', 'tesoreria', 'asesor']);

    const formData = await request.formData();
    const boxId = (formData.get('boxId') as string | null) || '';
    const files = formData.getAll('files') as File[];

    if (!boxId) {
      return NextResponse.json(
        { ok: false, error: 'Falta el ID de la caja menor', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No se enviaron archivos', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = await getServerDb();
    const adminDb = getAdminDb();

    const { data: box, error: boxError } = await supabase
      .from('petty_cash_boxes')
      .select('id, name, box_number')
      .eq('id', boxId)
      .single();

    if (boxError || !box) {
      return NextResponse.json(
        { ok: false, error: 'Caja menor no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const results: Array<{
      fileName: string;
      status: 'success' | 'error';
      link?: string;
      extractedData?: ExtractedPettyCash;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
        const storagePath = `caja-menor/${new Date().toISOString().slice(0, 7)}/${sha256.slice(0, 16)}-${Date.now()}.${ext}`;

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

        let extracted: ExtractedPettyCash = {};
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
                    'Extrae los datos de este recibo o factura de caja menor en JSON: supplier_name, supplier_document, concept, entry_date (YYYY-MM-DD), tax_amount, total_amount. Excluye siempre el NIT 902012620-0 de KC Asesorías Urbanas.',
                },
                {
                  role: 'user',
                  content: [{ type: 'image_url', image_url: { url: dataUri } }],
                },
              ],
            });
            const rawContent = completion.choices[0]?.message?.content;
            if (rawContent) {
              extracted = JSON.parse(rawContent) as ExtractedPettyCash;
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

        const parsedDoc = parseNitAndDv(rawDoc);

        const { error: dbError } = await supabase.from('petty_cash_entries').insert({
          box_id: boxId,
          entry_type: 'egreso',
          entry_date: extracted.entry_date || new Date().toISOString().split('T')[0],
          supplier_name: supplier.name,
          supplier_document: parsedDoc.nit ? parsedDoc.formatted : null,
          concept: extracted.concept || `Soporte cargado: ${file.name}`,
          tax_amount: parseCOP(extracted.tax_amount),
          total_amount: Math.max(1, parseCOP(extracted.total_amount)),
          receipt_url: viewUrl,
          support_sha256: sha256,
          support_storage_path: fullStoragePath,
          status: 'activo',
          created_by: user.id,
        });

        if (dbError) {
          throw new Error(`Error BD: ${dbError.message}`);
        }

        results.push({
          fileName: file.name,
          status: 'success',
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
  } catch (error: unknown) {
    if (error instanceof RoleError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const msg = error instanceof Error ? error.message : 'Error interno en carga masiva';
    return NextResponse.json({ ok: false, error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
