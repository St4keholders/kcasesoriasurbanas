'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ServiceSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

export async function saveService(id: string | null, data: z.infer<typeof ServiceSchema>) {
  const supabase = await createClient();
  
  if (id) {
    // @ts-ignore
    const { error } = await supabase.from('service_types').update(data).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    // @ts-ignore
    const { error } = await supabase.from('service_types').insert(data);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/catalogos/servicios');
}
