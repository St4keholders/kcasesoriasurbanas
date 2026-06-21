'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SupplierSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  document_number: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});

export async function saveSupplier(id: string | null, data: z.infer<typeof SupplierSchema>) {
  const supabase = await createClient();
  
  if (id) {
    const { error } = await supabase.from('suppliers').update(data).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('suppliers').insert(data);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/proveedores');
}
