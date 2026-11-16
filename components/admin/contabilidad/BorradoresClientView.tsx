'use client';

import React, { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import {
  updateDraftEntryAction,
  postEntriesBulkAction,
  voidJournalEntryAction,
} from '@/app/admin/contabilidad/actions';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  FileTextIcon,
  SaveIcon,
  TrashIcon,
} from 'lucide-react';

interface JournalLineItem {
  id: string;
  line_order: number;
  account_code: string;
  debit: number;
  credit: number;
  is_deductible: boolean;
}

interface DraftEntryRow {
  id: string;
  entry_number: string;
  entry_type: string;
  entry_date: string;
  status: string;
  concept: string;
  total_debit: number;
  total_credit: number;
  ai_confidence: number;
  ai_rationale: string | null;
  needs_review: boolean;
  is_personal_expense: boolean;
  is_third_party_support: boolean;
  is_possible_asset: boolean;
  missing_withholding: boolean;
  withholding_expected: number;
  cost_center_id: string | null;
  third_parties?: { id: string; name: string; document_number: string | null } | null;
  cost_centers?: { id: string; name: string } | null;
  journal_lines?: JournalLineItem[];
}

interface AccountOption {
  code: string;
  name: string;
  account_class: number;
}

interface CostCenterOption {
  id: string;
  name: string;
  accounting_class: number;
}

