'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { executeMutation } from '@/lib/server/auth';
import { getServerDb, getAdminDb } from '@/lib/server/db';
import { PurchaseInputSchema, VoidRecordSchema, PaymentMethodEnum } from '@/lib/validation';
import { createPurchaseService, updatePurchaseService, voidPurchaseService } from '@/lib/server/services/compras';
import { postPurchase, postPettyCash } from '@/lib/server/services/contabilidad/kc';
import { extractInvoice } from '@/lib/server/services/ia/factura';
import { checkSupportSha256Duplicate } from '@/lib/server/storage';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';

function refresh(id?: string) {
  revalidatePath('/admin/compras');
  if (id) revalidatePath(`/admin/compras/${id}`);
  revalidatePath('/admin/contabilidad/auditoria');
}

/** Nueva compra desde Tesorería: se paga de contado → CC + CE. */
export async function createPurchaseAction(rawInput: unknown) {
  return executeMutation(['admin', 'tesoreria'], PurchaseInputSchema, rawInput, async ({ userId, input }) => {
    const created = await createPurchaseService(userId, input);
    await postPurchase(created.id);
    refresh(created.id);
    return created;
  });
}

export async function createPurchase(rawInput: unknown) {
  const res = await createPurchaseAction(rawInput);
  if (!res.ok) throw new Error(res.error);
  return res.data.id;
}

