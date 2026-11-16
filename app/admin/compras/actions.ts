'use server';

import { createClient } from '@/lib/supabase/server';
import { executeMutation, requireRoleApi } from '@/lib/server/auth';
import { PurchaseInputSchema, VoidRecordSchema, PaymentMethodEnum } from '@/lib/validation';
import {
  createPurchaseService,
  updatePurchaseService,
  voidPurchaseService,
} from '@/lib/server/services/compras';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createPurchaseAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    PurchaseInputSchema,
    rawInput,
    async ({ userId, input }) => {
      const created = await createPurchaseService(userId, input);
      revalidatePath('/admin/compras');
      return created;
    }
  );
}

export async function createPurchase(rawInput: unknown) {
  const res = await createPurchaseAction(rawInput);
  if (!res.ok) throw new Error(res.error);
  return res.data.id;
}

export async function payPurchase(id: string, paymentMethod: string) {
  const res = await executeMutation(
    ['admin', 'tesoreria'],
    z.object({
      id: z.string().uuid(),
      paymentMethod: PaymentMethodEnum,
    }),
    { id, paymentMethod },
    async ({ input }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('purchases')
        .update({
          status: 'pagado',
          payment_method: input.paymentMethod,
          paid_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error('Error al registrar el pago: ' + (error?.message || 'Desconocido'));
      }
      revalidatePath('/admin/compras');
      revalidatePath(`/admin/compras/${input.id}`);
      return data;
    }
  );
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function revertPurchasePayment(id: string) {
  await requireRoleApi(['admin', 'tesoreria']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'pendiente_pago',
      payment_method: null,
      paid_at: null,
    })
    .eq('id', id);

  if (error) throw new Error('Error al revertir el pago: ' + error.message);

  revalidatePath('/admin/compras');
  revalidatePath(`/admin/compras/${id}`);
  return { ok: true as const, data: { id } };
}

export async function updatePurchase(id: string, rawData: unknown) {
  const res = await executeMutation(
    ['admin', 'tesoreria'],
    PurchaseInputSchema.partial(),
    rawData,
    async ({ input }) => {
      const updated = await updatePurchaseService(id, input);
      revalidatePath('/admin/compras');
      revalidatePath(`/admin/compras/${id}`);
      return updated;
    }
  );
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function voidPurchase(id: string, reason: string) {
  const res = await executeMutation(
    ['admin', 'tesoreria'],
    VoidRecordSchema,
    { id, reason },
    async ({ userId, input }) => {
      const voided = await voidPurchaseService(input.id, userId, input.reason);
      revalidatePath('/admin/compras');
      return voided;
    }
  );
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function deletePurchase(id: string, reason = 'Anulado desde compras') {
  return voidPurchase(id, reason);
}
