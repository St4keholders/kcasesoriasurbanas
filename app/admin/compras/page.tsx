import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export default async function ComprasPage() {
  const supabase = await createClient();

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`
      id,
      purchase_number,
      description,
      total,
      status,
      due_date,
      cost_centers ( name )
    `)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching purchases:', error);
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente_pago': return 'bg-yellow-100 text-yellow-800';
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'anulado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-6">
        Cuentas por Pagar (Compras)
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-[#a8c4d9]/40 overflow-hidden">
        <table className="min-w-full divide-y divide-[#a8c4d9]/40">
          <thead className="bg-[#f7fbff]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Código / Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Centro de Costo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#a8c4d9]/40">
            {purchases?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#7a99b5]">
                  No hay cuentas por pagar registradas.
                </td>
              </tr>
            ) : (
              purchases?.map((purchase: any) => (
                <tr key={purchase.id} className="hover:bg-[#f7fbff] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#1a2d3d]">{purchase.purchase_number}</div>
                    {purchase.due_date && (
                      <div className="text-xs text-[#7a99b5]">Vence: {format(new Date(purchase.due_date), "dd/MM/yyyy")}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3d5a73] truncate max-w-[200px]">
                    {purchase.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#7a99b5]">
                    {purchase.cost_centers?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1a2d3d]">
                    {formatCurrency(purchase.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(purchase.status)}`}>
                      {purchase.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