/** Pago de una compra a crédito pendiente → genera el CE. */
export async function payPurchase(id: string, paymentMethod: string) {
  const res = await executeMutation(
    ['admin', 'tesoreria'],
    z.object({ id: z.string().uuid(), paymentMethod: PaymentMethodEnum }),
    { id, paymentMethod },
    async ({ input }) => {
      const db = await getServerDb();
      const { data, error } = await db
        .from('purchases')
        .update({ status: 'pagado', payment_method: input.paymentMethod, paid_at: new Date().toISOString() })
        .eq('id', input.id)
        .select('*')
        .single();
      if (error || !data) throw new Error('Error al registrar el pago: ' + (error?.message || 'Desconocido'));
      await postPurchase(input.id);
      refresh(input.id);
      return data;
    }
  );
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function revertPurchasePayment(_id: string) {
  void _id;
  return {
    ok: false as const,
    error: 'El pago ya tiene comprobante de egreso. Si fue un error, anula la compra y regístrala de nuevo.',
    code: 'NOT_ALLOWED',
  };
}

export async function updatePurchase(id: string, rawData: unknown) {
  const res = await executeMutation(['admin', 'tesoreria'], PurchaseInputSchema.partial(), rawData, async ({ input }) => {
    const updated = await updatePurchaseService(id, input);
    await postPurchase(id);
    refresh(id);
    return updated;
  });
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function voidPurchase(id: string, reason: string) {
  const res = await executeMutation(['admin', 'tesoreria'], VoidRecordSchema, { id, reason }, async ({ userId, input }) => {
    const voided = await voidPurchaseService(input.id, userId, input.reason);
    await postPurchase(input.id);
    refresh(input.id);
    return voided;
  });
  if (!res.ok) throw new Error(res.error);
  return res;
}

export async function deletePurchase(id: string, reason = 'Anulado desde Tesorería') {
  return voidPurchase(id, reason);
}

// ---------------- Carga masiva (Tesorería y Caja menor) ----------------

const ExtractSchema = z.object({
  storagePath: z.string().trim().min(3),
  mimeType: z.string().trim().default('application/octet-stream'),
  filename: z.string().trim().min(1),
  sha256: z.string().trim().optional().or(z.literal('')),
});

/** Lee la factura ya subida a Storage y devuelve los campos llenos por la IA. */
export async function extractInvoiceAction(raw: unknown) {
  return executeMutation(['admin', 'tesoreria', 'asesor'], ExtractSchema, raw, async ({ input }) => {
    const admin = getAdminDb();
    const path = input.storagePath.replace(/^soportes\//, '');
    const { data: blob, error } = await admin.storage.from('soportes').download(path);
    if (error || !blob) throw new Error('No se pudo leer el archivo subido.');
    const bytes = Buffer.from(await blob.arrayBuffer());

    const db = await getServerDb();
    const [{ data: categories }, { data: centers }] = await Promise.all([
      db.from('expense_categories').select('id, slug, name, ai_hint').eq('is_active', true).order('sort_order'),
      db.from('cost_centers').select('id, name').eq('is_active', true),
    ]);

    const extracted = await extractInvoice({
      bytes,
      mimeType: input.mimeType || blob.type,
      filename: input.filename,
      categories: (categories || []).map((c) => ({ slug: c.slug, name: c.name, ai_hint: c.ai_hint })),
      costCenters: (centers || []).map((c) => c.name),
    });

    const warnings = [...extracted.warnings];
    if (input.sha256) {
      const dup = await checkSupportSha256Duplicate(input.sha256);
      if (dup.isDuplicate) warnings.unshift('Este mismo archivo ya fue cargado antes.');
    }

    const category = (categories || []).find((c) => c.slug === extracted.category_slug);
    const center = (centers || []).find((c) => c.name === extracted.cost_center_name);
    return {
      ...extracted,
      warnings,
      category_id: category?.id || (categories || []).find((c) => c.slug === 'otros')?.id || '',
      cost_center_id: center?.id || '',
    };
  });
}

const SaveInvoiceSchema = z.object({
  target: z.enum(['compras', 'caja']),
  box_id: z.string().uuid().optional().or(z.literal('')),
  supplier_name: z.string().trim().min(1, 'Falta el proveedor'),
  supplier_document: z.string().trim().optional().or(z.literal('')),
  invoice_number: z.string().trim().optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Falta la fecha'),
  concept: z.string().trim().min(1, 'Falta el concepto'),
  category_id: z.string().uuid('Escoge la categoría'),
  cost_center_id: z.string().uuid().optional().or(z.literal('')),
  payment_method: PaymentMethodEnum.default('transferencia'),
  base: z.coerce.number().min(0),
  iva: z.coerce.number().min(0).default(0),
  retencion: z.coerce.number().min(0).default(0),
  total: z.coerce.number().positive('El total debe ser mayor a $0'),
  cufe: z.string().trim().optional().or(z.literal('')).nullable(),
  storagePath: z.string().trim().min(3),
  sha256: z.string().trim().optional().or(z.literal('')),
});

/** Guarda una factura verificada por el auxiliar. Tesorería → compra pagada (CC + CE). Caja → movimiento de caja (CC + CE desde 110510). */
export async function saveInvoiceAction(raw: unknown) {
  return executeMutation(['admin', 'tesoreria', 'asesor'], SaveInvoiceSchema, raw, async ({ userId, profile, input }) => {
    const db = await getServerDb();
    if (input.target === 'compras') {
      if (profile.role === 'asesor') throw new Error('No tienes permiso para registrar compras de Tesorería.');
      const supplier = await resolveOrCreateSupplier({
        name: input.supplier_name,
        documentNumber: input.supplier_document || null,
      });
      const { data, error } = await db
        .from('purchases')
        .insert({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          invoice_number: input.invoice_number || null,
          transaction_date: input.date,
          concept: input.concept,
          category_id: input.category_id,
          cost_center_id: input.cost_center_id || null,
          transaction_type: 'costo_gasto',
          amount: input.base,
          tax_iva: input.iva,
          withholding_tax: input.retencion,
          total: input.total,
          status: 'pagado',
          payment_method: input.payment_method,
          paid_at: new Date().toISOString(),
          support_storage_path: input.storagePath,
          support_sha256: input.sha256 || null,
          notes: input.cufe ? `CUFE: ${input.cufe}` : null,
          created_by: userId,
        })
        .select('id, purchase_number')
        .single();
      if (error || !data) throw new Error(error?.message || 'No se pudo guardar la compra');
      await postPurchase(data.id);
      refresh(data.id);
      return { id: data.id, number: data.purchase_number };
    }

    if (!input.box_id) throw new Error('Falta la caja menor');
    const { data, error } = await db
      .from('petty_cash_entries')
      .insert({
        box_id: input.box_id,
        entry_type: 'egreso',
        entry_date: input.date,
        supplier_name: input.supplier_name,
        supplier_document: input.supplier_document || null,
        invoice_number: input.invoice_number || null,
        concept: input.concept,
        category_id: input.category_id,
        tax_amount: input.iva,
        total_amount: input.total,
        support_storage_path: input.storagePath,
        support_sha256: input.sha256 || null,
        status: 'activo',
        created_by: userId,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message || 'No se pudo guardar el movimiento');
    await postPettyCash(data.id);
    revalidatePath(`/admin/caja-menor/${input.box_id}`);
    revalidatePath('/admin/contabilidad/auditoria');
    return { id: data.id, number: null };
  });
}
