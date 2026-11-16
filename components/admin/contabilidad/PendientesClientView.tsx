'use client';

import React from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  AlertCircleIcon,
} from 'lucide-react';

export interface MotivoSummary {
  motivo: string;
  count: number;
  totalAmount: number;
}

export function PendientesClientView({
  rows,
  summaryByMotivo,
  costCenters,
  currentFilters,
}: {
  rows: Array<Record<string, unknown>>;
  summaryByMotivo: Array<{ motivo: string; count: number; totalAmount: number }>;
  costCenters: Array<{ id: string; name: string }>;
  currentFilters: { motivo: string; costCenterId: string; thirdPartyId: string };
}) {
  const handleExportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const wsSummary = wb.addWorksheet('Resumen por Motivo');
    wsSummary.addRow(['Motivo Legal / Contable', 'Cantidad de Hallazgos', 'Valor Total (COP)']);
    for (const s of summaryByMotivo) {
      wsSummary.addRow([s.motivo, s.count, s.totalAmount]);
    }

    const wsDetail = wb.addWorksheet('Detalle Pendientes 2026');
    wsDetail.addRow([
      'Motivo',
      'Fecha',
      'Documento / Ref',
      'Tercero',
      'NIT',
      'Centro de Costo',
      'Concepto',
      'Valor (COP)',
      'Detalle Técnico',
    ]);
    for (const r of rows) {
      wsDetail.addRow([
        String(r.motivo || ''),
        String(r.record_date || ''),
        String(r.document_ref || ''),
        String(r.third_party_name || ''),
        String(r.third_party_nit || ''),
        String(r.cost_center_name || 'Medellín'),
        String(r.concept || ''),
        Number(r.amount) || 0,
        String(r.detalle || ''),
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KC-Pendientes-Legales-2026.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRowActionHref = (row: Record<string, unknown>): { href: string; label: string } => {
    const motivo = String(row.motivo || '');
    const sourceTable = String(row.source_table || '');
    const sourceId = String(row.source_id || '');
    const tpId = String(row.third_party_id || '');

    if (
      motivo.includes('tercero') &&
      tpId &&
      tpId !== 'null'
    ) {
      return { href: `/admin/proveedores/${tpId}`, label: 'Completar tercero' };
    }
    if (motivo === 'confianza baja' || motivo === 'borrador sin contabilizar') {
      return { href: '/admin/contabilidad/borradores', label: 'Revisar borrador' };
    }
    if (sourceTable === 'purchases' && sourceId) {
      return { href: `/admin/compras/${sourceId}`, label: 'Abrir compra' };
    }
    return { href: '/admin/caja-menor', label: 'Abrir caja menor' };
  };

  return (
    <>
      <AdminTopbar
        eyebrow="— CONTABILIDAD · AUDITORÍA TRIBUTARIA Y DOCUMENTAL (FASE 7)"
        title={
          <span>
            Pendientes <em>legales y tributarios 2026</em>
          </span>
        }
        subtitle="Consolidado en vivo de la vista v_pendientes_legales: soportes faltantes, documento soporte Res. DIAN 000167, RUT/DV, retenciones y gastos no deducibles."
        action={
          <button
            type="button"
            onClick={handleExportXlsx}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <DownloadIcon className="w-4 h-4" /> Exportar pendientes a XLSX
          </button>
        }
      />

      {/* Tarjetas de totales por motivo y valor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summaryByMotivo.map((item) => {
          const active = currentFilters.motivo === item.motivo;
          return (
            <Link
              key={item.motivo}
              href={
                active
                  ? '/admin/contabilidad/pendientes'
                  : `/admin/contabilidad/pendientes?motivo=${encodeURIComponent(item.motivo)}`
              }
              className={`card p-4 transition-all border ${
                active
                  ? 'glass-panel border-[var(--sky-deep)] ring-2 ring-[var(--sky)]/30'
                  : 'glass-panel hover:border-[var(--sky)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--fg)] leading-snug">
                  {item.motivo}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-900 shrink-0">
                  {item.count}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-[var(--sky-deep)]">
                {formatCOP(item.totalAmount)}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 glass-panel p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--fg-soft)] flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4 text-[var(--sky-deep)]" />
            Centro de costo:
          </span>
          <Link
            href={`/admin/contabilidad/pendientes${
              currentFilters.motivo ? `?motivo=${encodeURIComponent(currentFilters.motivo)}` : ''
            }`}
            className={`px-3 py-1 rounded-xl font-medium ${
              !currentFilters.costCenterId
                ? 'bg-[var(--sky-deep)] text-white'
                : 'text-[var(--fg-soft)] hover:bg-white/60'
            }`}
          >
            Todos
          </Link>
          {costCenters.map((cc) => (
            <Link
              key={cc.id}
              href={`/admin/contabilidad/pendientes?costCenterId=${cc.id}${
                currentFilters.motivo ? `&motivo=${encodeURIComponent(currentFilters.motivo)}` : ''
              }`}
              className={`px-3 py-1 rounded-xl font-medium ${
                currentFilters.costCenterId === cc.id
                  ? 'bg-[var(--sky-deep)] text-white'
                  : 'text-[var(--fg-soft)] hover:bg-white/60'
              }`}
            >
              {cc.name}
            </Link>
          ))}
        </div>

        {(currentFilters.motivo || currentFilters.costCenterId || currentFilters.thirdPartyId) && (
          <Link
            href="/admin/contabilidad/pendientes"
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      {/* Tabla de hallazgos con acciones por fila */}
      <div className="card overflow-x-auto glass-panel">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
              <th className="p-3">Motivo</th>
              <th className="p-3">Fecha / Ref.</th>
              <th className="p-3">Tercero</th>
              <th className="p-3">Centro Costo</th>
              <th className="p-3">Concepto y Detalle</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r, idx) => {
              const action = getRowActionHref(r);
              const sourceId = String(r.source_id || '');
              const sourceTable = String(r.source_table || '');
              const pdfHref =
                sourceTable === 'purchases'
                  ? `/api/contabilidad/comprobantes/${sourceId}/pdf?source=purchase`
                  : sourceTable === 'petty_cash_entries'
                  ? `/api/contabilidad/comprobantes/${sourceId}/pdf?source=petty_cash_entry`
                  : null;

              return (
                <tr key={`${sourceId}-${String(r.motivo)}-${idx}`} className="hover:bg-white/50">
                  <td className="p-3">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 border border-amber-500/30">
                      {String(r.motivo)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-xs text-[var(--fg)]">
                      {String(r.document_ref || 'S/N')}
                    </div>
                    <div className="text-xs font-mono text-[var(--dim)]">
                      {formatDateCO(String(r.record_date || ''))}
                    </div>
                  </td>
                  <td className="p-3 max-w-[180px]">
                    <div className="font-semibold text-xs text-[var(--fg)] truncate">
                      {String(r.third_party_name || 'Proveedor Ocasional')}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--dim)]">
                      {String(r.third_party_nit || 'Sin NIT')}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-[var(--dim)]">
                    {String(r.cost_center_name || 'Medellín')}
                  </td>
                  <td className="p-3 max-w-md">
                    <div className="font-medium text-xs text-[var(--fg)] truncate">
                      {String(r.concept || '')}
                    </div>
                    <div className="text-[11px] text-[var(--dim)]">{String(r.detalle || '')}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-xs whitespace-nowrap">
                    {formatCOP(Number(r.amount) || 0)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={action.href}
                        className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> {action.label}
                      </Link>
                      {pdfHref && (
                        <a
                          href={pdfHref}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost text-xs px-2 py-1"
                          title="Ver comprobante PDF"
                        >
                          <FileTextIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
