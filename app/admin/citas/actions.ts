'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AppointmentSchema = z.object({
  lead_id: z.string().uuid('Debe seleccionar un cliente'),
  service_type_id: z.string().uuid('Debe seleccionar un servicio').optional().or(z.literal('')),
  assigned_advisor_id: z.string().uuid('Debe asignar un asesor'),
  scheduled_at: z.string().min(1, 'Fecha y hora requerida'),
  duration_minutes: z.coerce.number().min(15).default(60),
  notes: z.string().optional(),
});

export async function createAppointment(data: z.infer<typeof AppointmentSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      lead_id: data.lead_id,
      service_type_id: data.service_type_id || null,
      assigned_advisor_id: data.assigned_advisor_id,
      scheduled_at: data.scheduled_at,
      duration_minutes: data.duration_minutes,
      notes: data.notes,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error agendando cita:', error);
    throw new Error('Error al agendar la cita.');
  }

  revalidatePath('/admin/citas');
  return appointment.id;
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();
  
  const updates: any = { status };
  if (status === 'atendida') {
    updates.attended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error actualizando cita:', error);
    throw new Error('Error al actualizar el estado de la cita.');
  }

  revalidatePath('/admin/citas');
  revalidatePath(`/admin/citas/${id}`);
}
