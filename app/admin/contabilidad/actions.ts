'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { executeMutation } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { postPurchase, postPettyCash, postSale } from '@/lib/server/services/contabilidad/kc';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';

const SourceEnum = z.enum(['purchases', 'petty_cash_entries', 'sales']);
const OpRef = z.object({ source_table: SourceEnum, source_id: z.string().uuid() });

function refresh() {
  revalidatePath('/admin/contabilidad/auditoria');
  revalidatePath('/admin/contabilidad/libro-diario');
  revalidatePath('/admin/compras');
}

async function repost(source: z.infer<typeof SourceEnum>, id: string) {
  if (source === 'purchases') return postPurchase(id);
  if (source === 'petty_cash_entries') return postPettyCash(id);
  return postSale(id);
}

/** El contador aprueba una o varias operaciones: sus CC/CE quedan bloqueados. */
export async function approveOperationsAction(raw: unknown) {
  return executeMutation(['admin'], z.object({ items: z.array(OpRef).min(1).max(500) }), raw, async ({ input }) => {
    const db = await getServerDb();
    const ids: string[] = [];
    for (const source of ['purchases', 'petty_cash_entries', 'sales'] as const) {
      const sourceIds = input.items.filter((i) => i.source_table === source).map((i) => i.source_id);
      if (!sourceIds.length) continue;
      const { data } = await db
        .from('journal_entries')
        .select('id')
        .eq('source_table', source)
        .in('source_id', sourceIds)
        .eq('status', 'pendiente');
      ids.push(...(data || []).map((d) => d.id));
    }
    if (!ids.length) return { approved: 0 };
    const { data, error } = await db.rpc('kc_approve_entries', { p_ids: ids });
    if (error) throw new Error(error.message);
    refresh();
    return { approved: Number(data || 0) };
  });
}

const UpdateOperationSchema = OpRef.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  supplier_name: z.string().trim().min(1, 'El tercero es obligatorio'),
  supplier_document: z.string().trim().optional().or(z.literal('')),
  concept: z.string().trim().min(1, 'El concepto es obligatorio'),
  category_id: z.string().uuid('Escoge una categoría'),
  cost_center_id: z.string().uuid().optional().or(z.literal('')),
  invoice_number: z.string().trim().optional().or(z.literal('')),
  base: z.coerce.number().min(0),
  iva: z.coerce.number().min(0),
  retencion: z.coerce.number().min(0),
});

/** Corrección del contador antes de aprobar: actualiza la operación y el mismo CC/CE (no crea comprobantes nuevos). */
export async function updateOperationAction(raw: unknown) {
  return executeMutation(['admin', 'tesoreria'], UpdateOperationSchema, raw, async ({ input }) => {
    const db = await getServerDb();
    const { data: locked } = await db
      .from('journal_entries')
      .select('id')
      .eq('source_table', input.source_table)
      .eq('source_id', input.source_id)
      .eq('status', 'aprobado')
      .limit(1);
    if (locked?.length) throw new Error('Esta operación ya fue aprobada y está bloqueada.');

    if (input.source_table === 'purchases') {
      const supplier = await resolveOrCreateSupplier({
        name: input.supplier_name,
        documentNumber: input.supplier_document || null,
      });
      const { error } = await db
        .from('purchases')
        .update({
          transaction_date: input.date,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          concept: input.concept,
          category_id: input.category_id,
          cost_center_id: input.cost_center_id || null,
          invoice_number: input.invoice_number || null,
          amount: input.base,
          tax_iva: input.iva,
          withholding_tax: input.retencion,
        })
        .eq('id', input.source_id);
      if (error) throw new Error(error.message);
    } else if (input.source_table === 'petty_cash_entries') {
      const { error } = await db
        .from('petty_cash_entries')
        .update({
          entry_date: input.date,
          supplier_name: input.supplier_name,
          supplier_document: input.supplier_document || null,
          concept: input.concept,
          category_id: input.category_id,
          invoice_number: input.invoice_number || null,
          tax_amount: input.iva,
          total_amount: input.base + input.iva,
        })
        .eq('id', input.source_id);
      if (error) throw new Error(error.message);
    } else {
      throw new Error('Las ventas se corrigen desde el módulo de Ventas.');
    }
    await repost(input.source_table, input.source_id);
    refresh();
    return { ok: true };
  });
}

