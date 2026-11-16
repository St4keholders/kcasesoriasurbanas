import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { loadOperation, type SourceTable } from '@/lib/server/services/contabilidad/kc';
import { newDoc, drawOperationPage, appendSupport } from '@/lib/server/services/contabilidad/pdf';

export const maxDuration = 30;

/** Comprobante de una operación: CC + CE en una hoja y el soporte detrás. */
export async function GET(request: NextRequest) {
  try {
    await requireRoleApi(['admin', 'tesoreria']);
    const source = (request.nextUrl.searchParams.get('source') || 'purchases') as SourceTable;
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!['purchases', 'petty_cash_entries', 'sales'].includes(source) || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: 'Parámetros inválidos' }, { status: 400 });
    }
    const op = await loadOperation(source, id);
    if (!op || !op.entries.length) {
      return NextResponse.json({ ok: false, error: 'La operación no tiene comprobantes' }, { status: 404 });
    }
    const db = await getServerDb();
    const { data: settings } = await db.from('accounting_settings').select('company_name, company_nit').eq('id', 1).maybeSingle();
    const company = { name: settings?.company_name || 'KC Asesorías Urbanas S.A.S', nit: settings?.company_nit || '902012620-0' };

    const { pdf, f } = await newDoc();
    drawOperationPage(pdf, f, op, company);
    await appendSupport(pdf, f, op);
    const bytes = await pdf.save();
    const name = op.entries.map((e) => e.entry_number).join('_');
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${name}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error generando el PDF' }, { status: 500 });
  }
}
