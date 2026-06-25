'use client';

import React from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ExportCSVModal } from '@/components/admin/ExportCSVModal';
import { DownloadIcon, PrinterIcon } from 'lucide-react';

export function VentasClientView({ sales }: { sales: any[] }) {
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => format(new Date(iso), "dd MMM yyyy", { locale: es });

  return (
    <>
      <AdminTopbar 
        eyebrow="— FINANZAS"
        title={<span>Ventas y <em>cotizaciones</em></span>}
        subtitle="Gestiona el ciclo de ingresos del negocio."
        searchPlaceholder="Buscar por cliente o número..."
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="neu-btn-secondary"
            >
              <DownloadIcon className="w-4 h-4 mr-2" /> Exportar CSV
            </button>
            <Link href="/admin/ventas/nueva" className="btn btn-primary">
              <PlusIcon className="w-4 h-4" /> Nueva cotización
            </Link>
          </div>
        }
      />

      <DataTable
        data={sales || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Número',
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{row.sale_number || 'Borrador'}</span>,
          },
          {
            header: 'Fecha',
            accessor: (row) => <span className="text-sm font-mono text-[var(--dim)]">{formatDate(row.created_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="text-sm font-medium text-[var(--fg-soft)]">{row.leads?.full_name}</div>
                {row.leads?.document_number && <div className="text-xs text-[var(--dim)]">{row.leads?.document_number}</div>}
              </div>
            ),
          },
          {
            header: 'Total',
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{formatCurrency(row.total)}</span>,
          },
          {
            header: 'Asesor',
            accessor: (row) => <span className="text-sm text-[var(--fg-soft)]">{row.profiles?.full_name}</span>,
          },
          {
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/ventas/${row.id}`}
                  className="btn btn-ghost"
                  title="Detalle"
                >
                  <EyeIcon className="w-4 h-4" /> 
                </Link>
                <a
                    href={`/admin/ventas/${row.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost text-[var(--primary)]"
                    title="Descargar Cotización PDF"
                  >
                    <PrinterIcon className="w-4 h-4" />
                  </a>
              </div>
            ),
          },
        ]}
      />

      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={sales || []}
        title="Exportar Ventas a Excel"
        filename="ventas_kcasesorias"
        dateField="created_at"
        columnsMap={{
          sale_number: 'Número',
          created_at: 'Fecha de Registro',
          'leads.full_name': 'Cliente',
          'leads.document_number': 'NIT/CC',
          total: 'Total (COP)',
          'profiles.full_name': 'Asesor',
          status: 'Estado',
          notes: 'Notas'
        }}
      />
    </>
  );
}
