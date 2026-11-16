import { NextResponse, type NextRequest } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import {
  renderVoucherToPdfDoc,
  type ComprobanteFullData,
} from '@/lib/server/services/contabilidad/pdf';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN_AZ = 99.21; // 3.5 cm para perforación AZ
const RIGHT_MARGIN = 40;

function sanitizeText(t: string | null | undefined): string {
  return String(t || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    await requireRoleApi(['admin', 'tesoreria']);
    const sp = request.nextUrl.searchParams;
    const mode = sp.get('mode') || 'batch'; // 'count' | 'batch'
    const fromDate = sp.get('from') || '2026-01-01';
    const toDate = sp.get('to') || '2026-12-31';
    const entryType = sp.get('type') || '';
    const status = sp.get('status') || '';
    const offset = Math.max(0, Number(sp.get('offset') || '0'));
    const limit = Math.min(50, Math.max(1, Number(sp.get('limit') || '50')));
    const includeIndex = sp.get('includeIndex') === '1';

    const db = await getServerDb();

    let baseQuery = db
      .from('journal_entries')
      .select(
        '*, third_parties(name, document_number), cost_centers(name), journal_lines(*)',
        { count: 'exact' }
      )
      .neq('status', 'anulado')
      .gte('entry_date', fromDate)
      .lte('entry_date', toDate)
      .order('entry_date', { ascending: true })
      .order('entry_type', { ascending: true })
      .order('entry_number', { ascending: true });

    if (entryType) baseQuery = baseQuery.eq('entry_type', entryType);
    if (status) baseQuery = baseQuery.eq('status', status);

    if (mode === 'count') {
      const { count, error } = await baseQuery.range(0, 0);
      if (error) throw new Error(error.message);
      return NextResponse.json({
        ok: true,
        data: { total: count || 0, batchSize: 50 },
      });
    }

    const [entriesRes, accRes, ccRes, setRes] = await Promise.all([
      baseQuery.range(offset, offset + limit - 1),
      db.from('chart_of_accounts').select('code, name'),
      db.from('cost_centers').select('id, name'),
      db.from('accounting_settings').select('*').eq('id', 1).maybeSingle(),
    ]);

    if (entriesRes.error) throw new Error(entriesRes.error.message);

    const accNameMap = new Map<string, string>();
    for (const a of accRes.data || []) accNameMap.set(a.code, a.name);

    const ccNameMap = new Map<string, string>();
    for (const c of ccRes.data || []) ccNameMap.set(c.id, c.name);

    const company = {
      company_name: setRes.data?.company_name || 'KC Asesorías Urbanas S.A.S',
      company_nit: setRes.data?.company_nit || '902012620-0',
    };

    const entries = entriesRes.data || [];
    const linkedIds = entries
      .map((e) => e.linked_entry_id)
      .filter((x): x is string => Boolean(x));

    const linkedMap = new Map<string, { id: string; entry_number: string; entry_type: string }>();
    if (linkedIds.length > 0) {
      const { data: linkedRows } = await db
        .from('journal_entries')
        .select('id, entry_number, entry_type')
        .in('id', linkedIds);
      for (const lr of linkedRows || []) linkedMap.set(lr.id, lr);
    }

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Si es el primer lote, generar portada e índice del AZ
    if (includeIndex) {
      let idxPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - 54;

      idxPage.drawText(sanitizeText(company.company_name.toUpperCase()), {
        x: LEFT_MARGIN_AZ,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.08, 0.16, 0.24),
      });
      y -= 16;
      idxPage.drawText(
        `NIT: ${sanitizeText(company.company_nit)}   |   ÍNDICE DE ARCHIVO AZ CONTABLE (${formatDateCO(fromDate)} a ${formatDateCO(toDate)})`,
        {
          x: LEFT_MARGIN_AZ,
          y,
          size: 9.5,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.6),
        }
      );
      y -= 14;
      idxPage.drawLine({
        start: { x: LEFT_MARGIN_AZ, y },
        end: { x: PAGE_WIDTH - RIGHT_MARGIN, y },
        thickness: 1,
        color: rgb(0.22, 0.52, 0.78),
      });
      y -= 18;

      for (let i = 0; i < entries.length; i++) {
        if (y < 60) {
          idxPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - 54;
        }
        const e = entries[i];
        const tp = (e.third_parties as { name?: string } | null)?.name || 'Tercero';
        const lineStr = `${String(offset + i + 1).padStart(4, '0')}.  ${e.entry_date}  |  ${e.entry_number}  |  ${tp.slice(0, 26)}  |  ${formatCOP(Number(e.total_debit))}`;
        idxPage.drawText(sanitizeText(lineStr), {
          x: LEFT_MARGIN_AZ,
          y,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.15, 0.25, 0.35),
        });
        y -= 13;
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const rawLines = (e.journal_lines || []) as Array<{
        line_order: number;
        account_code: string;
        cost_center_id: string | null;
        description: string | null;
        debit: number;
        credit: number;
      }>;
      const sortedLines = [...rawLines].sort((a, b) => a.line_order - b.line_order);

      const voucherData: ComprobanteFullData = {
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

      await renderVoucherToPdfDoc(pdfDoc, voucherData, company, offset + i + 1);
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AZ-KC-${fromDate}-a-${toDate}.pdf"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof RoleError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : 'Error generando paquete AZ';
    return NextResponse.json({ ok: false, error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
