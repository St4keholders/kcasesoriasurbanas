import { getServerDb } from '@/lib/server/db';
import { normalizeNitDigits, parseNitAndDv } from '@/lib/utils/nit';
import type { z } from 'zod';
import type { PettyCashEntrySchema } from '@/lib/validation';

export type PettyCashEntryInput = z.infer<typeof PettyCashEntrySchema>;

export async function createPettyCashEntryService(userId: string, input: PettyCashEntryInput) {
  const db = await getServerDb();
  const cleanDoc = normalizeNitDigits(input.supplier_document)
    ? parseNitAndDv(input.supplier_document).formatted
    : null;

  const { data, error } = await db
    .from('petty_cash_entries')
    .insert({
      box_id: input.box_id,
      entry_type: input.entry_type,
      entry_date: input.entry_date,
      supplier_name: input.supplier_name.trim(),
      supplier_document: cleanDoc,
      invoice_number: input.invoice_number?.trim() || null,
      concept: input.concept.trim(),
      tax_amount: input.tax_amount,
      total_amount: input.total_amount,
      receipt_url: input.receipt_url || input.support_storage_path || null,
      support_sha256: input.support_sha256 || null,
      support_storage_path: input.support_storage_path || null,
      status: 'activo',
      category_id: input.category_id || null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error registrando movimiento de caja menor: ' + (error?.message || 'Desconocido'));
  }

  return data;
}

export async function voidPettyCashEntryService(entryId: string, userId: string, reason: string) {
  const db = await getServerDb();
  const { data, error } = await db
    .from('petty_cash_entries')
    .update({
      status: 'anulado',
      void_reason: reason.trim(),
      voided_by: userId,
      voided_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error anulando movimiento de caja menor: ' + (error?.message || 'Desconocido'));
  }
  return data;
}
