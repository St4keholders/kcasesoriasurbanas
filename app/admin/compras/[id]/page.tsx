import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, DollarSignIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { payPurchase } from '../actions';
import { revalidatePath } from 'next/cache';

export default async function DetalleCompraPage({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'tesoreria']);
  const supabase = await createClient();

  const { data: purchase, error } = await supabase
    .from('purchases')
    .select(`
      *,
      cost_centers ( name ),
      suppliers ( name, document_number, phone ),
      profiles!purchases_created_by_fkey ( full_name )
    `)
    .eq('id', params.id)
    .single();

  if (error || !purchase) notFound();

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formatDate = (iso: string) => format(new Date(iso), "dd 'de' MMMM, yyyy", { locale: es });

  const handlePayment = async (formData: FormData) => {
    'use server';
    const method = formData.get('payment_method') as string;
    await payPurchase(params.id, method);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/compras" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Detalle de Gasto / Compra</h1>
            <p className="text-[#7a99b5] text-sm">{purchase.purchase_number}</p>
          </div>
        </div>
        <StatusBadge status={purchase.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-[#7a99b5] mb-1">Descripción</h2>
                <p className="text-[#1a2d3d] font-medium">{purchase.description}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#7a99b5] mb-1">Centro de Costo</h2>
                <p className="text-[#3d5a73]">{purchase.cost_centers?.name}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#7a99b5] mb-1">Fecha de Factura</h2>
                <p className="text-[#3d5a73]">{formatDate(purchase.invoice_date)}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#7a99b5] mb-1">Fecha de Vencimiento</h2>
                <p className="text-[#3d5a73]">{purchase.due_date ? formatDate(purchase.due_date) : 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#a8c4d9]/40">
              <div className="flex justify-between items-center py-2 text-sm text-[#7a99b5]">
                <span>Subtotal:</span>
                <span className="text-[#1a2d3d]">{formatCurrency(purchase.amount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-[#7a99b5]">
                <span>Impuestos:</span>
                <span className="text-[#1a2d3d]">{formatCurrency(purchase.tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#a8c4d9]/20 text-lg">
                <span className="font-medium text-[#1a2d3d]">Total a Pagar:</span>
                <span className="font-bold text-rose-500">{formatCurrency(purchase.total)}</span>
              </div>
            </div>

            {purchase.notes && (
              <div className="pt-4 border-t border-[#a8c4d9]/40">
                <h3 className="text-sm font-medium text-[#1a2d3d] mb-2">Notas Adicionales:</h3>
                <p className="text-sm text-[#3d5a73] bg-[#f7fbff] p-3 rounded-lg">{purchase.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
            <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Proveedor</h2>
            {purchase.suppliers ? (
              <div>
                <div className="text-sm font-medium text-[#1a2d3d]">{purchase.suppliers.name}</div>
                {purchase.suppliers.document_number && <div className="text-sm text-[#7a99b5]">NIT/CC: {purchase.suppliers.document_number}</div>}
                {purchase.suppliers.phone && <div className="text-sm text-[#7a99b5]">{purchase.suppliers.phone}</div>}
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[#1a2d3d]">{purchase.supplier_name || 'Sin Proveedor Especificado'}</div>
                <div className="text-xs text-[#7a99b5] mt-1 italic">Proveedor Ocasional</div>
              </div>
            )}
            
            {purchase.invoice_number && (
              <div className="pt-2">
                <div className="text-xs text-[#7a99b5]">Número de Factura:</div>
                <div className="text-sm font-medium text-[#3d5a73]">{purchase.invoice_number}</div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
            <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Registro</h2>
            <div className="text-sm text-[#3d5a73]">Registrado por: {purchase.profiles?.full_name}</div>
          </div>

          {purchase.status !== 'pagado' ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-300 border-dashed space-y-4 bg-rose-50/50">
              <div className="flex items-center gap-2 text-[#1a2d3d] font-medium mb-2">
                <DollarSignIcon className="w-5 h-5 text-rose-500" />
                Registrar Pago Realizado
              </div>
              <p className="text-xs text-[#7a99b5]">Confirma que este gasto o factura ha sido pagado al proveedor.</p>
              
              <form action={handlePayment} className="space-y-3">
                <select 
                  name="payment_method" 
                  required 
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                >
                  <option value="">Seleccionar método/origen...</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta">Tarjeta de Crédito</option>
                  <option value="efectivo">Caja Menor / Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
                <button 
                  type="submit"
                  className="w-full py-2 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors text-sm"
                >
                  Confirmar Pago de Gasto
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 text-center">
              <div className="text-emerald-600 font-medium mb-1">Gasto Pagado</div>
              <div className="text-xs text-emerald-500 mb-4">
                Pagado el {formatDate(purchase.paid_at)} mediante {purchase.payment_method}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
