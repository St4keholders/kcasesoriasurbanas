'use client';

import React, { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  DownloadIcon,
  FileTextIcon,
  FolderArchiveIcon,
  SearchIcon,
} from 'lucide-react';

interface JournalLineItem {
  id: string;
  line_order: number;
  account_code: string;
  description: string | null;
  debit: number;
  credit: number;
  base_amount: number;
  is_deductible: boolean;
}

interface JournalEntryRow {
  id: string;
  entry_number: string;
  entry_type: string;
  entry_date: string;
  status: string;
  concept: string;
  total_debit: number;
  total_credit: number;
  third_parties?: { id: string; name: string; document_number: string | null } | null;
  cost_centers?: { id: string; name: string } | null;
  journal_lines?: JournalLineItem[];
}

interface TrialBalanceRow {
  code: string;
  name: string;
  nature: string;
  debit: number;
  credit: number;
}

interface ThirdPartyLedgerRow {
  id: string;
  name: string;
  document_number: string | null;
  debit: number;
  credit: number;
}

export function LibroDiarioClientView({
  entries,
  totalCount,
  currentPage,
  pageSize,
  filters,
  accounts,
  costCenters,
  thirdParties,
  trialBalance,
  thirdPartyLedger,
}: {
  entries: JournalEntryRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: {
    from: string;
    to: string;
    type: string;
    thirdPartyId: string;
    accountCode: string;
    costCenterId: string;
    status: string;
    tab: string;
  };
  accounts: Array<{ code: string; name: string; account_class: number; nature: string }>;
  costCenters: Array<{ id: string; name: string }>;
  thirdParties: Array<{ id: string; name: string; document_number: string | null }>;
  trialBalance: TrialBalanceRow[];
  thirdPartyLedger: ThirdPartyLedgerRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'diario' | 'mayor' | 'auxiliar' | 'balance'>(
    (filters.tab as 'diario' | 'mayor' | 'auxiliar' | 'balance') || 'diario'
  );
  const [formFilters, setFormFilters] = useState(filters);
  const [azProgress, setAzProgress] = useState<number | null>(null);
  const [azStatusText, setAzStatusText] = useState<string>('');

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageTotalDebit = entries.reduce((acc, e) => acc + (Number(e.total_debit) || 0), 0);
  const pageTotalCredit = entries.reduce((acc, e) => acc + (Number(e.total_credit) || 0), 0);

  const trialTotalDebit = trialBalance.reduce((acc, r) => acc + r.debit, 0);
  const trialTotalCredit = trialBalance.reduce((acc, r) => acc + r.credit, 0);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (formFilters.from) qs.set('from', formFilters.from);
    if (formFilters.to) qs.set('to', formFilters.to);
    if (formFilters.type) qs.set('type', formFilters.type);
    if (formFilters.thirdPartyId) qs.set('thirdPartyId', formFilters.thirdPartyId);
    if (formFilters.accountCode) qs.set('accountCode', formFilters.accountCode);
    if (formFilters.costCenterId) qs.set('costCenterId', formFilters.costCenterId);
    if (formFilters.status) qs.set('status', formFilters.status);
    qs.set('tab', activeTab);
    qs.set('page', '1');
    router.push(`/admin/contabilidad/libro-diario?${qs.toString()}`);
  };

  const handleExportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Libro Diario KC 2026');

    ws.addRow(['KC ASESORÍAS URBANAS S.A.S — NIT 902012620-0']);
    ws.addRow([`LIBRO DIARIO Y BALANCE (${formFilters.from} a ${formFilters.to})`]);
    ws.addRow([]);

    if (activeTab === 'diario') {
      ws.addRow([
        'Fecha',
        'Tipo',
        'Comprobante',
        'Estado',
        'Tercero',
        'NIT',
        'Centro de Costo',
        'Cuenta',
        'Detalle',
        'Débito',
        'Crédito',
      ]);
      for (const entry of entries) {
        for (const line of entry.journal_lines || []) {
          ws.addRow([
            entry.entry_date,
            entry.entry_type,
            entry.entry_number,
            entry.status,
            entry.third_parties?.name || 'Proveedor Ocasional',
            entry.third_parties?.document_number || '',
            entry.cost_centers?.name || 'Medellín',
            line.account_code,
            line.description || entry.concept,
            Number(line.debit) || 0,
            Number(line.credit) || 0,
          ]);
        }
      }
    } else if (activeTab === 'balance' || activeTab === 'mayor') {
      ws.addRow(['Código PUC', 'Cuenta Contable', 'Naturaleza', 'Débito', 'Crédito', 'Saldo Neto']);
      for (const row of trialBalance) {
        const net = row.nature === 'debito' ? row.debit - row.credit : row.credit - row.debit;
        ws.addRow([row.code, row.name, row.nature, row.debit, row.credit, net]);
      }
    } else {
      ws.addRow(['Tercero', 'NIT / Documento', 'Total Débito', 'Total Crédito', 'Movimiento Neto']);
      for (const row of thirdPartyLedger) {
        ws.addRow([row.name, row.document_number || '', row.debit, row.credit, row.debit - row.credit]);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KC-${activeTab}-${formFilters.from}-a-${formFilters.to}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let folio = 1;
    let page = pdfDoc.addPage([612, 792]);
    let y = 740;

    const drawHeader = (p: typeof page, folioNum: number) => {
      p.drawText('KC ASESORIAS URBANAS S.A.S - NIT 902012620-0', {
        x: 50,
        y: 750,
        size: 12,
        font: fontBold,
        color: rgb(0.08, 0.16, 0.24),
      });
      p.drawText(`FOLIO #${String(folioNum).padStart(4, '0')}`, {
        x: 495,
        y: 750,
        size: 10,
        font: fontBold,
        color: rgb(0.12, 0.38, 0.62),
      });
      p.drawText(
        `LIBRO DIARIO OFICIAL | Rango: ${formatDateCO(formFilters.from)} a ${formatDateCO(formFilters.to)}`,
        {
          x: 50,
          y: 735,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.4, 0.5),
        }
      );
      p.drawLine({
        start: { x: 50, y: 726 },
        end: { x: 562, y: 726 },
        thickness: 1,
        color: rgb(0.22, 0.52, 0.78),
      });
    };

    drawHeader(page, folio);
    y = 708;

    for (const entry of entries) {
      if (y < 90) {
        folio++;
        page = pdfDoc.addPage([612, 792]);
        drawHeader(page, folio);
        y = 708;
      }
      const lineSummary = `${entry.entry_date} | ${entry.entry_number} | ${(
        entry.third_parties?.name || 'Proveedor Ocasional'
      ).slice(0, 26)} | Deb: ${formatCOP(entry.total_debit)} = Cred: ${formatCOP(entry.total_credit)}`;
      page.drawText(lineSummary.replace(/[^\x20-\x7E\xA0-\xFF]/g, ''), {
        x: 50,
        y,
        size: 8.5,
        font: fontBold,
        color: rgb(0.1, 0.18, 0.26),
      });
      y -= 12;
      for (const l of entry.journal_lines || []) {
        if (y < 70) {
          folio++;
          page = pdfDoc.addPage([612, 792]);
          drawHeader(page, folio);
          y = 708;
        }
        const detail = `   ${l.account_code} - ${(l.description || entry.concept).slice(0, 44)} | D: ${formatCOP(l.debit)} | C: ${formatCOP(l.credit)}`;
        page.drawText(detail.replace(/[^\x20-\x7E\xA0-\xFF]/g, ''), {
          x: 58,
          y,
          size: 8,
          font: fontRegular,
          color: rgb(0.28, 0.36, 0.44),
        });
        y -= 11;
      }
      y -= 4;
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  /**
   * "Descargar AZ" por rango de fechas: un solo PDF con índice, comprobantes en orden
   * y sus soportes, armado por lotes de 50 con barra de progreso.
   */
  const handleDownloadAzByBatches = async () => {
    try {
      setAzProgress(2);
      setAzStatusText('Consultando total de comprobantes en el rango...');

      const baseQs = new URLSearchParams({
        from: formFilters.from,
        to: formFilters.to,
        ...(formFilters.type ? { type: formFilters.type } : {}),
        ...(formFilters.status ? { status: formFilters.status } : {}),
      });

      const countRes = await fetch(`/api/contabilidad/az/pdf?mode=count&${baseQs.toString()}`);
      const countJson = await countRes.json();
      const totalVouchers = Number(countJson?.data?.total || 0);

      if (totalVouchers === 0) {
        alert('No hay comprobantes en el rango seleccionado para armar el paquete AZ.');
        setAzProgress(null);
        return;
      }

      const batchSize = 50;
      const mergedPdf = await PDFDocument.create();

      for (let offset = 0; offset < totalVouchers; offset += batchSize) {
        const batchNum = Math.floor(offset / batchSize) + 1;
        const totalBatches = Math.ceil(totalVouchers / batchSize);
        setAzStatusText(
          `Armando lote ${batchNum} de ${totalBatches} (${offset + 1}–${Math.min(
            offset + batchSize,
            totalVouchers
          )} de ${totalVouchers} comprobantes)...`
        );

        const batchQs = new URLSearchParams(baseQs);
        batchQs.set('mode', 'batch');
        batchQs.set('offset', String(offset));
        batchQs.set('limit', String(batchSize));
        if (offset === 0) batchQs.set('includeIndex', '1');

        const res = await fetch(`/api/contabilidad/az/pdf?${batchQs.toString()}`);
        if (!res.ok) {
          throw new Error(`Error descargando lote ${batchNum}`);
        }
        const arrayBuf = await res.arrayBuffer();
        const batchDoc = await PDFDocument.load(arrayBuf);
        const copiedPages = await mergedPdf.copyPages(batchDoc, batchDoc.getPageIndices());
        for (const p of copiedPages) {
          mergedPdf.addPage(p);
        }

        const pct = Math.min(98, Math.round(((offset + batchSize) / totalVouchers) * 100));
        setAzProgress(pct);
      }

      setAzStatusText('Finalizando archivo único PDF para AZ...');
      const finalBytes = await mergedPdf.save();
      setAzProgress(100);

      const blob = new Blob([new Uint8Array(finalBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AZ-KC-${formFilters.from}-a-${formFilters.to}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        setAzProgress(null);
        setAzStatusText('');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error armando el archivo AZ';
      alert(msg);
      setAzProgress(null);
      setAzStatusText('');
    }
  };

  return (
    <>
      <AdminTopbar
        eyebrow="— CONTABILIDAD · LIBROS OFICIALES Y ARCHIVO AZ"
        title={
          <span>
            Libro diario, <em>mayor y balance de prueba</em>
          </span>
        }
        subtitle="Orden cronológico fecha → tipo → número, validación de partida doble (Débito = Crédito) y generación de paquete AZ por lotes de 50."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportXlsx}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <DownloadIcon className="w-4 h-4" /> Exportar XLSX
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <FileTextIcon className="w-4 h-4" /> Exportar PDF foliado
            </button>
            <button
              type="button"
              disabled={azProgress !== null}
              onClick={handleDownloadAzByBatches}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <FolderArchiveIcon className="w-4 h-4" />
              {azProgress !== null ? `Armando AZ (${azProgress}%)` : 'Descargar AZ (rango)'}
            </button>
          </div>
        }
      />

      {azProgress !== null && (
        <div className="mb-6 p-4 rounded-2xl glass-panel border border-[var(--sky)]/40 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-[var(--fg)]">
            <span>{azStatusText}</span>
            <span className="font-mono">{azProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-sky-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--sky-deep)] transition-all duration-300"
              style={{ width: `${azProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filtros en servidor */}
      <form
        onSubmit={applyFilters}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-6 p-4 rounded-2xl glass-panel"
      >
        <div>
          <label className="label text-xs">Desde</label>
          <input
            type="date"
            value={formFilters.from}
            onChange={(e) => setFormFilters({ ...formFilters, from: e.target.value })}
            className="input text-xs w-full"
          />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input
            type="date"
            value={formFilters.to}
            onChange={(e) => setFormFilters({ ...formFilters, to: e.target.value })}
            className="input text-xs w-full"
          />
        </div>
        <div>
          <label className="label text-xs">Tipo</label>
          <select
            value={formFilters.type}
            onChange={(e) => setFormFilters({ ...formFilters, type: e.target.value })}
            className="input text-xs w-full"
          >
            <option value="">Todos (CC/CE/RC/NC)</option>
            <option value="CC">CC — Causación</option>
            <option value="CE">CE — Egreso</option>
            <option value="RC">RC — Recibo de caja</option>
            <option value="NC">NC — Nota contable</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Cuenta PUC</label>
          <select
            value={formFilters.accountCode}
            onChange={(e) => setFormFilters({ ...formFilters, accountCode: e.target.value })}
            className="input text-xs w-full font-mono"
          >
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Centro de costo</label>
          <select
            value={formFilters.costCenterId}
            onChange={(e) => setFormFilters({ ...formFilters, costCenterId: e.target.value })}
            className="input text-xs w-full"
          >
            <option value="">Todos</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Estado</label>
          <select
            value={formFilters.status}
            onChange={(e) => setFormFilters({ ...formFilters, status: e.target.value })}
            className="input text-xs w-full"
          >
            <option value="">Activos (Borrador + Contab.)</option>
            <option value="borrador">Solo Borrador</option>
            <option value="contabilizado">Solo Contabilizado</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary w-full text-xs flex items-center justify-center gap-1.5">
            <SearchIcon className="w-3.5 h-3.5" /> Filtrar
          </button>
        </div>
      </form>

      {/* Selector de vista contable */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2 glass-panel p-1.5 rounded-2xl">
          {[
            { id: 'diario', label: `Libro Diario (${totalCount})` },
            { id: 'mayor', label: 'Libro Mayor' },
            { id: 'auxiliar', label: `Auxiliar por Tercero (${thirdPartyLedger.length})` },
            { id: 'balance', label: `Balance de Prueba (${trialBalance.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[var(--sky-deep)] text-white'
                  : 'text-[var(--fg-soft)] hover:bg-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono glass-panel px-4 py-2 rounded-xl">
          <span>
            Débitos página: <strong>{formatCOP(pageTotalDebit)}</strong>
          </span>
          <span>
            Créditos página: <strong>{formatCOP(pageTotalCredit)}</strong>
          </span>
          <span
            className={
              Math.abs(pageTotalDebit - pageTotalCredit) < 1
                ? 'text-emerald-700 font-bold'
                : 'text-rose-600 font-bold'
            }
          >
            Dif: {formatCOP(pageTotalDebit - pageTotalCredit)}
          </span>
        </div>
      </div>

      {activeTab === 'diario' && (
        <div className="card overflow-x-auto glass-panel">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
                <th className="p-3">Fecha</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Número</th>
                <th className="p-3">Tercero</th>
                <th className="p-3">Centro Costo</th>
                <th className="p-3">Concepto y Líneas</th>
                <th className="p-3 text-right">Débito</th>
                <th className="p-3 text-right">Crédito</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/50 align-top">
                  <td className="p-3 whitespace-nowrap font-mono text-xs text-[var(--dim)]">
                    {formatDateCO(entry.entry_date)}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-sky-500/12 text-[var(--sky-deep)]">
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-xs whitespace-nowrap">
                    {entry.entry_number}
                  </td>
                  <td className="p-3 max-w-[180px]">
                    <div className="font-medium text-[var(--fg)] text-xs truncate">
                      {entry.third_parties?.name || 'Proveedor Ocasional'}
                    </div>
                    {entry.third_parties?.document_number && (
                      <div className="text-[11px] font-mono text-[var(--dim)]">
                        {entry.third_parties.document_number}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-[var(--dim)]">
                    {entry.cost_centers?.name || 'Medellín'}
                  </td>
                  <td className="p-3 max-w-md">
                    <div className="font-medium text-xs text-[var(--fg)] mb-1">{entry.concept}</div>
                    <div className="space-y-0.5">
                      {(entry.journal_lines || []).map((l) => (
                        <div
                          key={l.id}
                          className="text-[11px] font-mono text-[var(--dim)] flex justify-between gap-2"
                        >
                          <span>
                            <strong>{l.account_code}</strong> · {(l.description || '').slice(0, 38)}
                          </span>
                          <span>
                            {Number(l.debit) > 0
                              ? `D: ${formatCOP(l.debit)}`
                              : `C: ${formatCOP(l.credit)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-semibold">
                    {formatCOP(entry.total_debit)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-semibold">
                    {formatCOP(entry.total_credit)}
                  </td>
                  <td className="p-3">
                    <span className="text-xs uppercase font-semibold text-[var(--fg-soft)]">
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <a
                      href={`/api/contabilidad/comprobantes/${entry.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      title="Descargar comprobante PDF"
                    >
                      <FileTextIcon className="w-3.5 h-3.5" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--dim)]">
            <span>
              Mostrando página {currentPage} de {totalPages} ({totalCount} comprobantes)
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/contabilidad/libro-diario?from=${formFilters.from}&to=${formFilters.to}&type=${formFilters.type}&status=${formFilters.status}&page=${currentPage - 1}`}
                  className="btn btn-ghost text-xs py-1 px-3"
                >
                  Anterior
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/contabilidad/libro-diario?from=${formFilters.from}&to=${formFilters.to}&type=${formFilters.type}&status=${formFilters.status}&page=${currentPage + 1}`}
                  className="btn btn-ghost text-xs py-1 px-3"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'mayor' || activeTab === 'balance') && (
        <div className="card overflow-x-auto glass-panel">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
                <th className="p-3">Código PUC</th>
                <th className="p-3">Cuenta Contable</th>
                <th className="p-3">Naturaleza</th>
                <th className="p-3 text-right">Movimiento Débito</th>
                <th className="p-3 text-right">Movimiento Crédito</th>
                <th className="p-3 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {trialBalance.map((row) => {
                const net =
                  row.nature === 'debito' ? row.debit - row.credit : row.credit - row.debit;
                return (
                  <tr key={row.code} className="hover:bg-white/50">
                    <td className="p-3 font-mono font-bold text-xs">{row.code}</td>
                    <td className="p-3 font-medium text-xs">{row.name}</td>
                    <td className="p-3 text-xs uppercase text-[var(--dim)]">{row.nature}</td>
                    <td className="p-3 text-right font-mono text-xs">{formatCOP(row.debit)}</td>
                    <td className="p-3 text-right font-mono text-xs">{formatCOP(row.credit)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-[var(--sky-deep)]">
                      {formatCOP(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] font-mono font-bold text-xs bg-sky-500/5">
                <td colSpan={3} className="p-3 text-right">
                  SUMAS IGUALES BALANCE DE PRUEBA:
                </td>
                <td className="p-3 text-right">{formatCOP(trialTotalDebit)}</td>
                <td className="p-3 text-right">{formatCOP(trialTotalCredit)}</td>
                <td className="p-3 text-right">
                  Dif: {formatCOP(trialTotalDebit - trialTotalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'auxiliar' && (
        <div className="card overflow-x-auto glass-panel">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
                <th className="p-3">Tercero</th>
                <th className="p-3">NIT / Documento</th>
                <th className="p-3 text-right">Total Débitos</th>
                <th className="p-3 text-right">Total Créditos</th>
                <th className="p-3 text-right">Saldo Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {thirdPartyLedger.map((tp) => (
                <tr key={tp.id} className="hover:bg-white/50">
                  <td className="p-3 font-semibold text-xs">
                    <Link
                      href={`/admin/proveedores/${tp.id}`}
                      className="hover:text-[var(--sky-deep)] hover:underline"
                    >
                      {tp.name}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs text-[var(--dim)]">
                    {tp.document_number || 'Sin NIT'}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{formatCOP(tp.debit)}</td>
                  <td className="p-3 text-right font-mono text-xs">{formatCOP(tp.credit)}</td>
                  <td className="p-3 text-right font-mono text-xs font-bold">
                    {formatCOP(tp.debit - tp.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
