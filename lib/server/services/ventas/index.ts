import { getServerDb } from '@/lib/server/db';
import type { Database } from '@/types/database';

type PaymentMethod = Database['public']['Enums']['payment_method'];

export async function markSalePaidService(saleId: string, paymentMethod: PaymentMethod) {
  const db = await getServerDb();
  const { data, error } = await db
    .from('sales')
    .update({
      status: 'pagada',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq('id', saleId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error al registrar pago de venta: ' + (error?.message || 'Desconocido'));
  }
  return data;
}

export async function voidSaleService(saleId: string, userId: string, reason: string) {
  const db = await getServerDb();
  const { data, error } = await db
    .from('sales')
    .update({
      status: 'anulada',
      void_reason: reason.trim(),
      voided_by: userId,
      voided_at: new Date().toISOString(),
    })
    .eq('id', saleId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error al anular venta: ' + (error?.message || 'Desconocido'));
  }
  return data;
}
