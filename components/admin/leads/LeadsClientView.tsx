'use client';

import React from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export function LeadsClientView({ leadsWithCounts }: { leadsWithCounts: any[] }) {
  return (
    <>
      <AdminTopbar 
        eyebrow="— PRINCIPAL"
        title={<span>Directorio de <em>clientes</em></span>}
        subtitle="Gestiona tus clientes potenciales y su historial."
        searchPlaceholder="Buscar por nombre o contacto..."
        action={
          <Link href="/admin/leads/nuevo" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo cliente
          </Link>
        }
      />

      <DataTable
        data={leadsWithCounts}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Cliente',
            accessor: (row) => (
              <div className="flex items-center gap-3">
                <div className="avatar">
                  {row.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-[var(--fg)]">{row.full_name}</div>
                    {row.sales_count > 0 ? (
                      <span className="badge success">CLIENTE</span>
                    ) : (
                      <span className="badge info">PROSPECTO</span>
                    )}
                  </div>
                  {row.document_number && <div className="text-xs text-[var(--dim)] mt-1">CC/NIT: {row.document_number}</div>}
                </div>
              </div>
            ),
          },
          {
            header: 'Contacto',
            accessor: (row) => (
              <div>
                <a 
                  href={`https://wa.me/${row.phone?.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                  title="Contactar por WhatsApp"
                >
                  {row.phone}
                </a>
                {row.email && <div className="text-xs text-[var(--dim)]">{row.email}</div>}
              </div>
            ),
          },
          {
            header: 'Fuente',
            accessor: 'source',
          },
          {
            header: 'Interacciones',
            accessor: (row) => (
              <div className="flex gap-4 text-xs font-semibold text-[var(--dim)] uppercase tracking-wider">
                <span title="Citas">{row.appointments_count} citas</span>
                <span title="Ventas">{row.sales_count} ventas</span>
              </div>
            ),
          },
          {
            header: 'Registro',
            accessor: (row) => <span className="text-sm font-mono text-[var(--dim)]">{formatDate(row.created_at)}</span>,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <Link
                href={`/admin/leads/${row.id}`}
                className="btn btn-ghost"
              >
                <EyeIcon className="w-4 h-4" /> Detalle
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
