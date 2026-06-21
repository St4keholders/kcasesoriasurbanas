'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SaleItemSchema = z.object({
  service_type_id: z.string().optional().or(z.literal('')),
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.coerce.number().min(0.1, 'Cantidad mayor a 0'),
  unit_price: z.coerce.number().min(0, 'Precio mayor o igual a 0'),
});

const SaleSchema = z.object({
  lead_id: z.string().min(1, 'Debe seleccionar un cliente'),
  appointment_id: z.string().optional().or(z.literal('')),
  status: z.enum(['cotizacion', 'pendiente_pago', 'pagada']),
  items: z.array(SaleItemSchema).min(1, 'Debe agregar al menos un ítem'),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function createSale(data: z.infer<typeof SaleSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  // Calcular totales
  const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const total = subtotal + data.tax - data.discount;

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      lead_id: data.lead_id,
      appointment_id: data.appointment_id || null,
      closed_by: user.id,
      status: data.status,
      subtotal,
      tax: data.tax,
      discount: data.discount,
      total,
      notes: data.notes
    })
    .select('id')
    .single();

  if (saleError) throw new Error('Error al crear la venta: ' + saleError.message);

  const itemsToInsert = data.items.map(item => ({
    sale_id: sale.id,
    service_type_id: item.service_type_id || null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price
  }));

  const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
  
  if (itemsError) throw new Error('Error al guardar los ítems de la venta: ' + itemsError.message);

  revalidatePath('/admin/ventas');
  return sale.id;
}

export async function registerPayment(saleId: string, paymentMethod: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sales')
    .update({
      status: 'pagada',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString()
    })
    .eq('id', saleId);

  if (error) throw new Error('Error al registrar el pago: ' + error.message);

  revalidatePath('/admin/ventas');
  revalidatePath(`/admin/ventas/${saleId}`);
}
