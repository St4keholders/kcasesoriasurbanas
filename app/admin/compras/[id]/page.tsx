import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, DollarSignIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import { payPurchase } from '../actions';

export default async function DetalleCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'tesoreria']);
  const supabase = await createClient();

  const { data: purchase, error } = await supabase
    .from('purchases')
    .select(
      `
      *,
      cost_centers ( name ),
      suppliers ( id, name, document_number, phone ),
      profiles!purchases_created_by_fkey ( full_name )
    `
    )
    .eq('id', id)
    .single();

  if (error || !purchase) notFound();

  const handlePayment = async (formData: FormData) => {
    'use server';
    const method = (formData.get('payment_method') || formData.get('method') || 'transferencia') as string;
    await payPurchase(id, method);
  };

  const supportHref = purchase.support_storage_path
    ? `/api/soportes/view?path=${encodeURIComponent(purchase.support_storage_path)}`
    : purchase.invoice_url || purchase.legacy_drive_url || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/compras"
            className="p-2 bg-[var(--bg-card)] text-[var(--dim)] hover:text-[var(--fg)] rounded-full shadow-sm border border-[var(--border)] transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-[var(--fg)]">
              Detalle de gasto / compra
            </h1>
            <p className="text-[var(--dim)] text-sm font-mono">{purchase.purchase_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/contabilidad/comprobantes/${purchase.id}/pdf?source=purchase`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <FileTextIcon className="w-4 h-4" /> Descargar comprobante
          </a>
          <StatusBadge status={purchase.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-6 glass-panel">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Concepto</h2>
                <p className="text-[var(--fg)] font-medium">{purchase.concept}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Centro de costo</h2>
                <p className="text-[var(--fg-soft)]">{purchase.cost_centers?.name || 'Medellín'}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Fecha de transacción</h2>
                <p className="text-[var(--fg-soft)] font-mono">
                  {formatDateCO(purchase.transaction_date)}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-[var(--dim)] mb-1">Fecha de vencimiento</h2>
                <p className="text-[var(--fg-soft)] font-mono">
                  {purchase.due_date ? formatDateCO(purchase.due_date) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center py-2 text-sm text-[var(--dim)]">
                <span>Subtotal (base):</span>
                <span className="text-[var(--fg)] font-mono">{formatCOP(purchase.amount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-[var(--dim)]">
                <span>IVA (`tax_iva`):</span>
                <span className="text-[var(--fg)] font-mono">{formatCOP(purchase.tax_iva)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-[var(--dim)]">
                <span>Retención en la fuente:</span>
                <span className="text-[var(--fg)] font-mono">
                  - {formatCOP(purchase.withholding_tax)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] text-lg">
                <span className="font-medium text-[var(--fg)]">Total a pagar:</span>
                <span className="font-bold text-[var(--sky-deep)] font-mono">
                  {formatCOP(purchase.total)}
                </span>
              </div>
            </div>

            {supportHref && (
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--fg)]">Soporte documental:</span>
                <a
                  href={supportHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--sky-deep)] hover:underline inline-flex items-center gap-1.5 font-medium"
                >
                  <ExternalLinkIcon className="w-4 h-4" /> Ver soporte
                </a>
              </div>
            )}

            {purchase.notes && (
              <div className="pt-4 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--fg)] mb-2">Notas adicionales:</h3>
                <p className="text-sm text-[var(--fg-soft)] bg-[var(--bg)] p-3 rounded-lg">
                  {purchase.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-4 glass-panel">
            <h2 className="font-medium text-[var(--fg)] border-b border-[var(--border)] pb-2">
              Proveedor
            </h2>
            {purchase.suppliers ? (
              <div>
                <Link
                  href={`/admin/proveedores/${purchase.suppliers.id}`}
                  className="text-sm font-semibold text-[var(--sky-deep)] hover:underline"
                >
                  {purchase.suppliers.name}
                </Link>
                {purchase.suppliers.document_number && (
                  <div className="text-sm text-[var(--dim)] font-mono">
                    NIT/CC: {purchase.suppliers.document_number}
                  </div>
                )}
                {purchase.suppliers.phone && (
                  <div className="text-sm text-[var(--dim)]">{purchase.suppliers.phone}</div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[var(--fg)]">
                  {purchase.supplier_name || 'Proveedor Ocasional'}
                </div>
                <div className="text-xs text-[var(--dim)] mt-1 italic">Proveedor Ocasional</div>
              </div>
            )}

            {purchase.invoice_number && (
              <div className="pt-2">
                <div className="text-xs text-[var(--dim)]">Número de factura:</div>
                <div className="text-sm font-medium text-[var(--fg-soft)] font-mono">
                  {purchase.invoice_number}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-sm border border-[var(--border)] space-y-4 glass-panel">
            <h2 className="font-medium text-[var(--fg)] border-b border-[var(--border)] pb-2">
              Registro
            </h2>
            <div className="text-sm text-[var(--fg-soft)]">
              Registrado por: {purchase.profiles?.full_name || 'Sistema'}
            </div>
          </div>

          {purchase.status !== 'pagado' ? (
            <div className="bg-rose-50/50 p-6 rounded-xl shadow-sm border border-rose-200 border-dashed space-y-4">
              <div className="flex items-center gap-2 text-[var(--fg)] font-medium mb-2">
                <DollarSignIcon className="w-5 h-5 text-rose-500" />
                Registrar pago realizado
              </div>
              <p className="text-xs text-[var(--dim)]">
                Confirma que este gasto o factura fue pagado al proveedor.
              </p>

              <form action={handlePayment} className="space-y-3">
                <select name="payment_method" required className="neu-input w-full">
                  <option value="">Seleccionar método...</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="pse">PSE</option>
                  <option value="otro">Otro</option>
                </select>
                <button
                  type="submit"
                  className="w-full py-2 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors text-sm"
                >
                  Confirmar pago
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 text-center">
              <div className="text-emerald-700 font-medium mb-1">Gasto pagado</div>
              <div className="text-xs text-emerald-600 mb-2">
                Pagado el {formatDateCO(purchase.paid_at)} mediante {purchase.payment_method}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
