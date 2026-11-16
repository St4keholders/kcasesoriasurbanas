'use server';

import { executeMutation } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { ingestDocumentService } from '@/lib/server/services/ingesta';
import { resolveOrCreateSupplier } from '@/lib/server/services/terceros';
import {
  ensureDraftEntriesForPurchase,
  recordClassificationCorrection,
} from '@/lib/server/services/contabilidad';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CreateIngestionSchema = z.object({
  storagePath: z.string().trim().min(1),
  sha256: z.string().trim().min(10),
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().default('application/octet-stream'),
  costCenterId: z.string().uuid().optional().or(z.literal('')).nullable(),
  rawTextOrXml: z.string().optional().nullable(),
});

export async function processUploadedIngestionAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria', 'asesor'],
    CreateIngestionSchema,
    rawInput,
    async ({ userId, input }) => {
      const ing = await ingestDocumentService({
        userId,
        storagePath: input.storagePath,
        sha256: input.sha256,
        filename: input.filename,
        mimeType: input.mimeType,
        costCenterId: input.costCenterId || null,
        rawTextOrXml: input.rawTextOrXml || null,
      });
      revalidatePath('/admin/ingesta');
      revalidatePath('/admin/compras');
      revalidatePath('/admin/contabilidad/borradores');
      return ing;
    }
  );
}

const ApproveOrCorrectIngestionSchema = z.object({
  id: z.string().uuid(),
  supplier_name: z.string().trim().min(1, 'El nombre del proveedor es obligatorio'),
  supplier_nit: z.string().trim().optional().or(z.literal('')),
  supplier_dv: z.string().trim().optional().or(z.literal('')),
  invoice_number: z.string().trim().optional().or(z.literal('')),
  issue_date: z.string().trim().min(1, 'La fecha es obligatoria'),
  cost_center_id: z.string().uuid().optional().or(z.literal('')).nullable(),
  concept: z.string().trim().min(1, 'El concepto es obligatorio'),
  subtotal: z.coerce.number().min(0),
  tax_iva: z.coerce.number().min(0).default(0),
  withholding_tax: z.coerce.number().min(0).default(0),
  total: z.coerce.number().positive('El valor total debe ser mayor a $0 para aprobar'),
  suggested_account_code: z.string().trim().min(4, 'Selecciona la subcuenta contable'),
});

export async function approveOrCorrectIngestionAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    ApproveOrCorrectIngestionSchema,
    rawInput,
    async ({ userId, input }) => {
      const db = await getServerDb();

      const { data: ing, error: ingErr } = await db
        .from('document_ingestions')
        .select('*')
        .eq('id', input.id)
        .single();

      if (ingErr || !ing) {
        throw new Error('Documento en ingesta no encontrado');
      }

      const supplier = await resolveOrCreateSupplier({
        name: input.supplier_name,
        documentNumber: input.supplier_nit
          ? input.supplier_dv
            ? `${input.supplier_nit}-${input.supplier_dv}`
            : input.supplier_nit
          : null,
      });

      const viewUrl = `/api/soportes/view?path=${encodeURIComponent(ing.storage_path)}`;
      let purchaseId = ing.purchase_id;

      if (!purchaseId) {
        const { data: createdPurchase, error: pErr } = await db
          .from('purchases')
          .insert({
            supplier_id: supplier.id,
            third_party_id: supplier.id,
            supplier_name: supplier.name,
            cost_center_id: input.cost_center_id || null,
            invoice_number: input.invoice_number || null,
            concept: input.concept,
            transaction_type: 'costo_gasto',
            amount: input.subtotal,
            tax_iva: input.tax_iva,
            withholding_tax: input.withholding_tax,
            total: input.total,
            status: 'pagado',
            payment_method: 'transferencia',
            paid_at: new Date().toISOString(),
            transaction_date: input.issue_date,
            invoice_url: viewUrl,
            support_sha256: ing.sha256,
            support_storage_path: ing.storage_path,
            created_by: userId,
          })
          .select('id')
          .single();

        if (pErr || !createdPurchase) {
          throw new Error('Error creando compra desde ingesta: ' + pErr?.message);
        }
        purchaseId = createdPurchase.id;
      } else {
        await db
          .from('purchases')
          .update({
            supplier_id: supplier.id,
            third_party_id: supplier.id,
            supplier_name: supplier.name,
            cost_center_id: input.cost_center_id || null,
            invoice_number: input.invoice_number || null,
            concept: input.concept,
            amount: input.subtotal,
            tax_iva: input.tax_iva,
            withholding_tax: input.withholding_tax,
            total: input.total,
            transaction_date: input.issue_date,
          })
          .eq('id', purchaseId);
      }

      const drafts = await ensureDraftEntriesForPurchase({ purchaseId });
      if (drafts?.ccEntry) {
        await recordClassificationCorrection({
          entryId: drafts.ccEntry.id,
          newAccountCode: input.suggested_account_code,
          newCostCenterId: input.cost_center_id || null,
          userId,
        });
      }

      const { data: updatedIng, error: updErr } = await db
        .from('document_ingestions')
        .update({
          status: 'aprobado',
          supplier_name: supplier.name,
          supplier_nit: input.supplier_nit || null,
          supplier_dv: input.supplier_dv || null,
          third_party_id: supplier.id,
          cost_center_id: input.cost_center_id || null,
          invoice_number: input.invoice_number || null,
          issue_date: input.issue_date,
          concept: input.concept,
          subtotal: input.subtotal,
          tax_iva: input.tax_iva,
          withholding_tax: input.withholding_tax,
          total: input.total,
          suggested_account_code: input.suggested_account_code,
          confidence: 1.0,
          warnings: [],
          purchase_id: purchaseId,
          cc_entry_id: drafts?.ccEntry?.id || ing.cc_entry_id,
          ce_entry_id: drafts?.ceEntry?.id || ing.ce_entry_id,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', ing.id)
        .select('*')
        .single();

      if (updErr) throw new Error(updErr.message);

      revalidatePath('/admin/ingesta');
      revalidatePath('/admin/compras');
      revalidatePath('/admin/contabilidad/borradores');
      return updatedIng;
    }
  );
}
