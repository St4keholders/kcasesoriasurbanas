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
      .from('petty_cash_entries')
      .select('tax_amount, total_amount')
      .gte('entry_date', currentMonthStart)
      .lte('entry_date', currentMonthEnd)
  ]);

  // Calcular KPIs del mes actual
  const currentMonthPurchases = (purchases || []).filter(p => p.transaction_date >= currentMonthStart && p.transaction_date <= currentMonthEnd && p.status !== 'anulada');
  
  const totalComprasMes = currentMonthPurchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalRetencionesMes = currentMonthPurchases.reduce((acc, p) => acc + (Number(p.withholding_tax) || 0), 0);
  
  const totalCajasMenoresMes = (pettyCash || []).reduce((acc, pc) => acc + (Number(pc.total_amount) || 0), 0);
  
  const ivaCompras = currentMonthPurchases.reduce((acc, p) => acc + (Number(p.tax_iva) || 0), 0);
  const ivaCajas = (pettyCash || []).reduce((acc, pc) => acc + (Number(pc.tax_amount) || 0), 0);
  const totalIvaMes = ivaCompras + ivaCajas;

  return (
    <div className="main">
      <ComprasClientView 
        initialPurchases={purchases || []} 
        costCenters={costCenters || []}
        suppliers={suppliers || []}
        kpis={{
          totalComprasMes,
          totalIvaMes,
          totalRetencionesMes,
          totalCajasMenoresMes
        }}
      />
    </div>
  );
}
