import { getServerDb } from '@/lib/server/db';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';
import type { z } from 'zod';
import type { PurchaseInputSchema } from '@/lib/validation';

export type PurchaseInput = z.infer<typeof PurchaseInputSchema>;

export async function createPurchaseService(userId: string, input: PurchaseInput) {
  const db = await getServerDb();

  let supplierId = input.supplier_id || null;
  if (!supplierId) {
    const supplier = await resolveOrCreateSupplier({
      name: input.supplier_name,
      documentNumber: input.supplier_document,
    });
    supplierId = supplier.id;
  }

  const calculatedTotal =
    input.total > 0
      ? input.total
      : Math.max(0, Number(input.amount) + Number(input.tax_iva) - Number(input.withholding_tax));

  const { data: purchase, error } = await db
    .from('purchases')
    .insert({
      supplier_id: supplierId,
      supplier_name: input.supplier_name,
      cost_center_id: input.cost_center_id || null,
      invoice_number: input.invoice_number || null,
      concept: input.concept,
      transaction_type: input.transaction_type,
      amount: input.amount,
      tax_iva: input.tax_iva,
      withholding_tax: input.withholding_tax,
      total: calculatedTotal,
      // Tesorería paga de contado: la compra nace pagada (CC + CE)
      status: 'pagado',
      payment_method: input.payment_method || 'transferencia',
      paid_at: new Date().toISOString(),
      category_id: input.category_id || null,
      transaction_date: input.transaction_date,
      due_date: input.due_date || null,
      notes: input.notes || null,
      invoice_url: input.invoice_url || input.support_storage_path || null,
      support_sha256: input.support_sha256 || null,
      support_storage_path: input.support_storage_path || null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !purchase) {
    throw new Error('Error al registrar compra: ' + (error?.message || 'Desconocido'));
  }

  return purchase;
}

export async function updatePurchaseService(id: string, input: Partial<PurchaseInput>) {
  const db = await getServerDb();

  let supplierId = input.supplier_id || undefined;
  if (!supplierId && input.supplier_name) {
    const supplier = await resolveOrCreateSupplier({
      name: input.supplier_name,
      documentNumber: input.supplier_document,
    });
    supplierId = supplier.id;
  }

  const amount = Number(input.amount ?? 0);
  const taxIva = Number(input.tax_iva ?? 0);
  const withholdingTax = Number(input.withholding_tax ?? 0);
  const total =
    input.total !== undefined ? Number(input.total) : Math.max(0, amount + taxIva - withholdingTax);

  const { data, error } = await db
    .from('purchases')
    .update({
      ...(supplierId ? { supplier_id: supplierId } : {}),
      ...(input.supplier_name !== undefined ? { supplier_name: input.supplier_name } : {}),
      ...(input.cost_center_id !== undefined ? { cost_center_id: input.cost_center_id || null } : {}),
      ...(input.invoice_number !== undefined ? { invoice_number: input.invoice_number || null } : {}),
      ...(input.concept !== undefined ? { concept: input.concept } : {}),
      ...(input.transaction_type !== undefined ? { transaction_type: input.transaction_type } : {}),
      ...(input.category_id ? { category_id: input.category_id } : {}),
      ...(input.payment_method ? { payment_method: input.payment_method } : {}),
      amount,
      tax_iva: taxIva,
      withholding_tax: withholdingTax,
      total,
      ...(input.transaction_date !== undefined ? { transaction_date: input.transaction_date } : {}),
      ...(input.due_date !== undefined ? { due_date: input.due_date || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.invoice_url !== undefined ? { invoice_url: input.invoice_url || null } : {}),
      ...(input.support_sha256 !== undefined ? { support_sha256: input.support_sha256 || null } : {}),
      ...(input.support_storage_path !== undefined
        ? { support_storage_path: input.support_storage_path || null }
        : {}),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error al actualizar la compra: ' + (error?.message || 'Desconocido'));
  }

  return data;
}

export async function voidPurchaseService(id: string, userId: string, reason: string) {
  const db = await getServerDb();
  const { data, error } = await db
    .from('purchases')
    .update({
      status: 'anulado',
      void_reason: reason.trim(),
      voided_by: userId,
      voided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Error al anular compra: ' + (error?.message || 'Desconocido'));
  }
  return data;
}
