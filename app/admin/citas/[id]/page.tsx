import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, FileTextIcon, UserIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateAppointmentStatus } from '../actions';
import { revalidatePath } from 'next/cache';

export default async function DetalleCitaPage({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'asesor']);
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      *,
      leads ( id, full_name, phone, email ),
      profiles!appointments_assigned_advisor_id_fkey ( full_name ),
      service_types ( name )
    `)
    .eq('id', params.id)
    .single();

  if (error || !appointment) notFound();

  const formatDateTime = (iso: string) => format(new Date(iso), "dd 'de' MMMM, yyyy - hh:mm a", { locale: es });

  const handleStatusChange = async (formData: FormData) => {
    'use server';
    const status = formData.get('status') as string;
    await updateAppointmentStatus(params.id, status);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/citas" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Detalle de Cita</h1>
          <p className="text-[#7a99b5] text-sm">Gestiona el estado y seguimiento de esta reunión.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-medium text-[#1a2d3d] mb-1">Información de la Cita</h2>
                <div className="text-sm text-[#7a99b5] capitalize">{formatDateTime(appointment.scheduled_at)}</div>
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#a8c4d9]/30">
              <div>
                <div className="text-xs text-[#7a99b5] mb-1">Servicio</div>
                <div className="text-sm font-medium text-[#3d5a73]">{appointment.service_types?.name || 'General'}</div>
              </div>
              <div>
                <div className="text-xs text-[#7a99b5] mb-1">Asesor Asignado</div>
                <div className="text-sm font-medium text-[#3d5a73]">{appointment.profiles?.full_name}</div>
              </div>
              <div>
                <div className="text-xs text-[#7a99b5] mb-1">Duración</div>
                <div className="text-sm font-medium text-[#3d5a73]">{appointment.duration_minutes} minutos</div>
              </div>
            </div>

            {appointment.notes && (
              <div>
                <div className="text-xs text-[#7a99b5] mb-1">Notas</div>
                <p className="text-sm text-[#3d5a73] bg-[#f7fbff] p-3 rounded-lg">{appointment.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40">
            <h3 className="font-medium text-[#1a2d3d] mb-4">Actualizar Estado</h3>
            <form action={handleStatusChange} className="flex flex-wrap gap-2">
              <button name="status" value="agendada" disabled={appointment.status === 'agendada'} className="px-4 py-2 text-sm font-medium rounded-lg border border-[#a8c4d9]/50 hover:bg-[#f7fbff] disabled:opacity-50">Agendada</button>
              <button name="status" value="en_curso" disabled={appointment.status === 'en_curso'} className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-700 disabled:opacity-50">En Curso</button>
              <button name="status" value="atendida" disabled={appointment.status === 'atendida'} className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-700 disabled:opacity-50">Marcar como Atendida</button>
              <button name="status" value="cancelada" disabled={appointment.status === 'cancelada'} className="px-4 py-2 text-sm font-medium rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 disabled:opacity-50">Cancelar Cita</button>
            </form>

            {appointment.status === 'atendida' && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-emerald-800">Cita completada</h4>
                  <p className="text-xs text-emerald-600 mt-1">¿Deseas crear una cotización o venta para este cliente?</p>
                </div>
                <Link
                  href={`/admin/ventas/nueva?leadId=${appointment.lead_id}&appointmentId=${appointment.id}`}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Crear Venta
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 text-center">
            <div className="w-16 h-16 bg-[#e6f2fb] rounded-full flex items-center justify-center mx-auto mb-4 text-[#5ba3d9]">
              <UserIcon className="w-8 h-8" />
            </div>
            <h3 className="font-medium text-[#1a2d3d] mb-1">{appointment.leads?.full_name}</h3>
            <p className="text-sm text-[#7a99b5] mb-4">{appointment.leads?.phone}</p>
            
            <Link
              href={`/admin/leads/${appointment.lead_id}`}
              className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 bg-white text-[#3d5a73] border border-[#a8c4d9]/50 rounded-lg font-medium transition-colors hover:bg-[#f7fbff] text-sm"
            >
              Ver Ficha Cliente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
