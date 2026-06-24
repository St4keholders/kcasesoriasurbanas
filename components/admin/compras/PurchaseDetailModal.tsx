'use client';

import React, { useState } from 'react';
import { XIcon, SaveIcon, DollarSignIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { updatePurchase, payPurchase } from '@/app/admin/compras/actions';

interface PurchaseDetailModalProps {
  purchase: any;
  costCenters: any[];
  suppliers: any[];
  onClose: () => void;
  onSave: () => void;
}

export function PurchaseDetailModal({ purchase, costCenters, suppliers, onClose, onSave }: PurchaseDetailModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: purchase.supplier_name || purchase.suppliers?.name || '',
    invoice_number: purchase.invoice_number || '',
    cost_center_id: purchase.cost_center_id || '',
    transaction_date: purchase.transaction_date || '',
    due_date: purchase.due_date || '',
    concept: purchase.concept || '',
    transaction_type: purchase.transaction_type || 'costo_gasto',
    amount: purchase.amount || 0,
    tax_iva: purchase.tax_iva || 0,
    withholding_tax: purchase.withholding_tax || 0,
    total: purchase.total || 0,
    notes: purchase.notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['amount', 'tax_iva', 'withholding_tax', 'total'].includes(name) ? Number(value) : value
    }));
  };

  const calculateTotal = () => {
    setFormData(prev => ({ ...prev, total: Number(prev.amount) + Number(prev.tax_iva) - Number(prev.withholding_tax) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePurchase(purchase.id, formData);
      onSave();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const method = fd.get('payment_method') as string;
    try {
      await payPurchase(purchase.id, method);
      onSave();
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)] shrink-0 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--fg)]">Detalle de Compra</h2>
              <StatusBadge status={purchase.status} />
            </div>
            <p className="text-sm text-[var(--dim)] mt-1">{purchase.purchase_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--dim)]">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <form id="purchase-form" onSubmit={handleSubmit} className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Proveedor</label>
                    <input type="text" list="suppliers-list" name="supplier_name" value={formData.supplier_name} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                    <datalist id="suppliers-list">
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Nº Factura</label>
                    <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                  </div>
                  
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Concepto / Descripción</label>
                    <input type="text" name="concept" value={formData.concept} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                  </div>
                  
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Tipo de Transacción</label>
                    <select name="transaction_type" value={formData.transaction_type} onChange={handleChange} className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required>
                      <option value="costo_gasto">Costo / Gasto</option>
                      <option value="inversion">Inversión</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Fecha Factura</label>
                    <input type="date" name="transaction_date" value={formData.transaction_date} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Fecha Vencimiento</label>
                    <input type="date" name="due_date" value={formData.due_date || ''} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1">Centro de Costos</label>
                    <select name="cost_center_id" value={formData.cost_center_id || ''} onChange={handleChange} className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required>
                      <option value="">Seleccione uno...</option>
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 border-t border-[var(--border)] pt-4 mt-2">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--dim)] mb-1">Subtotal</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} onBlur={calculateTotal} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--dim)] mb-1">IVA</label>
                        <input type="number" name="tax_iva" value={formData.tax_iva} onChange={handleChange} onBlur={calculateTotal} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--dim)] mb-1">Retención</label>
                        <input type="number" name="withholding_tax" value={formData.withholding_tax} onChange={handleChange} onBlur={calculateTotal} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--fg)] mb-1">Total</label>
                        <input type="number" name="total" value={formData.total} onChange={handleChange} className="w-full px-3 py-2 bg-[var(--primary)]/5 border border-[var(--primary)]/30 rounded-lg text-[var(--primary)] font-bold text-sm focus:outline-none transition-colors" required />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--fg)] mb-1 flex items-center justify-between">
                      Notas Adicionales
                      {purchase.notes?.includes('http') && (
                        <a href={purchase.notes.match(/https?:\/\/[^\s]+/)?.[0]} target="_blank" rel="noreferrer" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                          <ExternalLinkIcon className="w-3 h-3" /> Abrir Archivo
                        </a>
                      )}
                    </label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-[var(--fg)] text-sm focus:border-[var(--primary)] outline-none transition-colors resize-none"></textarea>
                  </div>
                </div>
              </form>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {purchase.status !== 'pagado' ? (
                <div className="bg-rose-500/5 p-6 rounded-xl border border-rose-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-rose-500 font-medium mb-2">
                    <DollarSignIcon className="w-5 h-5" /> Registrar Pago
                  </div>
                  <p className="text-xs text-[var(--dim)]">Confirma que este gasto ha sido pagado al proveedor.</p>
                  
                  <form onSubmit={handlePayment} className="space-y-3">
                    <select name="payment_method" required className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:border-rose-500 outline-none transition-colors text-sm text-[var(--fg)]">
                      <option value="">Método de pago...</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="tarjeta">Tarjeta de Crédito</option>
                      <option value="efectivo">Caja Menor / Efectivo</option>
                      <option value="cheque">Cheque</option>
                      <option value="otro">Otro</option>
                    </select>
                    <button type="submit" className="w-full py-2 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors text-sm">
                      Confirmar Pago
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-emerald-500/5 p-6 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-emerald-500 font-medium mb-1 flex items-center justify-center gap-2">
                    <StatusBadge status="pagado" />
                  </div>
                  <div className="text-xs text-[var(--dim)] mt-3">
                    Pagado el {new Date(purchase.paid_at).toLocaleDateString()} mediante {purchase.payment_method}.
                  </div>
                </div>
              )}

              <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                 <h3 className="text-sm font-medium text-[var(--fg)] mb-2">Auditoría</h3>
                 <div className="text-xs text-[var(--dim)] space-y-1">
                   <p>Registrado por: {purchase.profiles?.full_name || 'Desconocido'}</p>
                   <p>Fecha de creación: {new Date(purchase.created_at).toLocaleString()}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)] shrink-0 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="neu-btn" disabled={isSaving}>Cancelar</button>
          <button type="submit" form="purchase-form" className="neu-btn-primary flex items-center gap-2" disabled={isSaving}>
            {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
