'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AppointmentSchema = z.object({
  lead_id: z.string().optional().or(z.literal('')),
  lead_name: z.string().optional(),
  service_type_id: z.string().optional().or(z.literal('')),
  assigned_advisor_id: z.string().min(1, 'Debe asignar un asesor'),
  scheduled_at: z.string().min(1, 'Fecha y hora requerida'),
  duration_minutes: z.coerce.number().min(15).default(60),
  notes: z.string().optional(),
});

export async function createAppointment(data: z.infer<typeof AppointmentSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  let finalLeadId = data.lead_id;

  if (!finalLeadId) {
    const leadNameToCreate = data.lead_name?.trim() || 'Cliente Final';
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name: leadNameToCreate,
        phone: '0000000000', // Teléfono requerido por base de datos
        created_by: user.id
      })
      .select('id')
      .single();
    
    if (leadError) throw new Error('Error al crear el cliente: ' + leadError.message);
    finalLeadId = newLead.id;
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      lead_id: finalLeadId,
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
