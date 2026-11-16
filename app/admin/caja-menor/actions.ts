'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, executeMutation } from '@/lib/server/auth';
import { PettyCashEntrySchema, VoidRecordSchema } from '@/lib/validation';
import {
  createPettyCashEntryService,
  voidPettyCashEntryService,
} from '@/lib/server/services/caja-menor';
import { revalidatePath } from 'next/cache';
import { postPettyCash } from '@/lib/server/services/contabilidad/kc';

export async function createPettyCashEntryAction(rawInput: unknown) {
  const result = await executeMutation(
    ['admin', 'tesoreria', 'asesor'],
    PettyCashEntrySchema,
    rawInput,
    async ({ userId, input }) => {
      const entry = await createPettyCashEntryService(userId, input);
      await postPettyCash(entry.id);
      revalidatePath('/admin/caja-menor');
      revalidatePath(`/admin/caja-menor/${input.box_id}`);
      return entry;
    }
  );
  return result;
}

export async function voidCajaMenor(id: string, reason: string) {
  const { profile } = await requireRole(['admin', 'tesoreria', 'asesor']);
  const parsed = VoidRecordSchema.safeParse({ id, reason });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Datos de anulación inválidos');
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { error: entriesError } = await supabase
    .from('petty_cash_entries')
    .update({
      status: 'anulado',
      void_reason: parsed.data.reason,
      voided_by: profile.id,
      voided_at: nowIso,
    })
    .eq('box_id', parsed.data.id);

  if (entriesError) {
    throw new Error('Error al anular los movimientos de la caja menor: ' + entriesError.message);
  }

  const { error } = await supabase
    .from('petty_cash_boxes')
    .update({
      status: 'anulada',
      void_reason: parsed.data.reason,
      voided_by: profile.id,
      voided_at: nowIso,
    })
    .eq('id', parsed.data.id);

  if (error) {
    throw new Error('Error al anular la caja menor: ' + error.message);
  }

  const { data: voidedEntries } = await supabase.from('petty_cash_entries').select('id').eq('box_id', parsed.data.id);
  for (const e of voidedEntries || []) await postPettyCash(e.id);

  revalidatePath('/admin/caja-menor');
  revalidatePath(`/admin/caja-menor/${parsed.data.id}`);
  return { ok: true as const, data: { id: parsed.data.id } };
}

export async function voidPettyCashEntry(entryId: string, boxId: string, reason: string) {
  const result = await executeMutation(
    ['admin', 'tesoreria', 'asesor'],
    VoidRecordSchema,
    { id: entryId, reason },
    async ({ userId, input }) => {
      const updated = await voidPettyCashEntryService(input.id, userId, input.reason);
      await postPettyCash(input.id);
      revalidatePath('/admin/caja-menor');
      revalidatePath(`/admin/caja-menor/${boxId}`);
      return updated;
    }
  );
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result;
}

export async function deleteCajaMenor(id: string, reason = 'Anulada desde listado de cajas menores') {
  return voidCajaMenor(id, reason);
}

/** Regenera el CC/CE de un movimiento de caja menor después de crearlo o editarlo. */
export async function repostPettyCashAction(entryId: string) {
  const result = await executeMutation(
    ['admin', 'tesoreria', 'asesor'],
    VoidRecordSchema.pick({ id: true }),
    { id: entryId },
    async ({ input }) => {
      await postPettyCash(input.id);
      revalidatePath('/admin/contabilidad/auditoria');
      return { ok: true };
    }
  );
  if (!result.ok) throw new Error(result.error);
  return result;
}
