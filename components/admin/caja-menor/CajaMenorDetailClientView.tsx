'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AddInvoiceButton } from '@/app/admin/caja-menor/[id]/AddInvoiceButton';
import { AddIncomeButton } from '@/app/admin/caja-menor/[id]/AddIncomeButton';
import { BulkUploadButton } from '@/app/admin/caja-menor/[id]/BulkUploadButton';
import { EditEntryModal } from '@/app/admin/caja-menor/[id]/EditEntryModal';
import { ExternalLinkIcon, DownloadIcon, PencilIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CajaMenorDetailClientViewProps {
  box: any;
  entries: any[];
}

export function CajaMenorDetailClientView({ box, entries }: CajaMenorDetailClientViewProps) {
  const router = useRouter();
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    return format(parseISO(iso), "dd MMM yyyy", { locale: es });
  };

  // Calculate totals
  const totalIngresos = entries
    ?.filter((e: any) => e.entry_type === 'ingreso')
    .reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0;

  const totalEgresos = entries
    ?.filter((e: any) => e.entry_type !== 'ingreso')
    .reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0;

  const saldoDisponible = totalIngresos - totalEgresos;

  const handleDownloadPDF = () => {
    window.open(`/api/contabilidad/comprobantes/${box.id}/pdf?source=petty_cash_box`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <AdminTopbar 
        title={`Caja Menor #${box.box_number}`} 
        subtitle={box.name || `Abierta por ${box.profiles?.full_name}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="neu-btn-secondary flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> Descargar PDF
            </button>
            {box.status === 'abierta' && (
              <>
                <BulkUploadButton boxId={box.id} />
                <AddIncomeButton boxId={box.id} />
                <AddInvoiceButton boxId={box.id} />
              </>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-[var(--dim)] mb-1">Estado</div>
          <StatusBadge status={box.status} />
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--dim)] mb-1 flex items-center gap-1">
            <ArrowUpIcon className="w-3 h-3" style={{ color: 'var(--success)' }} /> Total Ingresos
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalIngresos)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--dim)] mb-1 flex items-center gap-1">
            <ArrowDownIcon className="w-3 h-3" style={{ color: 'var(--danger)' }} /> Total Egresos
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--danger)' }}>
            {formatCurrency(totalEgresos)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--dim)] mb-1">Saldo Disponible</div>
          <div className={`text-2xl font-bold ${saldoDisponible >= 0 ? 'text-[var(--fg)]' : 'text-[var(--danger)]'}`}>
            {formatCurrency(saldoDisponible)}
          </div>
        </div>
      </div>

      <DataTable
        data={entries || []}
        keyExtractor={(row: any) => row.id}
        columns={[
          {
            header: 'Tipo',
            accessor: (row: any) => (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: row.entry_type === 'ingreso' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                  color: row.entry_type === 'ingreso' ? '#22c55e' : '#ef4444',
                }}
              >
                {row.entry_type === 'ingreso' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                {row.entry_type === 'ingreso' ? 'Ingreso' : 'Egreso'}
              </span>
            ),
          },
          {
            header: 'Fecha',
            accessor: (row: any) => <span className="text-sm">{formatDateTime(row.entry_date)}</span>,
          },
          {
            header: 'Proveedor',
            accessor: (row: any) => (
              <div>
                <div className="text-sm font-medium">{row.supplier_name}</div>
                <div className="text-xs text-[var(--dim)]">{row.supplier_document}</div>
              </div>
            ),
          },
          {
            header: 'Concepto',
            accessor: (row: any) => <span className="text-sm">{row.concept}</span>,
          },
          {
            header: 'IVA',
            accessor: (row: any) => <span className="text-sm">{formatCurrency(row.tax_amount)}</span>,
          },
          {
            header: 'Total',
            accessor: (row: any) => (
              <span
                className="text-sm font-bold"
                style={{ color: row.entry_type === 'ingreso' ? '#22c55e' : undefined }}
              >
                {row.entry_type === 'ingreso' ? '+' : '-'}{formatCurrency(row.total_amount)}
              </span>
            ),
          },
          {
            header: 'Soporte',
            accessor: (row: any) => row.receipt_url ? (
              <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 text-sm">
                <ExternalLinkIcon className="w-3 h-3" /> Ver
              </a>
            ) : <span className="text-xs text-[var(--dim)]">N/A</span>,
          },
          {
            header: 'Acciones',
            accessor: (row: any) => (
              <div className="flex items-center gap-2">
                <a
                  href={`/api/contabilidad/comprobantes/${row.id}/pdf?source=petty_cash_entry`}
                  target="_blank"
                  rel="noreferrer"
                  className="neu-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                  title="Descargar comprobante PDF"
                >
                  <DownloadIcon className="w-3 h-3" /> Comprobante
                </a>
                <button
                  onClick={() => setEditingEntry(row)}
                  className="neu-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                >
                  <PencilIcon className="w-3 h-3" /> Editar
                </button>
                {row.status !== 'anulado' ? (
                  <button
                    onClick={async () => {
                      const motivo = window.prompt('Indica el motivo para anular este movimiento de caja menor:');
                      if (!motivo || !motivo.trim()) return;
                      try {
                        const supabase = createClient();
                        const { data: { user } } = await supabase.auth.getUser();
                        const { error } = await supabase
                          .from('petty_cash_entries')
                          .update({
                            status: 'anulado',
                            void_reason: motivo.trim(),
                            voided_by: user?.id ?? null,
                            voided_at: new Date().toISOString(),
                          })
                          .eq('id', row.id);

                        if (error) throw error;

                        router.refresh();
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Error desconocido';
                        alert('Error al anular el movimiento: ' + msg);
                      }
                    }}
                    className="neu-btn-secondary text-xs px-2 py-1 flex items-center gap-1 text-red-500 hover:text-red-600"
                  >
                    <TrashIcon className="w-3 h-3" /> Anular
                  </button>
                ) : (
                  <span className="text-xs text-rose-500 font-semibold" title={row.void_reason || ''}>
                    Anulado
                  </span>
                )}
              </div>
            ),
          },
        ]}
      />

      {editingEntry && (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      )}
    </>
  );
}
