import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { BorradoresClientView } from '@/components/admin/contabilidad/BorradoresClientView';

export const dynamic = 'force-dynamic';

export default async function BorradoresContablesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { profile } = await requireRole(['admin', 'tesoreria']);
  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || 'todos';
  const page = Math.max(1, Number(resolvedParams.page || '1'));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const db = await getServerDb();

  let query = db
    .from('journal_entries')
    .select(
      `
      *,
      third_parties ( id, name, document_number ),
      cost_centers ( id, name ),
      journal_lines ( id, line_order, account_code, debit, credit, is_deductible )
    `,
      { count: 'exact' }
    )
    .eq('status', 'borrador')
    .eq('entry_type', 'CC')
    .order('needs_review', { ascending: false })
    .order('ai_confidence', { ascending: true })
    .order('entry_date', { ascending: false })
    .range(from, to);

  if (filter === 'revision') {
    query = query.or('needs_review.eq.true,ai_confidence.lt.0.85');
  } else if (filter === 'personales') {
    query = query.eq('is_personal_expense', true);
  } else if (filter === 'terceros') {
    query = query.eq('is_third_party_support', true);
  } else if (filter === 'retencion') {
    query = query.eq('missing_withholding', true);
  }

  const [entriesRes, accountsRes, costCentersRes] = await Promise.all([
    query,
    db
      .from('chart_of_accounts')
      .select('code, name, account_class')
      .eq('is_postable', true)
      .in('account_class', [5, 6])
      .order('code', { ascending: true }),
    db.from('cost_centers').select('id, name, accounting_class').eq('is_active', true),
  ]);

  return (
    <div className="main">
      <BorradoresClientView
        entries={entriesRes.data || []}
        totalCount={entriesRes.count || 0}
        currentPage={page}
        pageSize={pageSize}
        currentFilter={filter}
        accounts={accountsRes.data || []}
        costCenters={costCentersRes.data || []}
        isAdmin={profile.role === 'admin'}
      />
    </div>
  );
}
