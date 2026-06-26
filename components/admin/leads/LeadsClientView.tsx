'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import Link from 'next/link';
import { PlusIcon, EyeIcon, Trash2Icon } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { useRouter } from 'next/navigation';

export function LeadsClientView({ leadsWithCounts }: { leadsWithCounts: any[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a "${name}" y todas sus citas? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(`Error al eliminar: ${data.error}`);
        return;
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

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
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://wa.me/${row.phone?.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                    title="Contactar por WhatsApp"
                  >
                    {row.phone}
                  </a>
                  {row.phone && (
                    <a
                      href={`https://wa.me/${row.phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shrink-0"
                      title="Abrir WhatsApp"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
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
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/leads/${row.id}`}
                  className="btn btn-ghost"
                >
                  <EyeIcon className="w-4 h-4" /> Detalle
                </Link>
                <button
                  onClick={() => handleDelete(row.id, row.full_name)}
                  disabled={deletingId === row.id}
                  className="p-1.5 rounded-lg text-[var(--dim)] hover:text-[var(--danger)] hover:bg-red-500/10 transition-colors"
                  title="Eliminar cliente"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
