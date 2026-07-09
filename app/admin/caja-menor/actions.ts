'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { revalidatePath } from 'next/cache';

export async function deleteCajaMenor(id: string) {
  await requireRole(['admin', 'tesoreria', 'asesor']);
  
  const supabase = await createClient();
  const { error } = await supabase
    .from('petty_cash_boxes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Error al eliminar caja menor: ' + error.message);
  }

  revalidatePath('/admin/caja-menor');
}
