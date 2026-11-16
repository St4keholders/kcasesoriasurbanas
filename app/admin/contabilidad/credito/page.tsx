import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { CreditoClientView } from '@/components/admin/contabilidad/CreditoClientView';

export const dynamic = 'force-dynamic';

export default async function CreditoPage() {
  await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();
  const [{ data: pending }, { data: categories }, { data: centers }] = await Promise.all([
    db.from('purchases').select('id, purchase_number, invoice_number, supplier_name, concept, transaction_date, due_date, total, status, paid_at')
      .not('due_date', 'is', null).order('due_date').range(0, 499),
    db.from('expense_categories').select('id, name').eq('is_active', true).order('sort_order'),
    db.from('cost_centers').select('id, name').eq('is_active', true).order('name'),
  ]);
  return <CreditoClientView rows={pending || []} categories={categories || []} costCenters={centers || []} />;
}
