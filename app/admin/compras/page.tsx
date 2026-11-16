import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { ComprasClientView } from '@/components/admin/compras/ComprasClientView';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();

  const [{ data: purchases }, { data: costCenters }, { data: categories }] = await Promise.all([
    db
      .from('purchases')
      .select('*, cost_centers(name), expense_categories(name)')
      .order('transaction_date', { ascending: false })
      .order('purchase_number', { ascending: false })
      .range(0, 4999),
    db.from('cost_centers').select('id, name').eq('is_active', true).order('name'),
    db.from('expense_categories').select('id, name').eq('is_active', true).order('sort_order'),
  ]);

  return (
    <ComprasClientView
      initialPurchases={purchases || []}
      costCenters={costCenters || []}
      categories={categories || []}
    />
  );
}
