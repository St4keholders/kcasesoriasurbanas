'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PurchaseSchema = z.object({
  supplier_id: z.string().optional().or(z.literal('')),
  supplier_name: z.string().optional(),
  cost_center_id: z.string().min(1, 'Centro de costo requerido'),
  invoice_number: z.string().optional(),
  description: z.string().min(3, 'Descripción requerida'),
  invoice_date: z.string().min(1, 'Fecha de factura requerida'),
  due_date: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function createPurchase(data: z.infer<typeof PurchaseSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const total = data.amount + data.tax;

  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert({
      supplier_id: data.supplier_id || null,
      supplier_name: data.supplier_name,
      cost_center_id: data.cost_center_id,
      invoice_number: data.invoice_number,
      description: data.description,
      amount: data.amount,
      tax: data.tax,
      total,
      status: 'pendiente_pago',
      invoice_date: data.invoice_date,
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
