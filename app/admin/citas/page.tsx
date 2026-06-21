import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function CitasPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  
  // Si no hay fecha, por defecto hoy. Pero mostraremos todas las pendientes por simplicidad si no hay filtro, o solo las de hoy.
  // Vamos a mostrar las próximas por defecto.
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      leads ( full_name, phone ),
      profiles!appointments_assigned_advisor_id_fkey ( full_name ),
      service_types ( name )
    `)
    .order('scheduled_at', { ascending: true })
    .limit(100); // En un caso real usaríamos paginación o filtro por fecha riguroso

  if (error) {
    console.error('Error fetching appointments:', error);
  }

  const formatDateTime = (iso: string) => {
    return format(new Date(iso), "dd MMM yyyy, hh:mm a", { locale: es });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-1">Agenda de Citas</h1>
          <p className="text-[#7a99b5] text-sm">Administra las citas programadas con los clientes.</p>
        </div>
        <Link
          href="/admin/citas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Agendar Cita
        </Link>
      </div>

      <DataTable
        data={appointments || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Fecha y Hora',
            accessor: (row) => <span className="text-sm font-medium text-[#1a2d3d] capitalize">{formatDateTime(row.scheduled_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[#1a2d3d]">{row.leads?.full_name}</div>
                <div className="text-xs text-[#7a99b5]">{row.leads?.phone}</div>
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5ba3d9] bg-[#f7fbff] border border-[#a8c4d9]/50 hover:bg-[#e6f2fb] rounded-lg transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                Gestionar
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
