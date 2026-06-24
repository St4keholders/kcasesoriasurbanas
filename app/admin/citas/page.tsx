import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default async function CitasPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      leads ( full_name, phone ),
      profiles!appointments_assigned_advisor_id_fkey ( full_name ),
      service_types ( name )
    `)
    .order('scheduled_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching appointments:', error);
  }

  const formatDateTime = (iso: string) => {
    return format(new Date(iso), "dd MMM yyyy, hh:mm a", { locale: es });
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
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Fecha y Hora',
            accessor: (row) => <span className="text-sm font-medium text-[var(--fg)] capitalize">{formatDateTime(row.scheduled_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[var(--fg)]">{row.leads?.full_name}</div>
                <div className="text-xs text-[var(--dim)]">{row.leads?.phone}</div>
              </div>
            ),
          },
          {
            header: 'Servicio',
            accessor: (row) => <span className="text-sm">{row.service_types?.name || 'General'}</span>,
          },
          {
            header: 'Asesor Asignado',
            accessor: (row) => <span className="text-sm">{row.profiles?.full_name}</span>,
          },
          {
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <Link
                href={`/admin/citas/${row.id}`}
                className="btn btn-ghost"
              >
                <EyeIcon className="w-4 h-4" />
                Gestionar
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
