'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { revalidatePath } from 'next/cache';

export async function voidCajaMenor(id: string, reason: string) {
  const profile = await requireRole(['admin', 'tesoreria', 'asesor']);
  const trimmedReason = (reason || '').trim();
  if (!trimmedReason) {
    throw new Error('Debes indicar el motivo de anulación.');
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { error: entriesError } = await supabase
    .from('petty_cash_entries')
    .update({
      status: 'anulado',
      void_reason: trimmedReason,
      voided_by: profile.id,
      voided_at: nowIso,
    })
    .eq('box_id', id);

  if (entriesError) {
    throw new Error('Error al anular los movimientos de la caja menor: ' + entriesError.message);
  }

  const { error } = await supabase
    .from('petty_cash_boxes')
    .update({
      status: 'anulada',
      void_reason: trimmedReason,
      voided_by: profile.id,
      voided_at: nowIso,
    })
    .eq('id', id);

  if (error) {
    throw new Error('Error al anular la caja menor: ' + error.message);
  }

  revalidatePath('/admin/caja-menor');
  revalidatePath(`/admin/caja-menor/${id}`);
}

export async function voidPettyCashEntry(entryId: string, boxId: string, reason: string) {
  const profile = await requireRole(['admin', 'tesoreria', 'asesor']);
  const trimmedReason = (reason || '').trim();
  if (!trimmedReason) {
    throw new Error('Debes indicar el motivo de anulación.');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('petty_cash_entries')
    .update({
      status: 'anulado',
      void_reason: trimmedReason,
      voided_by: profile.id,
      voided_at: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (error) {
    throw new Error('Error al anular movimiento de caja menor: ' + error.message);
  }

  revalidatePath('/admin/caja-menor');
  revalidatePath(`/admin/caja-menor/${boxId}`);
}

export async function deleteCajaMenor(id: string, reason = 'Anulada desde listado de cajas menores') {
  return voidCajaMenor(id, reason);
}
