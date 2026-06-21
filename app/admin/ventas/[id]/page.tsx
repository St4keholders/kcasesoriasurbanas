import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, FileTextIcon, DollarSignIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { registerPayment } from '../actions';
import { revalidatePath } from 'next/cache';

export default async function DetalleVentaPage({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'asesor']);
  const supabase = await createClient();

  const { data: sale, error } = await supabase
    .from('sales')
    .select(`
      *,
      leads ( id, full_name, document_number, phone, email ),
      profiles!sales_closed_by_fkey ( full_name ),
      sale_items ( id, description, quantity, unit_price, subtotal )
    `)
    .eq('id', params.id)
    .single();

  if (error || !sale) notFound();

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formatDate = (iso: string) => format(new Date(iso), "dd 'de' MMMM, yyyy", { locale: es });

  const handlePayment = async (formData: FormData) => {
    'use server';
    const method = formData.get('payment_method') as string;
    await registerPayment(params.id, method);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/ventas" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Detalle {sale.sale_number ? `de Venta ${sale.sale_number}` : 'de Cotización'}</h1>
            <p className="text-[#7a99b5] text-sm">Fecha: {formatDate(sale.created_at)}</p>
          </div>
        </div>
        <StatusBadge status={sale.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
            <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Ítems</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#3d5a73]">
                <thead className="bg-[#f7fbff] text-[#1a2d3d]">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-l-lg">Descripción</th>
                    <th className="px-4 py-3 font-medium text-right">Cant.</th>
                    <th className="px-4 py-3 font-medium text-right">Precio Un.</th>
                    <th className="px-4 py-3 font-medium text-right rounded-r-lg">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a8c4d9]/30">
                  {sale.sale_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#a8c4d9]/40 text-sm">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-[#7a99b5]">
                  <span>Subtotal:</span>
                  <span className="text-[#1a2d3d]">{formatCurrency(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#7a99b5]">
                  <span>Impuestos:</span>
                  <span className="text-[#1a2d3d]">{formatCurrency(sale.tax)}</span>
                </div>
                <div className="flex justify-between text-[#7a99b5]">
                  <span>Descuento:</span>
                  <span className="text-[#1a2d3d]">- {formatCurrency(sale.discount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#a8c4d9]/30 text-lg">
                  <span className="font-medium text-[#1a2d3d]">Total:</span>
                  <span className="font-bold text-[#5ba3d9]">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>

            {sale.notes && (
              <div className="pt-4">
                <h3 className="text-sm font-medium text-[#1a2d3d] mb-2">Notas:</h3>
                <p className="text-sm text-[#3d5a73] bg-[#f7fbff] p-3 rounded-lg">{sale.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
            <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Cliente</h2>
            <div>
              <div className="text-sm font-medium text-[#1a2d3d]">{sale.leads?.full_name}</div>
              <div className="text-sm text-[#7a99b5]">{sale.leads?.document_number && `CC/NIT: ${sale.leads.document_number}`}</div>
              <div className="text-sm text-[#7a99b5]">{sale.leads?.phone}</div>
              <div className="text-sm text-[#7a99b5]">{sale.leads?.email}</div>
            </div>
            <Link
              href={`/admin/leads/${sale.lead_id}`}
              className="text-[#5ba3d9] text-sm hover:underline block pt-2"
            >
              Ver ficha del cliente &rarr;
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
            <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Asesor</h2>
            <div className="text-sm text-[#3d5a73]">{sale.profiles?.full_name}</div>
          </div>

          {sale.status !== 'pagada' ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#5ba3d9] border-dashed space-y-4 bg-[#f7fbff]">
              <div className="flex items-center gap-2 text-[#1a2d3d] font-medium mb-2">
                <DollarSignIcon className="w-5 h-5 text-[#5ba3d9]" />
                Registrar Pago
              </div>
              <p className="text-xs text-[#7a99b5]">Si el cliente ha realizado el pago, regístralo para emitir el recibo correspondiente.</p>
              
              <form action={handlePayment} className="space-y-3">
                <select 
                  name="payment_method" 
                  required 
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                >
                  <option value="">Seleccionar método...</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="pse">PSE</option>
                  <option value="otro">Otro</option>
                </select>
                <button 
                  type="submit"
                  className="w-full py-2 bg-[#5ba3d9] text-white font-medium rounded-lg hover:bg-[#3b7dbf] transition-colors text-sm"
                >
                  Confirmar Pago
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 text-center">
              <div className="text-emerald-600 font-medium mb-1">Venta Pagada</div>
              <div className="text-xs text-emerald-500 mb-4">
                El {formatDate(sale.paid_at)} mediante {sale.payment_method}.
              </div>
              {/* Aquí iría el botón para descargar PDF en fase posterior */}
              <button disabled className="w-full py-2 bg-emerald-600 text-white font-medium rounded-lg opacity-50 cursor-not-allowed text-sm flex items-center justify-center gap-2">
                <FileTextIcon className="w-4 h-4" /> Generar Recibo PDF (Pronto)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
