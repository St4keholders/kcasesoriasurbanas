import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    await requireRoleApi(['admin', 'tesoreria']);
    const sp = request.nextUrl.searchParams;
    const from = sp.get('from') || '2026-01-01';
    const to = sp.get('to') || '2026-12-31';
    const db = await getServerDb();

    const { data: acc } = await db.from('chart_of_accounts').select('code, name');
    const names = new Map((acc || []).map((a) => [a.code, a.name]));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Libro diario');
    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Comprobante', key: 'num', width: 15 },
      { header: 'Tipo', key: 'tipo', width: 6 },
      { header: 'Tercero', key: 'tercero', width: 34 },
      { header: 'NIT / CC', key: 'nit', width: 15 },
      { header: 'Centro de costo', key: 'centro', width: 16 },
      { header: 'Cuenta', key: 'cuenta', width: 11 },
      { header: 'Nombre cuenta', key: 'nombre', width: 36 },
      { header: 'Detalle', key: 'detalle', width: 40 },
      { header: 'Débito', key: 'debito', width: 15, style: { numFmt: '#,##0' } },
      { header: 'Crédito', key: 'credito', width: 15, style: { numFmt: '#,##0' } },
      { header: 'Estado', key: 'estado', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };

    for (let offset = 0; offset < 50000; offset += 500) {
      let q = db
        .from('journal_entries')
        .select('entry_number, entry_type, entry_date, status, concept, third_parties(name, nit_normalized, dv), cost_centers(name), journal_lines(account_code, description, debit, credit, line_order)')
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date')
        .order('entry_type')
        .order('entry_number')
        .range(offset, offset + 499);
      const status = sp.get('status');
      if (status) q = q.eq('status', status);
      else q = q.neq('status', 'anulado');
      if (sp.get('type')) q = q.eq('entry_type', sp.get('type') as string);
      if (sp.get('center')) q = q.eq('cost_center_id', sp.get('center') as string);
      const { data } = await q;
      for (const e of (data || []) as any[]) {
        const lines = (e.journal_lines || []).sort((a: any, b: any) => a.line_order - b.line_order);
        for (const l of lines) {
          if (sp.get('account') && !String(l.account_code).startsWith(sp.get('account') as string)) continue;
          ws.addRow({
            fecha: e.entry_date,
            num: e.entry_number,
            tipo: e.entry_type,
            tercero: e.third_parties?.name || '',
            nit: e.third_parties?.nit_normalized ? `${e.third_parties.nit_normalized}${e.third_parties.dv ? '-' + e.third_parties.dv : ''}` : '',
            centro: e.cost_centers?.name || '',
            cuenta: l.account_code,
            nombre: names.get(l.account_code) || '',
            detalle: l.description || e.concept || '',
            debito: Number(l.debit) || 0,
            credito: Number(l.credit) || 0,
            estado: e.status,
          });
        }
      }
      if (!data || data.length < 500) break;
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buf as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="libro_diario_KC_${from}_${to}.xlsx"`,
      },
    });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error exportando' }, { status: 500 });
  }
}