export function BorradoresClientView({
  entries,
  totalCount,
  currentPage,
  pageSize,
  currentFilter,
  accounts,
  costCenters,
  isAdmin,
}: {
  entries: DraftEntryRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentFilter: string;
  accounts: AccountOption[];
  costCenters: CostCenterOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, { accountCode: string; costCenterId: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isBulkPosting, setIsBulkPosting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getPrimaryDebitAccount = (row: DraftEntryRow): string => {
    const line = (row.journal_lines || []).find(
      (l) => Number(l.debit) > 0 && (l.account_code.startsWith('5') || l.account_code.startsWith('6'))
    );
    return line?.account_code || '519595';
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map((e) => e.id));
    }
  };

  const handleSaveRow = async (row: DraftEntryRow) => {
    const currentEdit = edits[row.id];
    const newAccountCode = currentEdit?.accountCode || getPrimaryDebitAccount(row);
    const newCostCenterId =
      currentEdit?.costCenterId !== undefined ? currentEdit.costCenterId : row.cost_center_id || '';

    setSavingId(row.id);
    setErrorMsg(null);
    setFeedbackMsg(null);

    const res = await updateDraftEntryAction({
      entryId: row.id,
      newAccountCode,
      newCostCenterId: newCostCenterId || null,
    });

    setSavingId(null);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setFeedbackMsg(
      `Comprobante ${row.entry_number} actualizado a cuenta ${newAccountCode} y regla aprendida registrada.`
    );
    router.refresh();
  };

  const handleBulkPost = async () => {
    if (!isAdmin) return;
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `¿Confirmas contabilizar en bloque ${selectedIds.length} comprobante(s)? Una vez contabilizados quedan cerrados y solo se anulan con reverso.`
      )
    ) {
      return;
    }

    setIsBulkPosting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    const res = await postEntriesBulkAction({ entryIds: selectedIds });
    setIsBulkPosting(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setSelectedIds([]);
    setFeedbackMsg(`Se contabilizaron ${res.data.count} comprobante(s) exitosamente.`);
    router.refresh();
  };

  const handleVoid = async (entry: DraftEntryRow) => {
    const reason = window.prompt(`Indica el motivo para anular el borrador ${entry.entry_number}:`);
    if (!reason || !reason.trim()) return;
    const res = await voidJournalEntryAction({
      entryId: entry.id,
      reason: reason.trim(),
    });
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    setFeedbackMsg(`Comprobante ${entry.entry_number} anulado.`);
    router.refresh();
  };

  return (
    <>
      <AdminTopbar
        eyebrow="— CONTABILIDAD · REVISIÓN DE ASIENTOS"
        title={
          <span>
            Borradores <em>contables ({totalCount})</em>
          </span>
        }
        subtitle="Revisa la cuenta y centro de costo sugeridos por el clasificador. Cada ajuste alimenta las reglas aprendidas."
        action={
          isAdmin && (
            <button
              type="button"
              disabled={selectedIds.length === 0 || isBulkPosting}
              onClick={handleBulkPost}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2Icon className="w-4 h-4" />
              {isBulkPosting
                ? 'Contabilizando...'
                : `Contabilizar en bloque (${selectedIds.length})`}
            </button>
          )
        }
      />

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-800 text-sm">
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 glass-panel p-3 rounded-2xl">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'todos', label: 'Todos los borradores' },
            { id: 'revision', label: 'Baja confianza / Revisión (< 85%)' },
            { id: 'personales', label: 'Gastos no deducibles (531595)' },
            { id: 'terceros', label: 'Soporte a nombre de tercero (615595)' },
            { id: 'retencion', label: 'Retención no practicada' },
          ].map((f) => (
            <Link
              key={f.id}
              href={`/admin/contabilidad/borradores?filter=${f.id}&page=1`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentFilter === f.id
                  ? 'bg-[var(--sky-deep)] text-white'
                  : 'text-[var(--fg-soft)] hover:bg-white/60'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--dim)]">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          {currentPage > 1 && (
            <Link
              href={`/admin/contabilidad/borradores?filter=${currentFilter}&page=${currentPage - 1}`}
              className="btn btn-ghost text-xs py-1 px-2"
            >
              Anterior
            </Link>
          )}
          {currentPage < totalPages && (
            <Link
              href={`/admin/contabilidad/borradores?filter=${currentFilter}&page=${currentPage + 1}`}
              className="btn btn-ghost text-xs py-1 px-2"
            >
              Siguiente
            </Link>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto glass-panel">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--dim)]">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={entries.length > 0 && selectedIds.length === entries.length}
                  onChange={toggleSelectAll}
                  aria-label="Seleccionar todos los borradores visibles"
                />
              </th>
              <th className="p-3">Comprobante / Fecha</th>
              <th className="p-3">Tercero / Concepto</th>
              <th className="p-3">Centro de costo</th>
              <th className="p-3">Cuenta contable (5/6)</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3">Confianza / Alertas</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {entries.map((row) => {
              const currentDebitAcc = edits[row.id]?.accountCode ?? getPrimaryDebitAccount(row);
              const currentCcId = edits[row.id]?.costCenterId ?? (row.cost_center_id || '');
              const confPct = Math.round(Number(row.ai_confidence || 0) * 100);
              const isLowConf = Number(row.ai_confidence) < 0.85 || row.needs_review;

              return (
                <tr
                  key={row.id}
                  className={isLowConf ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-white/50'}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      aria-label={`Seleccionar comprobante ${row.entry_number}`}
                    />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-[var(--fg)] text-xs">
                      {row.entry_number}
                    </div>
                    <div className="text-xs text-[var(--dim)] font-mono">
                      {formatDateCO(row.entry_date)}
                    </div>
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="font-semibold text-[var(--fg)] truncate">
                      {row.third_parties?.name || 'Proveedor Ocasional'}
                    </div>
                    <div className="text-xs text-[var(--fg-soft)] truncate" title={row.concept}>
                      {row.concept}
                    </div>
                    {row.ai_rationale && (
                      <div className="text-[11px] text-[var(--dim)] italic truncate">
                        {row.ai_rationale}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={currentCcId}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [row.id]: {
                            accountCode: currentDebitAcc,
                            costCenterId: e.target.value,
                          },
                        }))
                      }
                      className="input text-xs py-1.5 px-2 w-36"
                    >
                      <option value="">Medellín (5)</option>
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name} (Cl.{cc.accounting_class})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={currentDebitAcc}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [row.id]: {
                            accountCode: e.target.value,
                            costCenterId: currentCcId,
                          },
                        }))
                      }
                      className="input text-xs py-1.5 px-2 w-60 font-mono"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} — {acc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-[var(--fg)] whitespace-nowrap">
                    {formatCOP(row.total_debit)}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${
                          confPct >= 85
                            ? 'bg-emerald-500/15 text-emerald-800'
                            : 'bg-amber-500/20 text-amber-900'
                        }`}
                      >
                        {confPct < 85 && <AlertTriangleIcon className="w-3 h-3" />}
                        {confPct}%
                      </span>
                      {row.is_personal_expense && (
                        <span className="text-[11px] font-semibold text-rose-700">
                          No deducible (531595)
                        </span>
                      )}
                      {row.is_third_party_support && (
                        <span className="text-[11px] font-semibold text-amber-800">
                          Soporte a nombre de tercero
                        </span>
                      )}
                      {row.missing_withholding && (
                        <span className="text-[11px] font-semibold text-amber-800">
                          Retención esperada: {formatCOP(row.withholding_expected)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingId === row.id}
                        onClick={() => handleSaveRow(row)}
                        className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1"
                        title="Confirmar cuenta y aprender regla"
                      >
                        <SaveIcon className="w-3.5 h-3.5" />
                        {savingId === row.id ? '...' : 'Confirmar'}
                      </button>
                      <a
                        href={`/api/contabilidad/comprobantes/${row.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost text-xs px-2 py-1"
                        title="Descargar PDF comprobante"
                      >
                        <FileTextIcon className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleVoid(row)}
                        className="btn btn-ghost text-xs px-2 py-1 text-rose-600"
                        title="Anular borrador"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
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