/** Anular una operación (por ejemplo, duplicada). Sus comprobantes pendientes quedan anulados. */
export async function voidOperationAction(raw: unknown) {
  return executeMutation(
    ['admin'],
    OpRef.extend({ reason: z.string().trim().min(3, 'Indica el motivo') }),
    raw,
    async ({ userId, input }) => {
      const db = await getServerDb();
      const now = new Date().toISOString();
      const patch = { void_reason: input.reason, voided_by: userId, voided_at: now };
      if (input.source_table === 'purchases') {
        const { error } = await db.from('purchases').update({ ...patch, status: 'anulado' }).eq('id', input.source_id);
        if (error) throw new Error(error.message);
      } else if (input.source_table === 'petty_cash_entries') {
        const { error } = await db.from('petty_cash_entries').update({ ...patch, status: 'anulado' }).eq('id', input.source_id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from('sales').update({ ...patch, status: 'anulada' }).eq('id', input.source_id);
        if (error) throw new Error(error.message);
      }
      await repost(input.source_table, input.source_id);
      refresh();
      return { ok: true };
    }
  );
}

// ---------------- Parametrización ----------------

const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2),
  office_account: z.string().trim().min(4),
  obra_account: z.string().trim().optional().or(z.literal('')),
  payable_account: z.string().trim().min(4),
  withholding_account: z.string().trim().min(4),
  is_deductible: z.boolean(),
  is_active: z.boolean(),
  ai_hint: z.string().trim().optional().or(z.literal('')),
});

export async function saveCategoryAction(raw: unknown) {
  return executeMutation(['admin'], CategorySchema, raw, async ({ input }) => {
    const db = await getServerDb();
    const row = {
      name: input.name,
      office_account: input.office_account,
      obra_account: input.obra_account || null,
      payable_account: input.payable_account,
      withholding_account: input.withholding_account,
      is_deductible: input.is_deductible,
      is_active: input.is_active,
      ai_hint: input.ai_hint || null,
      updated_at: new Date().toISOString(),
    };
    if (input.id) {
      const { error } = await db.from('expense_categories').update(row).eq('id', input.id);
      if (error) throw new Error(error.message);
    } else {
      const slug = input.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const { error } = await db.from('expense_categories').insert({ ...row, slug, sort_order: 500 });
      if (error) throw new Error(error.message);
    }
    revalidatePath('/admin/contabilidad/parametrizacion');
    return { ok: true };
  });
}

/** Reaplica la categoría a todas las operaciones pendientes que la usan (después de cambiar sus cuentas). */
export async function reapplyCategoryAction(raw: unknown) {
  return executeMutation(['admin'], z.object({ id: z.string().uuid() }), raw, async ({ input }) => {
    const db = await getServerDb();
    const [{ data: ps }, { data: es }] = await Promise.all([
      db.from('purchases').select('id').eq('category_id', input.id),
      db.from('petty_cash_entries').select('id').eq('category_id', input.id),
    ]);
    for (const p of ps || []) await postPurchase(p.id);
    for (const e of es || []) await postPettyCash(e.id);
    refresh();
    return { updated: (ps?.length || 0) + (es?.length || 0) };
  });
}

const AccountSchema = z.object({
  code: z.string().trim().regex(/^\d{4,10}$/, 'El código debe tener solo dígitos'),
  name: z.string().trim().min(3),
});

export async function createAccountAction(raw: unknown) {
  return executeMutation(['admin'], AccountSchema, raw, async ({ input }) => {
    const db = await getServerDb();
    const parent = input.code.length > 6 ? input.code.slice(0, 6) : input.code.slice(0, input.code.length - 2);
    const level = input.code.length > 6 ? 'auxiliar' : input.code.length === 6 ? 'subcuenta' : 'cuenta';
    const { error } = await db.from('chart_of_accounts').upsert({
      code: input.code,
      name: input.name.toUpperCase(),
      account_class: Number(input.code[0]),
      level,
      parent_code: parent,
      nature: ['1', '5', '6', '7'].includes(input.code[0]) ? 'debito' : 'credito',
      is_postable: true,
      requires_third_party: true,
      requires_cost_center: ['5', '6', '7'].includes(input.code[0]),
      is_active: true,
    });
    if (error) throw new Error(error.message);
    revalidatePath('/admin/contabilidad/parametrizacion');
    return { ok: true };
  });
}

