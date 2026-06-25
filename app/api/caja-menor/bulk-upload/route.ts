import { NextResponse } from 'next/server';
export const maxDuration = 60; // Set max duration to 60 seconds to prevent timeouts during OpenAI analysis
import { requireRole } from '@/lib/auth/require-role';
import { getOrCreatePettyCashFolder, uploadFileToDrive } from '@/lib/googleDrive';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
const PDFParser = require('pdf2json');

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      resolve(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  });
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/[$€£a-zA-Z\s]/g, '');
  if (/,(\d{1,2})$/.test(str)) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (/\.(\d{1,2})$/.test(str)) {
    str = str.replace(/,/g, '');
  } else {
    str = str.replace(/[,.]/g, '');
  }
  return Number(str) || 0;
}

// OpenAI is initialized lazily inside the route handler to prevent build errors on Vercel

export async function POST(request: Request) {
  try {
    // 1. Verify user permissions
    const { user } = await requireRole(['admin', 'tesoreria', 'asesor']);

    // 2. Parse FormData
    const formData = await request.formData();
    const boxId = formData.get('boxId') as string;
    const files = formData.getAll('files') as File[];

    if (!boxId) {
      return NextResponse.json({ error: 'Falta el ID de la caja menor' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const supabase = await createClient();

    // 3. Get the box name to construct the folder name
    const { data: box, error: boxError } = await (supabase as any)
      .from('petty_cash_boxes')
      .select('name, box_number')
      .eq('id', boxId)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ error: 'Caja menor no encontrada' }, { status: 404 });
    }

    // 4. Construct folder name: "mes+nombre de la caja+año"
    const currentMonthName = format(new Date(), 'MMMM', { locale: es }).toLowerCase();
    const currentYear = format(new Date(), 'yyyy');
    const boxNameClean = (box.name || `caja_${box.box_number}`).toLowerCase().replace(/\s+/g, '_');
    
    const folderName = `${currentMonthName}_${boxNameClean}_${currentYear}`;

    // 5. Get or create the folder in Drive
    const folderId = await getOrCreatePettyCashFolder(folderName);

    const results = [];

    // 6. Upload and analyze each file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Drive
        const result = await uploadFileToDrive(
          buffer,
          file.name,
          file.type || 'application/octet-stream',
          folderId
        );

        // Analyze with OpenAI
        let extracted: any = {};
        try {
          if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });
            let messages: any[] = [
              {
                role: 'system',
                content: 'Eres un asistente contable analizando facturas o recibos para una caja menor. Extrae los datos y devuelve SOLO un objeto JSON válido con: supplier_name (string), supplier_document (string, NIT/Cedula sin digito de verificacion o guiones, solo numeros, o con guion si es NIT), concept (string, descripción corta), entry_date (YYYY-MM-DD), tax_amount (numero sin formato, 0 si no hay IVA explícito), total_amount (numero sin formato). IMPORTANTE: El NIT de la empresa cliente es 902012620-0 (KC Asesorias Urbanas), NO uses este NIT ni este nombre como proveedor, debes extraer los datos del emisor de la factura.'
              }
            ];

            if (file.type === 'application/pdf') {
              const pdfText = await extractTextFromPDF(buffer);
              messages.push({
                role: 'user',
                content: `Aquí está el texto extraído del PDF de la factura:\n\n${pdfText}`
              });
            } else {
              const base64Image = buffer.toString('base64');
              const dataUri = `data:${file.type || 'image/jpeg'};base64,${base64Image}`;
              messages.push({
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: dataUri } }
                ]
              });
            }

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: messages,
              response_format: { type: 'json_object' }
            });

            const content = completion.choices[0].message.content;
            if (content) {
              extracted = JSON.parse(content);
            }
          } else {
            console.warn('OPENAI_API_KEY no configurada. Saltando análisis de IA.');
          }
        } catch (aiError) {
          console.error('Error analizando con OpenAI:', aiError);
        }

        // Verificar o crear proveedor en la tabla general de suppliers para que aparezca en el panel
        const supplierName = extracted.supplier_name || 'Proveedor Ocasional';
        const supplierDocument = extracted.supplier_document || null;
        
        if (supplierName !== 'Proveedor Ocasional') {
          let existingSupplier = null;

          // Buscar por NIT/Cedula primero
          if (supplierDocument) {
            const { data } = await (supabase as any)
              .from('suppliers')
              .select('id, name, document_number')
              .eq('document_number', supplierDocument)
              .limit(1);
            if (data && data.length > 0) existingSupplier = data[0];
          }

          // Si no encuentra por NIT, buscar por nombre
          if (!existingSupplier) {
            const { data } = await (supabase as any)
              .from('suppliers')
              .select('id, name, document_number')
              .ilike('name', supplierName)
              .limit(1);
            if (data && data.length > 0) existingSupplier = data[0];
          }

          if (existingSupplier) {
            // Actualizar si hay nuevos datos
            if (supplierDocument && existingSupplier.document_number !== supplierDocument) {
              await (supabase as any).from('suppliers').update({ document_number: supplierDocument, name: supplierName }).eq('id', existingSupplier.id);
            }
          } else {
            const { data: newSupplier, error: supplierError } = await (supabase as any)
              .from('suppliers')
              .insert({
                name: supplierName,
                document_number: supplierDocument || '000000000',
                is_active: true
              })
              .select()
              .single();
              
            if (supplierError) {
              console.error('Error creating supplier in caja-menor:', supplierError);
            }
          }
        }

        // Insert into Supabase
        const { error: dbError } = await (supabase as any)
          .from('petty_cash_entries')
          .insert({
            box_id: boxId,
            entry_date: extracted.entry_date || new Date().toISOString().split('T')[0],
            supplier_name: supplierName,
            supplier_document: extracted.supplier_document || null,
            concept: extracted.concept || 'Factura extraída con IA',
            tax_amount: parseNumber(extracted.tax_amount),
            total_amount: parseNumber(extracted.total_amount),
            receipt_url: result.webViewLink,
            created_by: user?.id
          });

        if (dbError) {
          throw new Error('Error BD: ' + dbError.message);
        }

        results.push({
          fileName: file.name,
          status: 'success',
          driveId: result.id,
          link: result.webViewLink,
          extractedData: extracted
        });
      } catch (err: any) {
        console.error(`Error procesando archivo ${file.name}:`, err);
        results.push({
          fileName: file.name,
          status: 'error',
          error: err.message || 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      message: 'Upload and analysis complete',
      folderName: folderName,
      results 
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during bulk upload' },
      { status: 500 }
    );
  }
}
