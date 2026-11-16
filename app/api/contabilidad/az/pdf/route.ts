import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { loadOperation, type OperationData, type SourceTable } from '@/lib/server/services/contabilidad/kc';
import { newDoc, drawOperationPage, appendSupport, drawAzCover } from '@/lib/server/services/contabilidad/pdf';

export const maxDuration = 60;

/**
 * Archivo AZ por lotes: portada (con firmas e índice) + una hoja por operación (CC + CE) + soportes.
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD&lot=1&size=40&supports=1   ·   ?count=1 devuelve cuántas operaciones hay.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRoleApi(['admin', 'tesoreria']);
    const sp = request.nextUrl.searchParams;
    const from = sp.get('from') || '2026-01-01';
    const to = sp.get('to') || '2026-12-31';
    const size = Math.min(60, Math.max(5, Number(sp.get('size') || '40')));
    const lot = Math.max(1, Number(sp.get('lot') || '1'));
    const withSupports = sp.get('supports') !== '0';
    const onlyApproved = sp.get('approved') === '1';

    const db = await getServerDb();
    let q = db
      .from('v_kc_operaciones')
      .select('source_table, source_id', { count: 'exact' })
      .neq('estado', 'anulado')
      .gte('fecha', from)
      .lte('fecha', to)
      .order('orden');
    if (onlyApproved) q = q.eq('estado', 'aprobado');

    if (sp.get('count') === '1') {
      const { count } = await q.range(0, 0);
      return NextResponse.json({ ok: true, data: { count: count || 0, lots: Math.ceil((count || 0) / size), size } });
    }

    const { data: refs, count } = await q.range((lot - 1) * size, lot * size - 1);
    const ops: OperationData[] = [];
    for (const r of refs || []) {
      const op = await loadOperation(r.source_table as SourceTable, r.source_id as string);
      if (op && op.entries.length) ops.push(op);
    }

    const { data: settings } = await db.from('accounting_settings').select('*').eq('id', 1).maybeSingle();
    const company = { name: settings?.company_name || 'KC Asesorías Urbanas S.A.S', nit: settings?.company_nit || '902012620-0' };
    const totalLots = Math.max(1, Math.ceil((count || 0) / size));

    const { pdf, f } = await newDoc();
    drawAzCover(pdf, f, {
      company,
      from,
      to,
      lot: `Lote ${lot} de ${totalLots}`,
      ops,
      firmas: {
        elaboro: profile.full_name || '',
        reviso: settings?.reviso_name || 'Contador',
        aprobo: settings?.aprobo_name || 'Representante legal',
      },
    });
    for (const op of ops) {
      drawOperationPage(pdf, f, op, company);
      if (withSupports) await appendSupport(pdf, f, op);
    }
    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AZ_KC_${from}_${to}_lote${lot}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error generando el AZ' }, { status: 500 });
  }
}
