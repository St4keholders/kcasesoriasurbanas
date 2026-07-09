'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { revalidatePath } from 'next/cache';

export async function deleteCajaMenor(id: string) {
  await requireRole(['admin', 'tesoreria', 'asesor']);
  
  const supabase = await createClient();

  // Eliminar facturas asociadas primero para evitar error de foreign key (on delete restrict)
  const { error: entriesError } = await supabase
    .from('petty_cash_entries')
    .delete()
    .eq('box_id', id);

  if (entriesError) {
    throw new Error('Error al eliminar las facturas asociadas a la caja menor: ' + entriesError.message);
  }

  // Eliminar la caja menor
  const { error } = await supabase
    .from('petty_cash_boxes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Error al eliminar caja menor: ' + error.message);
  }

  revalidatePath('/admin/caja-menor');
}
