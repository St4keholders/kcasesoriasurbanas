import { NextResponse } from 'next/server';
export const maxDuration = 60; // Set max duration to 60 seconds to prevent timeouts during OpenAI analysis
import { requireRole } from '@/lib/auth/require-role';
import { getOrCreateMonthFolder, uploadFileToDrive } from '@/lib/googleDrive';
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
    // 1. Verify user has permissions (admin or tesoreria)
    const { user } = await requireRole(['admin', 'tesoreria']);

    // 2. Parse FormData
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const selectedCostCenterId = formData.get('costCenterId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Initialize Supabase
    const supabase = await createClient();
    
    // Si no enviaron centro de costo desde el cliente, se usa uno por defecto
    let finalCostCenterId = selectedCostCenterId;
    if (!finalCostCenterId) {
      const { data: costCenters } = await supabase.from('cost_centers').select('id').limit(1);
      finalCostCenterId = costCenters?.[0]?.id || null;
    }

    // 3. Determine current month folder name (e.g., "junio", "agosto")
    const currentMonthName = format(new Date(), 'MMMM', { locale: es }).toLowerCase();

    // 4. Get or create the folder in Drive
    const folderId = await getOrCreateMonthFolder(currentMonthName);

    const results = [];

    // 5. Upload and analyze each file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Subir a Drive
        const result = await uploadFileToDrive(
          buffer,
          file.name,
          file.type || 'application/octet-stream',
          folderId
        );

        // Análisis con OpenAI
        let extracted: any = {};
        try {
          if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });
            let messages: any[] = [
              {
                role: 'system',
                content: 'Eres un experto contable. Extrae los datos de esta factura o recibo. Devuelve SOLO un objeto JSON válido con los siguientes campos y tipos exactos: supplier_name (string), supplier_document (string, NIT/Cedula), invoice_number (string), transaction_date (YYYY-MM-DD), amount (numero sin formato, usa punto para decimales, corresponde al subtotal), tax_iva (numero sin formato, valor del IVA), withholding_tax (numero sin formato, valor de la retención en la fuente, 0 si no aplica), total (numero sin formato, igual a amount + tax_iva - withholding_tax), concept (string resumido del concepto o detalle del gasto), transaction_type (debe ser estrictamente una de estas opciones: "costo_gasto", "inversion" u "otro"). IMPORTANTE: El NIT de la empresa cliente es 902012620-0 (KC Asesorias Urbanas), NO uses este NIT ni este nombre como proveedor, debes extraer los datos del emisor de la factura.'
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

        // Verificar o crear proveedor
        const supplierName = extracted.supplier_name || 'Proveedor Ocasional';
        const supplierDocument = extracted.supplier_document || null;
        let supplierId = null;
        
        if (supplierName !== 'Proveedor Ocasional') {
          let existingSupplier = null;

          // Si extrajo un documento (NIT/CC), buscar por documento primero
          if (supplierDocument) {
            const { data } = await supabase
              .from('suppliers')
              .select('id, name')
              .eq('document_number', supplierDocument)
              .limit(1);
            if (data && data.length > 0) existingSupplier = data[0];
          }

          // Si no encontró por documento, buscar por nombre
          if (!existingSupplier) {
            const { data } = await supabase
              .from('suppliers')
              .select('id, name, document_number')
              .ilike('name', supplierName)
              .limit(1);
            if (data && data.length > 0) existingSupplier = data[0];
          }

          if (existingSupplier) {
            supplierId = existingSupplier.id;
            
            // Actualizar el proveedor si hay nuevos datos (ej. encontró un NIT que antes no tenía, o diferente nombre)
            if (supplierDocument && existingSupplier.document_number !== supplierDocument) {
               await supabase.from('suppliers').update({ document_number: supplierDocument, name: supplierName }).eq('id', supplierId);
            }
          } else {
            // Crear el proveedor
            const { data: newSupplier, error: supplierError } = await supabase
              .from('suppliers')
              .insert({
                name: supplierName,
                document_number: supplierDocument || extracted.invoice_number || '000000000',
                is_active: true
              })
              .select()
              .single();
              
            if (!supplierError && newSupplier) {
              supplierId = newSupplier.id;
            } else if (supplierError) {
              console.error('Error creating supplier:', supplierError);
            }
          }
        }

        // Insertar en Supabase
        const amountNum = parseNumber(extracted.amount);
        const taxNum = parseNumber(extracted.tax_iva);
        const withholdingNum = parseNumber(extracted.withholding_tax);
        
        const { error: dbError } = await supabase
          .from('purchases')
          .insert({
            supplier_id: supplierId,
            supplier_name: supplierName,
            cost_center_id: finalCostCenterId,
            invoice_number: extracted.invoice_number || file.name,
            concept: extracted.concept || 'Factura subida desde Carga Masiva',
            transaction_type: extracted.transaction_type || 'costo_gasto',
            amount: amountNum,
            tax_iva: taxNum,
            withholding_tax: withholdingNum,
            total: amountNum + taxNum - withholdingNum, // Will be overridden by DB trigger but good to have
            status: 'pagado',
            paid_at: new Date().toISOString(),
            transaction_date: extracted.transaction_date || new Date().toISOString().split('T')[0],
            notes: `Archivo: ${file.name}\nDrive: ${result.webViewLink}`,
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
      monthFolder: currentMonthName,
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
