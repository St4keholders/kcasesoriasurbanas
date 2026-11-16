'use client';

import React, { useState, useMemo } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import {
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  AlertTriangleIcon,
} from 'lucide-react';

interface UnifiedPaymentItem {
  id: string;
  origin: 'tesoreria' | 'caja_menor' | 'ce';
  originLabel: string;
  date: string;
  documentNumber: string;
  costCenterName: string;
  concept: string;
  subtotal: number;
  taxIva: number;
  withholdingTax: number;
  total: number;
  supportUrl: string | null;
  pdfUrl: string;
  status: string;
}

export function ProveedorDetailClientView({
  supplier,
  purchases,
  pettyCashEntries,
  ceEntries,
  pendientes,
}: {
  supplier: {
    id: string;
    name: string;
    document_number: string | null;
    nit_normalized?: string | null;
    dv?: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    has_rut: boolean;
    is_billing_obligated: boolean;
  };
  purchases: Array<Record<string, unknown>>;
  pettyCashEntries: Array<Record<string, unknown>>;
  ceEntries: Array<Record<string, unknown>>;
  pendientes: Array<Record<string, unknown>>;
}) {
  const [originFilter, setOriginFilter] = useState<'todos' | 'tesoreria' | 'caja_menor' | 'ce'>('todos');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  const allPayments = useMemo<UnifiedPaymentItem[]>(() => {
    const items: UnifiedPaymentItem[] = [];

    for (const p of purchases) {
      const id = String(p.id);
      const supportPath = p.support_storage_path as string | null;
      const supportUrl = supportPath
        ? `/api/soportes/view?path=${encodeURIComponent(supportPath)}`
        : (p.invoice_url as string | null) || (p.legacy_drive_url as string | null) || null;
      const ccName = ((p.cost_centers as { name?: string } | null)?.name) || 'Medellín';

      items.push({
        id: `purch-${id}`,
        origin: 'tesoreria',
        originLabel: 'Compra / Tesorería',
        date: String(p.transaction_date || ''),
        documentNumber: String(p.purchase_number || p.invoice_number || 'S/N'),
        costCenterName: ccName,
        concept: String(p.concept || ''),
        subtotal: Number(p.amount) || 0,
        taxIva: Number(p.tax_iva) || 0,
        withholdingTax: Number(p.withholding_tax) || 0,
        total: Number(p.total) || 0,
        supportUrl,
        pdfUrl: `/api/contabilidad/comprobantes/${id}/pdf?source=purchase`,
        status: String(p.status || 'pagado'),
      });
    }

    for (const e of pettyCashEntries) {
      const id = String(e.id);
      const supportPath = e.support_storage_path as string | null;
      const supportUrl = supportPath
        ? `/api/soportes/view?path=${encodeURIComponent(supportPath)}`
        : (e.receipt_url as string | null) || (e.legacy_drive_url as string | null) || null;
      const box = e.petty_cash_boxes as {
        box_number?: number;
        cost_centers?: { name?: string } | null;
      } | null;

      items.push({
        id: `pc-${id}`,
        origin: 'caja_menor',
        originLabel: `Caja Menor #${box?.box_number ?? ''}`,
        date: String(e.entry_date || ''),
        documentNumber: String(e.invoice_number || `CM-${box?.box_number ?? ''}`),
        costCenterName: box?.cost_centers?.name || 'Medellín',
        concept: String(e.concept || ''),
        subtotal: Math.max(0, (Number(e.total_amount) || 0) - (Number(e.tax_amount) || 0)),
        taxIva: Number(e.tax_amount) || 0,
        withholdingTax: 0,
        total: Number(e.total_amount) || 0,
        supportUrl,
        pdfUrl: `/api/contabilidad/comprobantes/${id}/pdf?source=petty_cash_entry`,
        status: String(e.status || 'activo'),
      });
    }

    for (const ce of ceEntries) {
      const id = String(ce.id);
      items.push({
        id: `ce-${id}`,
        origin: 'ce',
        originLabel: 'Comprobante Egreso (CE)',
        date: String(ce.entry_date || ''),
        documentNumber: String(ce.entry_number || 'CE'),
        costCenterName: ((ce.cost_centers as { name?: string } | null)?.name) || 'Medellín',
        concept: String(ce.concept || ''),
        subtotal: Number(ce.total_debit) || 0,
        taxIva: 0,
        withholdingTax: 0,
        total: Number(ce.total_debit) || 0,
        supportUrl: (ce.support_url as string | null) || null,
        pdfUrl: `/api/contabilidad/comprobantes/${id}/pdf`,
        status: String(ce.status || 'borrador'),
      });
    }

    return items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [purchases, pettyCashEntries, ceEntries]);

  const filteredPayments = useMemo(() => {
    return allPayments.filter((item) => {
      if (originFilter !== 'todos' && item.origin !== originFilter) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      return true;
    });
  }, [allPayments, originFilter, dateFrom, dateTo]);

  // KPIs 2026 sobre compras + cajas menores reales (sin duplicar CE en la suma de pagos operativos)
  const kpis2026 = useMemo(() => {
    const operational = allPayments.filter(
      (i) =>
        (i.origin === 'tesoreria' || i.origin === 'caja_menor') &&
        i.date >= '2026-01-01' &&
        i.date <= '2026-12-31'
    );
    const totalPagado = operational.reduce((acc, i) => acc + i.total, 0);
    const totalRetenciones = operational.reduce((acc, i) => acc + i.withholdingTax, 0);
    const numeroPagos = operational.length;
    const ultimoPago = operational[0]?.date || null;
    return { totalPagado, totalRetenciones, numeroPagos, ultimoPago };
  }, [allPayments]);

  const handleExportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Pagos Tercero 2026');
    ws.addRow([`FICHA DE TERCERO: ${supplier.name} (${supplier.document_number || 'Sin NIT'})`]);
    ws.addRow([]);
    ws.addRow([
      'Fecha',
      'Origen',
      'Documento / Consecutivo',
      'Centro de Costo',
      'Concepto',
      'Subtotal',
      'IVA',
      'Retención',
      'Total Pagado',
      'Estado',
    ]);
    for (const item of filteredPayments) {
      ws.addRow([
        item.date,
        item.originLabel,
        item.documentNumber,
        item.costCenterName,
        item.concept,
        item.subtotal,
        item.taxIva,
        item.withholdingTax,
        item.total,
        item.status,
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pagos-2026-${supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/proveedores"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--fg-soft)] hover:text-[var(--sky-deep)]"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Volver al directorio de terceros
        </Link>
      </div>

      <AdminTopbar
        eyebrow={`— TERCERO · NIT/DOC: ${supplier.document_number || 'PENDIENTE DE IDENTIFICAR'}`}
        title={<span>{supplier.name}</span>}
        subtitle={`Correo: ${supplier.email || 'No registrado'} · Teléfono: ${supplier.phone || 'No registrado'} · Dirección: ${supplier.address || 'No registrada'}`}
        action={
          <div className="flex flex-wrap gap-2">
            {ceEntries[0] && (
              <a
                href={`/api/contabilidad/comprobantes/${String(ceEntries[0].id)}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <FileTextIcon className="w-4 h-4" /> Descargar comprobante
              </a>
            )}
            <button
              type="button"
              onClick={handleExportXlsx}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <DownloadIcon className="w-4 h-4" /> Exportar pagos a XLSX
            </button>
          </div>
        }
      />

      {/* KPIs 2026 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card glass-panel p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--dim)] mb-1">
            Total pagado 2026
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--fg)]">
            {formatCOP(kpis2026.totalPagado)}
          </div>
        </div>
        <div className="card glass-panel p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--dim)] mb-1">
            Número de pagos 2026
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--fg)]">
            {kpis2026.numeroPagos}
          </div>
        </div>
        <div className="card glass-panel p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--dim)] mb-1">
            Último pago registrado
          </div>
          <div className="text-xl font-bold font-mono text-[var(--fg)]">
            {kpis2026.ultimoPago ? formatDateCO(kpis2026.ultimoPago) : 'Sin pagos'}
          </div>
        </div>
        <div className="card glass-panel p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--dim)] mb-1">
            Retenciones practicadas 2026
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--sky-deep)]">
            {formatCOP(kpis2026.totalRetenciones)}
          </div>
        </div>
      </div>

      {/* Pendientes legales de este tercero */}
      {pendientes.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-4 h-4" />
              Pendientes legales y contables asociados ({pendientes.length})
            </span>
            <Link
              href={`/admin/contabilidad/pendientes?thirdPartyId=${supplier.id}`}
              className="text-xs font-semibold text-[var(--sky-deep)] hover:underline"
            >
              Ver en tablero de pendientes →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(pendientes.map((p) => String(p.motivo)))).map((motivo) => (
              <span
                key={motivo}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/80 text-amber-900 border border-amber-500/30"
              >
                {motivo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de pagos */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 glass-panel p-3 rounded-2xl">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'todos', label: `Todos los registros (${allPayments.length})` },
            { id: 'tesoreria', label: `Tesorería / Compras (${purchases.length})` },
            { id: 'caja_menor', label: `Cajas Menores (${pettyCashEntries.length})` },
            { id: 'ce', label: `Comprobantes de Egreso CE (${ceEntries.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOriginFilter(tab.id as typeof originFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                originFilter === tab.id
                  ? 'bg-[var(--sky-deep)] text-white'
                  : 'text-[var(--fg-soft)] hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input text-xs py-1 px-2"
          />
          <span>a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input text-xs py-1 px-2"
          />
        </div>
      </div>

      {/* Tabla consolidada de pagos */}
      <div className="card overflow-x-auto glass-panel">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
              <th className="p-3">Fecha</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Centro de Costo</th>
              <th className="p-3">Concepto</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">IVA</th>
              <th className="p-3 text-right">Retención</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Soporte / PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredPayments.map((item) => (
              <tr key={item.id} className="hover:bg-white/50">
                <td className="p-3 font-mono text-xs whitespace-nowrap">
                  {formatDateCO(item.date)}
                </td>
                <td className="p-3 text-xs font-medium text-[var(--fg-soft)]">
                  {item.originLabel}
                </td>
                <td className="p-3 font-mono text-xs font-semibold">{item.documentNumber}</td>
                <td className="p-3 text-xs text-[var(--dim)]">{item.costCenterName}</td>
                <td className="p-3 text-xs max-w-xs truncate" title={item.concept}>
                  {item.concept}
                </td>
                <td className="p-3 text-right font-mono text-xs">{formatCOP(item.subtotal)}</td>
                <td className="p-3 text-right font-mono text-xs">{formatCOP(item.taxIva)}</td>
                <td className="p-3 text-right font-mono text-xs">
                  {formatCOP(item.withholdingTax)}
                </td>
                <td className="p-3 text-right font-mono text-xs font-bold text-[var(--fg)]">
                  {formatCOP(item.total)}
                </td>
                <td className="p-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    {item.supportUrl && (
                      <a
                        href={item.supportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost text-xs px-2 py-1 inline-flex items-center gap-1"
                        title="Ver soporte adjunto"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> Soporte
                      </a>
                    )}
                    <a
                      href={item.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      title="Descargar comprobante PDF"
                    >
                      <FileTextIcon className="w-3.5 h-3.5" /> Descargar comprobante
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
