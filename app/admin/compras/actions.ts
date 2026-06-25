'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PurchaseSchema = z.object({
  supplier_name: z.string().min(1, 'Proveedor requerido'),
  cost_center_id: z.string().optional().or(z.literal('')),
  invoice_number: z.string().optional(),
  concept: z.string().min(1, 'Concepto requerido'),
  amount: z.coerce.number().min(0, 'Monto >= 0'),
  tax_iva: z.coerce.number().min(0, 'IVA >= 0'),
  withholding_tax: z.coerce.number().min(0, 'Retención >= 0').default(0),
  total: z.coerce.number().min(0),
  transaction_date: z.string().min(1, 'Fecha requerida'),
  transaction_type: z.enum(['costo_gasto', 'inversion', 'otro']).default('costo_gasto'),
  due_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function createPurchase(data: z.infer<typeof PurchaseSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  let supplierId = null;
  const { data: existingSuppliers } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('name', data.supplier_name)
    .limit(1);

  if (existingSuppliers && existingSuppliers.length > 0) {
    supplierId = existingSuppliers[0].id;
  } else {
    const { data: newSupplier } = await supabase
      .from('suppliers')
      .insert({ name: data.supplier_name, document_number: '000000000', is_active: true })
      .select()
      .single();
    if (newSupplier) supplierId = newSupplier.id;
  }

  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert({
      supplier_id: supplierId,
      supplier_name: data.supplier_name,
      cost_center_id: data.cost_center_id || null,
      invoice_number: data.invoice_number,
      concept: data.concept,
      transaction_type: data.transaction_type,
      amount: data.amount,
      tax_iva: data.tax_iva,
      withholding_tax: data.withholding_tax,
      total: data.total,
      status: 'pendiente_pago',
      transaction_date: data.transaction_date,
      due_date: data.due_date || null,
      notes: data.notes,
      created_by: user.id
    })
    .select('id')
    .single();

  if (error) throw new Error('Error al registrar compra: ' + error.message);

  revalidatePath('/admin/compras');
  return purchase.id;
}

export async function payPurchase(id: string, paymentMethod: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'pagado',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new Error('Error al registrar el pago: ' + error.message);

  revalidatePath('/admin/compras');
  revalidatePath(`/admin/compras/${id}`);
}

export async function revertPurchasePayment(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'pendiente_pago',
      payment_method: null,
      paid_at: null
    })
    .eq('id', id);

  if (error) throw new Error('Error al revertir el pago: ' + error.message);

  revalidatePath('/admin/compras');
  revalidatePath(`/admin/compras/${id}`);
}

export async function updatePurchase(id: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  let supplierId = null;
  
  if (data.supplier_name && data.supplier_name !== 'Proveedor Ocasional') {
    // 1. Try to find the supplier by exact name match
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', data.supplier_name)
      .limit(1);

    if (existingSuppliers && existingSuppliers.length > 0) {
      supplierId = existingSuppliers[0].id;
    } else {
      // 2. Create it if not found
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: data.supplier_name,
          document_number: '000000000',
          is_active: true
        })
        .select()
        .single();
      
      if (!supplierError && newSupplier) {
        supplierId = newSupplier.id;
      }
    }
  }

  const { error } = await supabase
    .from('purchases')
    .update({
      supplier_id: supplierId,
      supplier_name: data.supplier_name,
      cost_center_id: data.cost_center_id || null,
      invoice_number: data.invoice_number,
      concept: data.concept,
      transaction_type: data.transaction_type,
      amount: data.amount,
      tax_iva: data.tax_iva,
      withholding_tax: data.withholding_tax,
      total: data.total !== undefined ? data.total : (data.amount + data.tax_iva - data.withholding_tax),
      transaction_date: data.transaction_date,
      due_date: data.due_date || null,
      notes: data.notes
    })
    .eq('id', id);

  if (error) throw new Error('Error al actualizar la compra: ' + error.message);

  revalidatePath('/admin/compras');
}
