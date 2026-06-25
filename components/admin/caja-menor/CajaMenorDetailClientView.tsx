'use client';

import React from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AddInvoiceButton } from '@/app/admin/caja-menor/[id]/AddInvoiceButton';
import { BulkUploadButton } from '@/app/admin/caja-menor/[id]/BulkUploadButton';
import { ExternalLinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CajaMenorDetailClientViewProps {
  box: any;
  entries: any[];
}

export function CajaMenorDetailClientView({ box, entries }: CajaMenorDetailClientViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  };

  return (
    <>
      <AdminTopbar 
        title={`Caja Menor #${box.box_number}`} 
        subtitle={box.name || `Abierta por ${box.profiles?.full_name}`}
        action={
          <div className="flex gap-2">
            {box.status === 'abierta' && (
              <>
                <BulkUploadButton boxId={box.id} />
                <AddInvoiceButton boxId={box.id} />
              </>
            )}
          </div>
        }
      />

      <div className="mb-6 card p-5 flex justify-between items-center bg-[var(--admin-bg-hover)]">
        <div>
          <div className="text-sm text-[var(--dim)] mb-1">Estado Actual</div>
          <StatusBadge status={box.status} />
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--dim)] mb-1">Total Gastado</div>
          <div className="text-2xl font-bold text-[var(--fg)]">
            {formatCurrency(entries?.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0)}
          </div>
        </div>
      </div>

      <DataTable
        data={entries || []}
        keyExtractor={(row: any) => row.id}
        columns={[
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
            accessor: (row: any) => <span className="text-sm font-bold">{formatCurrency(row.total_amount)}</span>,
          },
          {
            header: 'Soporte',
            accessor: (row: any) => row.receipt_url ? (
              <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 text-sm">
                <ExternalLinkIcon className="w-3 h-3" /> Ver
              </a>
            ) : <span className="text-xs text-[var(--dim)]">N/A</span>,
          },
        ]}
      />
    </>
  );
}
