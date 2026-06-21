'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const LeadSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  document_number: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().min(5, 'Teléfono requerido'),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export async function createLead(data: z.infer<typeof LeadSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No autorizado');

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      ...data,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando lead:', error);
    throw new Error('Error al crear el cliente potencial.');
  }

  revalidatePath('/admin/leads');
  return lead.id;
}

export async function updateLead(id: string, data: z.infer<typeof LeadSchema>) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('leads')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error actualizando lead:', error);
    throw new Error('Error al actualizar el cliente potencial.');
  }

  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${id}`);
}
