import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { IngestaClientView } from '@/components/admin/ingesta/IngestaClientView';

export const dynamic = 'force-dynamic';

export default async function IngestaPage() {
  await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();

  const [ingestionsRes, accountsRes, costCentersRes] = await Promise.all([
    db
      .from('document_ingestions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 199),
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
      <IngestaClientView
        ingestions={ingestionsRes.data || []}
        accounts={accountsRes.data || []}
        costCenters={costCentersRes.data || []}
      />
    </div>
  );
}
