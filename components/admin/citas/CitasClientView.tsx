'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon, Trash2Icon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface CitasClientViewProps {
  appointments: any[];
}

export function CitasClientView({ appointments }: CitasClientViewProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`¿Eliminar la cita de "${clientName}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const supabase = createClient();
      await (supabase as any).from('appointments').delete().eq('id', id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return 'Por definir';
    try {
      return format(new Date(iso), "dd MMM yyyy, hh:mm a", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <>
      <AdminTopbar 
        eyebrow="— PRINCIPAL"
        title={<span>Agenda de <em>citas</em></span>}
        subtitle="Administra las citas programadas con los clientes."
        searchPlaceholder="Buscar por cliente o asesor..."
        action={
          <Link href="/admin/citas/nueva" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Agendar cita
          </Link>
        }
      />

      <DataTable
        data={appointments || []}
        keyExtractor={(row: any) => row.id}
        columns={[
          {
            header: 'Fecha y Hora',
            accessor: (row: any) => <span className="text-sm font-medium text-[var(--fg)] capitalize">{formatDateTime(row.scheduled_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row: any) => (
              <div>
                <div className="text-sm text-[var(--fg)]">{row.leads?.full_name}</div>
                <div className="text-xs text-[var(--dim)]">{row.leads?.phone}</div>
              </div>
            ),
          },
          {
            header: 'Servicio',
            accessor: (row: any) => <span className="text-sm">{row.service_types?.name || 'General'}</span>,
          },
          {
            header: 'Asesor Asignado',
            accessor: (row: any) => <span className="text-sm">{row.profiles?.full_name}</span>,
          },
          {
            header: 'Estado',
            accessor: (row: any) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row: any) => (
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/citas/${row.id}`}
                  className="btn btn-ghost"
                >
                  <EyeIcon className="w-4 h-4" />
                  Gestionar
                </Link>
                <button
                  onClick={() => handleDelete(row.id, row.leads?.full_name || 'esta cita')}
                  disabled={deletingId === row.id}
                  className="p-1.5 rounded-lg text-[var(--dim)] hover:text-[var(--danger)] hover:bg-red-500/10 transition-colors"
                  title="Eliminar cita"
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
