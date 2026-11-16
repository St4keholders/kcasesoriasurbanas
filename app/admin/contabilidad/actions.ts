'use server';

import { executeMutation } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import {
  recordClassificationCorrection,
  postJournalEntriesBulk,
  voidOrReverseJournalEntry,
} from '@/lib/server/services/contabilidad';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateDraftEntrySchema = z.object({
  entryId: z.string().uuid('Comprobante inválido'),
  newAccountCode: z.string().trim().min(4, 'Selecciona una cuenta válida'),
  newCostCenterId: z.string().uuid().optional().or(z.literal('')).nullable(),
});

export async function updateDraftEntryAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    UpdateDraftEntrySchema,
    rawInput,
    async ({ userId, input }) => {
      const updated = await recordClassificationCorrection({
        entryId: input.entryId,
        newAccountCode: input.newAccountCode,
        newCostCenterId: input.newCostCenterId || null,
        userId,
      });
      revalidatePath('/admin/contabilidad/borradores');
      revalidatePath('/admin/contabilidad/libro-diario');
      return updated;
    }
  );
}

const BulkPostSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un comprobante en borrador'),
});

export async function postEntriesBulkAction(rawInput: unknown) {
  // Exclusivo para el rol 'admin' (el contador). Nunca invocado por la IA.
  return executeMutation(
    ['admin'],
    BulkPostSchema,
    rawInput,
    async ({ userId, input }) => {
      const posted = await postJournalEntriesBulk(input.entryIds, userId);
      revalidatePath('/admin/contabilidad/borradores');
      revalidatePath('/admin/contabilidad/libro-diario');
      return { count: posted.length, entries: posted };
    }
  );
}

const VoidEntrySchema = z.object({
  entryId: z.string().uuid(),
  reason: z.string().trim().min(3, 'Debes indicar el motivo de anulación'),
});

export async function voidJournalEntryAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    VoidEntrySchema,
    rawInput,
    async ({ userId, profile, input }) => {
      const db = await getServerDb();
      const { data: entry } = await db
        .from('journal_entries')
        .select('status')
        .eq('id', input.entryId)
        .single();

      if (entry?.status === 'contabilizado' && profile.role !== 'admin') {
        throw new Error('Solo el administrador / contador puede anular comprobantes contabilizados.');
      }

      const voided = await voidOrReverseJournalEntry({
        entryId: input.entryId,
        userId,
        userFullName: profile.full_name,
        reason: input.reason,
      });
      revalidatePath('/admin/contabilidad/borradores');
      revalidatePath('/admin/contabilidad/libro-diario');
      return voided;
    }
  );
}

const SaveSignaturesSchema = z.object({
  company_name: z.string().trim().min(2),
  company_nit: z.string().trim().min(5),
  reviso_name: z.string().trim().min(2, 'Nombre de quien revisa requerido'),
  aprobo_name: z.string().trim().min(2, 'Nombre de quien aprueba requerido'),
});

export async function saveSignaturesAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    SaveSignaturesSchema,
    rawInput,
    async ({ input }) => {
      const db = await getServerDb();
      const { data, error } = await db
        .from('accounting_settings')
        .upsert({
          id: 1,
          company_name: input.company_name,
          company_nit: input.company_nit,
          reviso_name: input.reviso_name,
          aprobo_name: input.aprobo_name,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      revalidatePath('/admin/contabilidad/parametrizacion');
      return data;
    }
  );
}

const SaveAccountSchema = z.object({
  code: z.string().trim().regex(/^\d{1,8}$/, 'El código PUC debe ser numérico'),
  name: z.string().trim().min(2, 'El nombre de la cuenta es obligatorio'),
  account_class: z.coerce.number().int().min(1).max(9),
  level: z.enum(['clase', 'grupo', 'cuenta', 'subcuenta']),
  nature: z.enum(['debito', 'credito']),
  is_postable: z.boolean().default(true),
  default_tax_concept: z
    .enum(['compras', 'servicios', 'honorarios', 'arrendamientos', 'ninguno'])
    .default('ninguno'),
  keywords_csv: z.string().optional().default(''),
});

export async function saveChartAccountAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    SaveAccountSchema,
    rawInput,
    async ({ input }) => {
      const db = await getServerDb();
      const keywords = (input.keywords_csv || '')
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const { data, error } = await db
        .from('chart_of_accounts')
        .upsert({
          code: input.code,
          name: input.name.toUpperCase(),
          account_class: input.account_class,
          level: input.level,
          nature: input.nature,
          is_postable: input.is_postable,
          default_tax_concept: input.default_tax_concept,
          keywords,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      revalidatePath('/admin/contabilidad/parametrizacion');
      return data;
    }
  );
}

const SavePostingRuleSchema = z.object({
  name: z.string().trim().min(3, 'El nombre de la regla es obligatorio'),
  priority: z.coerce.number().int().min(1).max(999).default(50),
  account_class: z.coerce.number().int().optional().nullable(),
  keyword_pattern: z.string().trim().min(2, 'Ingresa las palabras clave separadas por |'),
  debit_account_code: z.string().trim().min(4),
  credit_account_code: z.enum(['210505', '230505']).default('230505'),
  tax_concept: z
    .enum(['compras', 'servicios', 'honorarios', 'arrendamientos', 'ninguno'])
    .default('servicios'),
  is_deductible: z.boolean().default(true),
});

export async function savePostingRuleAction(rawInput: unknown) {
  return executeMutation(
    ['admin', 'tesoreria'],
    SavePostingRuleSchema,
    rawInput,
    async ({ input }) => {
      const db = await getServerDb();
      const { data, error } = await db
        .from('posting_rules')
        .insert({
          name: input.name,
          source: 'manual',
          priority: input.priority,
          account_class:
            input.account_class === 5 || input.account_class === 6 ? input.account_class : null,
          keyword_pattern: input.keyword_pattern.toLowerCase(),
          debit_account_code: input.debit_account_code,
          credit_account_code: input.credit_account_code,
          tax_concept: input.tax_concept,
          is_deductible: input.is_deductible,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      revalidatePath('/admin/contabilidad/parametrizacion');
      return data;
    }
  );
}
