'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CostCenterSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export async function saveCostCenter(id: string | null, data: z.infer<typeof CostCenterSchema>) {
  const supabase = await createClient();
  
  if (id) {
    const { error } = await supabase.from('cost_centers').update(data).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('cost_centers').insert(data);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/catalogos/centros-costo');
}