export async function saveSettingsAction(raw: unknown) {
  return executeMutation(
    ['admin'],
    z.object({ reviso_name: z.string().trim().min(2), aprobo_name: z.string().trim().min(2) }),
    raw,
    async ({ input }) => {
      const db = await getServerDb();
      const { error } = await db
        .from('accounting_settings')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw new Error(error.message);
      revalidatePath('/admin/contabilidad/parametrizacion');
      return { ok: true };
    }
  );
}

// ---------------- Compras a crédito ----------------

const CreditPurchaseSchema = z.object({
  supplier_name: z.string().trim().min(1, 'El proveedor es obligatorio'),
  supplier_document: z.string().trim().optional().or(z.literal('')),
  invoice_number: z.string().trim().min(1, 'El número de factura es obligatorio'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de vencimiento'),
  concept: z.string().trim().min(1),
  category_id: z.string().uuid('Escoge una categoría'),
  cost_center_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.coerce.number().positive(),
  tax_iva: z.coerce.number().min(0).default(0),
  withholding_tax: z.coerce.number().min(0).default(0),
  support_storage_path: z.string().trim().optional().or(z.literal('')),
  support_sha256: z.string().trim().optional().or(z.literal('')),
});

export async function createCreditPurchaseAction(raw: unknown) {
  return executeMutation(['admin', 'tesoreria'], CreditPurchaseSchema, raw, async ({ userId, input }) => {
    const db = await getServerDb();
    const supplier = await resolveOrCreateSupplier({
      name: input.supplier_name,
      documentNumber: input.supplier_document || null,
    });
    const { data, error } = await db
      .from('purchases')
      .insert({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        invoice_number: input.invoice_number,
        transaction_date: input.transaction_date,
        due_date: input.due_date,
        concept: input.concept,
        category_id: input.category_id,
        cost_center_id: input.cost_center_id || null,
        transaction_type: 'costo_gasto',
        amount: input.amount,
        tax_iva: input.tax_iva,
        withholding_tax: input.withholding_tax,
        total: input.amount + input.tax_iva - input.withholding_tax,
        status: 'pendiente_pago',
        support_storage_path: input.support_storage_path || null,
        support_sha256: input.support_sha256 || null,
        created_by: userId,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message || 'No se pudo registrar la compra');
    await postPurchase(data.id);
    revalidatePath('/admin/contabilidad/credito');
    refresh();
    return { id: data.id };
  });
}

// ---------------- Detalle de operación (panel de Auditoría) ----------------

export async function getOperationAction(raw: unknown) {
  return executeMutation(['admin', 'tesoreria'], OpRef, raw, async ({ input }) => {
    const { loadOperation } = await import('@/lib/server/services/contabilidad/kc');
    const { createSupportSignedViewUrl } = await import('@/lib/server/storage');
    const op = await loadOperation(input.source_table, input.source_id);
    if (!op) throw new Error('Operación no encontrada');
    let viewUrl: string | null = null;
    let viewKind: 'pdf' | 'image' | 'drive' | 'none' = 'none';
    if (op.support) {
      const driveId = op.support.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] || op.support.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1];
      if (driveId) {
        viewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
        viewKind = 'drive';
      } else if (!op.support.startsWith('http')) {
        viewUrl = await createSupportSignedViewUrl(op.support, 3600);
        viewKind = /\.pdf($|\?)/i.test(op.support) ? 'pdf' : 'image';
      } else {
        viewUrl = op.support;
        viewKind = /\.pdf($|\?)/i.test(op.support) ? 'pdf' : 'image';
      }
    }
    const db = await getServerDb();
    let category_id: string | null = null;
    let cost_center_id: string | null = null;
    if (input.source_table === 'purchases') {
      const { data } = await db.from('purchases').select('category_id, cost_center_id').eq('id', input.source_id).single();
      category_id = data?.category_id ?? null;
      cost_center_id = data?.cost_center_id ?? null;
    } else if (input.source_table === 'petty_cash_entries') {
      const { data } = await db.from('petty_cash_entries').select('category_id, petty_cash_boxes(cost_center_id)').eq('id', input.source_id).single();
      category_id = data?.category_id ?? null;
      cost_center_id = (data as any)?.petty_cash_boxes?.cost_center_id ?? null;
    }
    return { ...op, viewUrl, viewKind, category_id, cost_center_id };
  });
}
