import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { LibroDiarioClientView } from '@/components/admin/contabilidad/LibroDiarioClientView';

export const dynamic = 'force-dynamic';

export default async function LibroDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    thirdPartyId?: string;
    accountCode?: string;
    costCenterId?: string;
    status?: string;
    page?: string;
    tab?: string;
  }>;
}) {
  await requireRole(['admin', 'tesoreria']);
  const sp = await searchParams;

  const fromDate = sp.from || '2026-01-01';
  const toDate = sp.to || '2026-12-31';
  const entryType = sp.type || '';
  const thirdPartyId = sp.thirdPartyId || '';
  const accountCode = sp.accountCode || '';
  const costCenterId = sp.costCenterId || '';
  const status = sp.status || '';
  const page = Math.max(1, Number(sp.page || '1'));
  const activeTab = sp.tab || 'diario';
  const pageSize = 50;
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const db = await getServerDb();

  let entriesQuery = db
    .from('journal_entries')
    .select(
      `
      *,
      third_parties ( id, name, document_number ),
      cost_centers ( id, name ),
      journal_lines ( id, line_order, account_code, description, debit, credit, base_amount, is_deductible )
    `,
      { count: 'exact' }
    )
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)
    .order('entry_date', { ascending: true })
    .order('entry_type', { ascending: true })
    .order('entry_number', { ascending: true });

  if (entryType) entriesQuery = entriesQuery.eq('entry_type', entryType);
  if (thirdPartyId) entriesQuery = entriesQuery.eq('third_party_id', thirdPartyId);
  if (costCenterId) entriesQuery = entriesQuery.eq('cost_center_id', costCenterId);
  if (status) {
    entriesQuery = entriesQuery.eq('status', status);
  } else {
    entriesQuery = entriesQuery.neq('status', 'anulado');
  }

  if (accountCode) {
    const { data: matchingLineEntries } = await db
      .from('journal_lines')
      .select('entry_id')
      .like('account_code', `${accountCode}%`)
      .range(0, 4999);
    const ids = Array.from(new Set((matchingLineEntries || []).map((l) => l.entry_id)));
    entriesQuery = entriesQuery.in(
      'id',
      ids.length > 0 ? ids.slice(0, 500) : ['00000000-0000-0000-0000-000000000000']
    );
  }

  const [entriesRes, accountsRes, costCentersRes, thirdPartiesRes, summaryLinesRes] =
    await Promise.all([
      entriesQuery.range(fromIdx, toIdx),
      db.from('chart_of_accounts').select('code, name, account_class, nature').order('code'),
      db.from('cost_centers').select('id, name').eq('is_active', true),
      db
        .from('third_parties')
        .select('id, name, document_number')
        .eq('is_active', true)
        .order('name')
        .range(0, 999),
      db
        .from('journal_lines')
        .select(
          'account_code, third_party_id, debit, credit, journal_entries!inner(entry_date, status, entry_type, cost_center_id)'
        )
        .gte('journal_entries.entry_date', fromDate)
        .lte('journal_entries.entry_date', toDate)
        .neq('journal_entries.status', 'anulado')
        .range(0, 999),
    ]);

  // Calcular resumen para Libro Mayor, Auxiliar por Tercero y Balance de Prueba
  const accMap = new Map<string, { code: string; name: string; nature: string; debit: number; credit: number }>();
  for (const a of accountsRes.data || []) {
    accMap.set(a.code, { code: a.code, name: a.name, nature: a.nature, debit: 0, credit: 0 });
  }

  const tpSummaryMap = new Map<
    string,
    { id: string; name: string; document_number: string | null; debit: number; credit: number }
  >();
  for (const tp of thirdPartiesRes.data || []) {
    tpSummaryMap.set(tp.id, {
      id: tp.id,
      name: tp.name,
      document_number: tp.document_number,
      debit: 0,
      credit: 0,
    });
  }

  for (const l of summaryLinesRes.data || []) {
    const acc = accMap.get(l.account_code);
    if (acc) {
      acc.debit += Number(l.debit) || 0;
      acc.credit += Number(l.credit) || 0;
    }
    if (l.third_party_id) {
      const tp = tpSummaryMap.get(l.third_party_id);
      if (tp) {
        tp.debit += Number(l.debit) || 0;
        tp.credit += Number(l.credit) || 0;
      }
    }
  }

  const trialBalance = Array.from(accMap.values()).filter(
    (a) => a.debit > 0 || a.credit > 0
  );
  const thirdPartyLedger = Array.from(tpSummaryMap.values()).filter(
    (t) => t.debit > 0 || t.credit > 0
  );

  return (
    <div className="main">
      <LibroDiarioClientView
        entries={entriesRes.data || []}
        totalCount={entriesRes.count || 0}
        currentPage={page}
        pageSize={pageSize}
        filters={{
          from: fromDate,
          to: toDate,
          type: entryType,
          thirdPartyId,
          accountCode,
          costCenterId,
          status,
          tab: activeTab,
        }}
        accounts={accountsRes.data || []}
        costCenters={costCentersRes.data || []}
        thirdParties={thirdPartiesRes.data || []}
        trialBalance={trialBalance}
        thirdPartyLedger={thirdPartyLedger}
      />
    </div>
  );
}
