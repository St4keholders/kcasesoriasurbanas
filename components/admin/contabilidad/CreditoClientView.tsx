'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, Loader2Icon } from 'lucide-react';
import { createCreditPurchaseAction } from '@/app/admin/contabilidad/actions';
import { uploadSupportDirect } from '@/lib/utils/client-storage';

type Option = { id: string; name: string };
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const today = new Date().toISOString().slice(0, 10);

export function CreditoClientView({ rows, categories, costCenters }: { rows: any[]; categories: Option[]; costCenters: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({
    supplier_name: '', supplier_document: '', invoice_number: '', transaction_date: today, due_date: '',
    concept: '', category_id: categories[0]?.id || '', cost_center_id: '', amount: 0, tax_iva: 0, withholding_tax: 0,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const submit = () =>
    start(async () => {
      setMsg(null);
      let support = { support_storage_path: '', support_sha256: '' };
      if (file) {
        const up = await uploadSupportDirect(file, 'compras');
        support = { support_storage_path: up.storagePath, support_sha256: up.sha256 };
      }
      const res = await createCreditPurchaseAction({ ...f, ...support });
      if (!res.ok) { setMsg(res.error); return; }
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="erp">
      <div className="erp-head">
        <div>
          <div className="eyebrow">Contabilidad</div>
          <h1>Compras a <em>crédito</em></h1>
          <p>Registra aquí solo las facturas que no se pagan de contado. Se causan de inmediato (CC); cuando Tesorería registre el pago se genera el egreso (CE).</p>
        </div>
        <div className="erp-actions">
          <button className="erp-btn primary" onClick={() => setOpen(true)}><PlusIcon /> Nueva compra a crédito</button>
        </div>
      </div>

      <div className="glass erp-table-wrap">
        <table className="erp-table">
          <thead><tr><th>Número</th><th>Proveedor / concepto</th><th>Factura</th><th>Vence</th><th className="num">Total</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.purchase_number}</td>
                <td><div style={{ fontWeight: 600 }}>{r.supplier_name}</div><div className="muted">{r.concept}</div></td>
                <td className="mono">{r.invoice_number || '-'}</td>
                <td className="mono">{r.due_date}</td>
                <td className="num">{fmt(r.total)}</td>
                <td><span className={`chip ${r.status === 'pagado' ? 'ok' : r.status === 'anulado' ? 'void' : 'pend'}`}>{r.status === 'pagado' ? 'Pagada' : r.status === 'anulado' ? 'Anulada' : 'Por pagar en Tesorería'}</span></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--dim)' }}>No hay compras a crédito.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="erp-overlay" onClick={() => setOpen(false)}>
          <div className="glass erp-form" style={{ margin: 'auto', width: 'min(640px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Nueva compra a crédito</div>
            {msg && <div className="erp-alert error">{msg}</div>}
            <div className="erp-grid">
              <div className="erp-field"><label>Proveedor *</label><input className="erp-input" value={f.supplier_name} onChange={(e) => set({ supplier_name: e.target.value })} /></div>
              <div className="erp-field"><label>NIT / CC</label><input className="erp-input" value={f.supplier_document} onChange={(e) => set({ supplier_document: e.target.value })} /></div>
              <div className="erp-field"><label>Factura N.º *</label><input className="erp-input" value={f.invoice_number} onChange={(e) => set({ invoice_number: e.target.value })} /></div>
              <div className="erp-field"><label>Categoría *</label>
                <select className="erp-select" value={f.category_id} onChange={(e) => set({ category_id: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div className="erp-field"><label>Fecha factura *</label><input type="date" className="erp-input" value={f.transaction_date} onChange={(e) => set({ transaction_date: e.target.value })} /></div>
              <div className="erp-field"><label>Vencimiento *</label><input type="date" className="erp-input" value={f.due_date} onChange={(e) => set({ due_date: e.target.value })} /></div>
              <div className="erp-field full"><label>Concepto *</label><input className="erp-input" value={f.concept} onChange={(e) => set({ concept: e.target.value })} /></div>
              <div className="erp-field"><label>Centro de costo</label>
                <select className="erp-select" value={f.cost_center_id} onChange={(e) => set({ cost_center_id: e.target.value })}><option value="">Sin centro</option>{costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div className="erp-field"><label>Base *</label><input type="number" className="erp-input" value={f.amount} onChange={(e) => set({ amount: Number(e.target.value) })} /></div>
              <div className="erp-field"><label>IVA de la factura</label><input type="number" className="erp-input" value={f.tax_iva} onChange={(e) => set({ tax_iva: Number(e.target.value) })} /></div>
              <div className="erp-field"><label>Retención de la factura</label><input type="number" className="erp-input" value={f.withholding_tax} onChange={(e) => set({ withholding_tax: Number(e.target.value) })} /></div>
              <div className="erp-field full"><label>Soporte</label><input type="file" accept="image/*,application/pdf,.xml,.zip" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>Total a pagar: <b>{fmt(f.amount + f.tax_iva - f.withholding_tax)}</b></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="erp-btn" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="erp-btn primary" onClick={submit} disabled={busy}>{busy && <Loader2Icon className="animate-spin" />} Causar compra</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
