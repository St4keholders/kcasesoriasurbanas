'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusIcon, UploadCloudIcon, DownloadIcon, EyeIcon, BanIcon, FileTextIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { MasivoModal } from './MasivoModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';
import { ExportCSVModal } from '@/components/admin/ExportCSVModal';
import { deletePurchase } from '@/app/admin/compras/actions';

type Option = { id: string; name: string };

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fdate = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[Number(m) - 1]} ${y}`;
};
const STATUS: Record<string, { l: string; c: string }> = {
  pagado: { l: 'Pagado', c: 'ok' },
  pendiente_pago: { l: 'Crédito pendiente', c: 'pend' },
  anulado: { l: 'Anulado', c: 'void' },
};
const PAGE = 50;

export function ComprasClientView({
  initialPurchases,
  costCenters,
  categories,
}: {
  initialPurchases: any[];
  costCenters: Option[];
  categories: Option[];
}) {
  const [showMasivo, setShowMasivo] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [center, setCenter] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return initialPurchases.filter((p) => {
      if (from && p.transaction_date < from) return false;
      if (to && p.transaction_date > to) return false;
      if (center && p.cost_center_id !== center) return false;
      if (category && p.category_id !== category) return false;
      if (status && p.status !== status) return false;
      if (term) {
        const hay = `${p.purchase_number} ${p.invoice_number || ''} ${p.supplier_name || ''} ${p.concept || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [initialPurchases, q, from, to, center, category, status]);

  const kpi = useMemo(() => {
    const valid = rows.filter((r) => r.status !== 'anulado');
    return {
      n: valid.length,
      total: valid.reduce((a, r) => a + Number(r.total || 0), 0),
      iva: valid.reduce((a, r) => a + Number(r.tax_iva || 0), 0),
      ret: valid.reduce((a, r) => a + Number(r.withholding_tax || 0), 0),
      credito: valid.filter((r) => r.status === 'pendiente_pago').reduce((a, r) => a + Number(r.total || 0), 0),
    };
  }, [rows]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const hasFilters = q || from || to || center || category || status;

  return (
    <div className="erp">
      <div className="erp-head">
        <div>
          <div className="eyebrow">Tesorería</div>
          <h1>Compras y <em>pagos</em></h1>
          <p>Todo lo que se registra aquí ya está pagado: cada compra genera su causación (CC) y su egreso (CE) para revisión del contador.</p>
        </div>
        <div className="erp-actions">
          <button className="erp-btn" onClick={() => setShowExport(true)}><DownloadIcon /> Exportar</button>
          <Link className="erp-btn" href="/admin/compras/nueva"><PlusIcon /> Registro manual</Link>
          <button className="erp-btn primary" onClick={() => setShowMasivo(true)}><UploadCloudIcon /> Cargar facturas</button>
        </div>
      </div>

      <div className="erp-kpis">
        <div className="erp-kpi glass"><div className="l">Operaciones</div><div className="v">{kpi.n}</div></div>
        <div className="erp-kpi glass"><div className="l">Total pagado</div><div className="v">{fmt(kpi.total)}</div></div>
        <div className="erp-kpi glass"><div className="l">IVA de facturas</div><div className="v">{fmt(kpi.iva)}</div></div>
        <div className="erp-kpi glass"><div className="l">Retenciones de facturas</div><div className="v">{fmt(kpi.ret)}</div></div>
        {kpi.credito > 0 && <div className="erp-kpi glass"><div className="l">Crédito por pagar</div><div className="v">{fmt(kpi.credito)}</div></div>}
      </div>

      <div className="erp-toolbar glass">
        <div style={{ position: 'relative' }} className="grow">
          <SearchIcon style={{ position: 'absolute', left: 9, top: 9, width: 15, height: 15, color: 'var(--dim)' }} />
          <input className="erp-input" style={{ width: '100%', paddingLeft: 30 }} placeholder="Buscar proveedor, concepto o número" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <input type="date" className="erp-input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} title="Desde" />
        <input type="date" className="erp-input" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} title="Hasta" />
        <select className="erp-select" value={center} onChange={(e) => { setCenter(e.target.value); setPage(0); }}>
          <option value="">Todos los centros</option>
          {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="erp-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="erp-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Todos los estados</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente_pago">Crédito pendiente</option>
          <option value="anulado">Anulado</option>
        </select>
        {hasFilters && <button className="erp-btn ghost sm" onClick={() => { setQ(''); setFrom(''); setTo(''); setCenter(''); setCategory(''); setStatus(''); }}>Limpiar</button>}
      </div>

      <div className="glass erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Proveedor / concepto</th>
              <th>Categoría</th>
              <th>Centro</th>
              <th className="num">Total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {view.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.purchase_number}<div className="muted">{p.invoice_number ? `Fact. ${p.invoice_number}` : ''}</div></td>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fdate(p.transaction_date)}</td>
                <td style={{ maxWidth: 340 }}>
                  <div style={{ fontWeight: 600 }}>{p.supplier_name || 'Sin proveedor'}</div>
                  <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.concept}</div>
                </td>
                <td className="muted">{p.expense_categories?.name || '-'}</td>
                <td className="muted">{p.cost_centers?.name || '-'}</td>
                <td className="num" style={{ fontWeight: 700 }}>{fmt(p.total)}</td>
                <td><span className={`chip ${STATUS[p.status]?.c || 'info'}`}>{STATUS[p.status]?.l || p.status}</span></td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <a className="erp-btn ghost sm" href={`/api/contabilidad/operacion/pdf?source=purchases&id=${p.id}`} target="_blank" rel="noreferrer" title="Comprobante PDF"><FileTextIcon /></a>
                  <button className="erp-btn ghost sm" onClick={() => setDetail(p)} title="Ver / editar"><EyeIcon /></button>
                  {p.status !== 'anulado' && (
                    <button className="erp-btn ghost sm" title="Anular" onClick={async () => {
                      const motivo = window.prompt('Motivo de la anulación:');
                      if (!motivo?.trim()) return;
                      try { await deletePurchase(p.id, motivo.trim()); window.location.reload(); } catch (e) { alert(e instanceof Error ? e.message : 'No se pudo anular'); }
                    }}><BanIcon style={{ color: 'var(--danger)' }} /></button>
                  )}
                </td>
              </tr>
            ))}
            {!view.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>No hay compras con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--dim)' }}>
        <span>{rows.length} registros</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="erp-btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeftIcon /></button>
          Página {page + 1} de {pages}
          <button className="erp-btn sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRightIcon /></button>
        </span>
      </div>

      {showMasivo && (
        <MasivoModal target="compras" categories={categories} costCenters={costCenters} onClose={() => setShowMasivo(false)} />
      )}

      {detail && (
        <PurchaseDetailModal
          purchase={detail}
          costCenters={costCenters}
          suppliers={[]}
          onClose={() => setDetail(null)}
          onSave={() => { setDetail(null); window.location.reload(); }}
        />
      )}

      <ExportCSVModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={rows}
        title="Exportar compras a Excel"
        filename="tesoreria_kc"
        dateField="transaction_date"
        columnsMap={{
          purchase_number: 'Número',
          invoice_number: 'Factura',
          transaction_date: 'Fecha',
          supplier_name: 'Proveedor',
          concept: 'Concepto',
          'expense_categories.name': 'Categoría',
          'cost_centers.name': 'Centro de costo',
          amount: 'Base',
          tax_iva: 'IVA',
          withholding_tax: 'Retención',
          total: 'Total',
          status: 'Estado',
        }}
      />
    </div>
  );
}
