import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { UserIcon, CalendarIcon, ClockIcon, BriefcaseIcon, MessageSquareIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateAppointmentStatus } from '../actions';

export default async function DetalleCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'asesor']);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      leads ( id, full_name, phone, email ),
      profiles!appointments_assigned_advisor_id_fkey ( full_name ),
      service_types ( name )
    `)
    .eq('id', id)
    .single();

  const appointment = data as any;
  if (error || !appointment) notFound();

  const formatDateTime = (iso: string) =>
    format(new Date(iso), "dd 'de' MMMM, yyyy — hh:mm a", { locale: es });

  const handleStatusChange = async (formData: FormData) => {
    'use server';
    const status = formData.get('status') as string;
    await updateAppointmentStatus(id, status);
  };

  return (
    <div className="main">
      <AdminTopbar
        eyebrow="— CITAS"
        title={<span>Detalle de <em>cita</em></span>}
        subtitle="Gestiona el estado y seguimiento de esta reunión."
        action={
          <Link href="/admin/citas" className="neu-btn text-sm flex items-center gap-2">
            ← Volver a Citas
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="md:col-span-2 space-y-6">
          {/* Info card */}
          <div className="card p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-[var(--fg)] text-lg">Información de la Cita</h2>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--dim)] mb-0.5 uppercase tracking-wider">Fecha y Hora</div>
                  <div className="text-sm font-medium text-[var(--fg)] capitalize">
                    {formatDateTime(appointment.scheduled_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <BriefcaseIcon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--dim)] mb-0.5 uppercase tracking-wider">Servicio</div>
                  <div className="text-sm font-medium text-[var(--fg)]">
                    {appointment.service_types?.name || 'General'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <ClockIcon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--dim)] mb-0.5 uppercase tracking-wider">Duración</div>
                  <div className="text-sm font-medium text-[var(--fg)]">
                    {appointment.duration_minutes ? `${appointment.duration_minutes} minutos` : 'No especificada'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--dim)] mb-0.5 uppercase tracking-wider">Asesor Asignado</div>
                  <div className="text-sm font-medium text-[var(--fg)]">
                    {appointment.profiles?.full_name || 'Sin asignar'}
                  </div>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <div className="flex items-start gap-3 pt-4 border-t border-[var(--shadow-dark)]">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <MessageSquareIcon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--dim)] mb-1 uppercase tracking-wider">Notas</div>
                  <p className="text-sm text-[var(--fg)]">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status update */}
          <div className="card p-6">
            <h3 className="font-semibold text-[var(--fg)] mb-4">Actualizar Estado</h3>
            <form action={handleStatusChange} className="flex flex-wrap gap-3">
              <button
                name="status" value="agendada"
                disabled={appointment.status === 'agendada'}
                className="neu-btn text-sm disabled:opacity-40"
              >
                Agendada
              </button>
              <button
                name="status" value="en_curso"
                disabled={appointment.status === 'en_curso'}
                className="neu-btn text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
              >
                En Curso
              </button>
              <button
                name="status" value="atendida"
                disabled={appointment.status === 'atendida'}
                className="neu-btn text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
              >
                Marcar como Atendida
              </button>
              <button
                name="status" value="cancelada"
                disabled={appointment.status === 'cancelada'}
                className="neu-btn text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                Cancelar Cita
              </button>
            </form>

            {appointment.status === 'atendida' && (
              <div className="mt-5 p-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--fg)]">Cita completada ✓</div>
                  <div className="text-xs text-[var(--dim)] mt-0.5">¿Deseas registrar una venta para este cliente?</div>
                </div>
                <Link
                  href={`/admin/ventas/nueva?leadId=${appointment.lead_id}&appointmentId=${appointment.id}`}
                  className="neu-btn-primary text-sm"
                >
                  Crear Venta
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Client card */}
        <div className="md:col-span-1">
          <div className="card p-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[var(--primary)]"
              style={{ background: 'var(--primary-soft, rgba(91,163,217,0.12))' }}
            >
              {appointment.leads?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h3 className="font-semibold text-[var(--fg)] mb-1">{appointment.leads?.full_name}</h3>
            <p className="text-sm text-[var(--dim)] mb-5">{appointment.leads?.phone}</p>

            <Link
              href={`/admin/leads/${appointment.lead_id}`}
              className="neu-btn w-full justify-center text-sm"
            >
              Ver Ficha Cliente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
