import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function VentasPage() {
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      id,
      sale_number,
      status,
      total,
      paid_at,
      leads ( full_name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cotizacion': return 'bg-gray-100 text-gray-800';
      case 'pendiente_pago': return 'bg-yellow-100 text-yellow-800';
      case 'pagada': return 'bg-green-100 text-green-800';
      case 'anulada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-6">
        Gestión de Ventas
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-[#a8c4d9]/40 overflow-hidden">
        <table className="min-w-full divide-y divide-[#a8c4d9]/40">
          <thead className="bg-[#f7fbff]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Factura/Cotización</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#a8c4d9]/40">
            {sales?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#7a99b5]">
                  No hay ventas registradas.
                </td>
              </tr>
            ) : (
              sales?.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-[#f7fbff] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#1a2d3d]">{sale.sale_number}</div>
                    {sale.paid_at && (
                      <div className="text-xs text-[#7a99b5]">Pagado: {format(new Date(sale.paid_at), "dd/MM/yyyy")}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3d5a73]">
                    {sale.leads?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1a2d3d]">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {sale.status.toUpperCase().replace('_', ' ')}
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
