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

export default async function DetalleCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    .eq('id', id)
    .single();

  if (error || !purchase) notFound();

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formatDate = (iso: string) => iso ? format(new Date(iso), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A';

  const handlePayment = async (formData: FormData) => {
    'use server';
    const method = formData.get('method') as string;
    await payPurchase(id, method);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/compras" className="p-2 bg-[var(--bg-card)] text-[var(--dim)] hover:text-[var(--fg)] rounded-full shadow-sm border border-[var(--border)] transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-[var(--fg)]">Detalle de Gasto / Compra</h1>
            <p className="text-[var(--dim)] text-sm">{purchase.purchase_number}</p>
          </div>
        </div>
        <StatusBadge status={purchase.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Descripción</h2>
                <p className="text-[var(--fg)] font-medium">{purchase.description}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Centro de Costo</h2>
                <p className="text-[var(--fg-soft)]">{purchase.cost_centers?.name}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Fecha de Factura</h2>
                <p className="text-[var(--fg-soft)]">{formatDate(purchase.invoice_date)}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Fecha de Vencimiento</h2>
                <p className="text-[var(--fg-soft)]">{purchase.due_date ? formatDate(purchase.due_date) : 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center py-2 text-sm text-[var(--dim)]">
                <span>Subtotal:</span>
                <span className="text-[var(--fg)]">{formatCurrency(purchase.amount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-[var(--dim)]">
                <span>Impuestos:</span>
                <span className="text-[var(--fg)]">{formatCurrency(purchase.tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] text-lg">
                <span className="font-medium text-[var(--fg)]">Total a Pagar:</span>
                <span className="font-bold text-rose-500">{formatCurrency(purchase.total)}</span>
              </div>
            </div>

            {purchase.notes && (
              <div className="pt-4 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--fg)] mb-2">Notas Adicionales:</h3>
                <p className="text-sm text-[var(--fg-soft)] bg-[var(--bg)] p-3 rounded-lg">{purchase.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-4">
            <h2 className="font-medium text-[var(--fg)] border-b border-[var(--border)] pb-2">Proveedor</h2>
            {purchase.suppliers ? (
              <div>
                <div className="text-sm font-medium text-[var(--fg)]">{purchase.suppliers.name}</div>
                {purchase.suppliers.document_number && <div className="text-sm text-[var(--dim)]">NIT/CC: {purchase.suppliers.document_number}</div>}
                {purchase.suppliers.phone && <div className="text-sm text-[var(--dim)]">{purchase.suppliers.phone}</div>}
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[var(--fg)]">{purchase.supplier_name || 'Sin Proveedor Especificado'}</div>
                <div className="text-xs text-[var(--dim)] mt-1 italic">Proveedor Ocasional</div>
              </div>
            )}
            
            {purchase.invoice_number && (
              <div className="pt-2">
                <div className="text-xs text-[var(--dim)]">Número de Factura:</div>
                <div className="text-sm font-medium text-[var(--fg-soft)]">{purchase.invoice_number}</div>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-4">
            <h2 className="font-medium text-[var(--fg)] border-b border-[var(--border)] pb-2">Registro</h2>
            <div className="text-sm text-[var(--fg-soft)]">Registrado por: {purchase.profiles?.full_name}</div>
          </div>

          {purchase.status !== 'pagado' ? (
            <div className="bg-rose-50/50 p-6 rounded-xl shadow-sm border border-rose-200 border-dashed space-y-4">
              <div className="flex items-center gap-2 text-[var(--fg)] font-medium mb-2">
                <DollarSignIcon className="w-5 h-5 text-rose-500" />
                Registrar Pago Realizado
              </div>
              <p className="text-xs text-[var(--dim)]">Confirma que este gasto o factura ha sido pagado al proveedor.</p>
              
              <form action={handlePayment} className="space-y-3">
                <select 
                  name="payment_method" 
                  required 
                  className="neu-input"
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
                  className="w-full py-2 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors text-sm"
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
