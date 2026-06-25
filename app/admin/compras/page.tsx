import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { ComprasClientView } from '@/components/admin/compras/ComprasClientView';

export default async function ComprasPage() {
  await requireRole(['admin', 'tesoreria']);
  
  const supabase = await createClient();
  
  const currentDate = new Date();
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const [{ data: purchases }, { data: costCenters }, { data: suppliers }, { data: pettyCash }] = await Promise.all([
    supabase
      .from('purchases')
      .select(`
        *,
        cost_centers ( name ),
        suppliers ( name )
      `)
      .order('transaction_date', { ascending: false }),
    supabase.from('cost_centers').select('id, name').order('name'),
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('petty_cash_entries_full')
      .select('tax_amount, total_amount, entry_date, supplier_name')
  ]);

  return (
    <div className="main">
      <ComprasClientView 
        initialPurchases={purchases || []} 
        costCenters={costCenters || []}
        suppliers={suppliers || []}
        pettyCash={pettyCash || []}
      />
    </div>
  );
}
