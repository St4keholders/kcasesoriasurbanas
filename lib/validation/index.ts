import { z } from 'zod';
import { normalizeNitDigits, parseNitAndDv } from '@/lib/utils/nit';

export const RoleEnum = z.enum(['admin', 'tesoreria', 'asesor']);

export const PaymentMethodEnum = z.enum([
  'efectivo',
  'transferencia',
  'tarjeta',
  'nequi',
  'daviplata',
  'pse',
  'otro',
]);

export const TransactionTypeEnum = z.enum(['costo_gasto', 'inversion', 'otro']);

export const ThirdPartySchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre o razón social es obligatorio'),
    document_number: z.string().trim().optional().or(z.literal('')),
    dv: z.string().trim().optional().or(z.literal('')),
    email: z.string().trim().email('Correo electrónico inválido').optional().or(z.literal('')),
    phone: z.string().trim().optional().or(z.literal('')),
    address: z.string().trim().optional().or(z.literal('')),
    is_active: z.boolean().default(true),
    has_rut: z.boolean().optional().default(false),
    is_billing_obligated: z.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.document_number && val.document_number.trim() !== '') {
      const digits = normalizeNitDigits(val.document_number);
      if (!digits) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['document_number'],
          message: 'El NIT/documento debe contener dígitos válidos y no puede ser 000000000.',
        });
        return;
      }
      if (val.dv && val.dv.trim() !== '') {
        const parsed = parseNitAndDv(`${digits}-${val.dv.trim()}`);
        if (!parsed.isValidDv) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['dv'],
            message: `Dígito de verificación inválido para el NIT ${digits} (esperado: ${parsed.expectedDv ?? 'N/A'}).`,
          });
        }
      }
    }
  });

export const PurchaseInputSchema = z.object({
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  supplier_name: z.string().trim().min(1, 'El proveedor es obligatorio'),
  supplier_document: z.string().trim().optional().or(z.literal('')),
  cost_center_id: z.string().uuid('Selecciona un centro de costo válido').optional().or(z.literal('')),
  invoice_number: z.string().trim().optional().or(z.literal('')),
  concept: z.string().trim().min(1, 'El concepto es obligatorio'),
  amount: z.coerce.number().min(0, 'El subtotal no puede ser negativo'),
  tax_iva: z.coerce.number().min(0, 'El IVA no puede ser negativo').default(0),
  withholding_tax: z.coerce.number().min(0, 'La retención no puede ser negativa').default(0),
  total: z.coerce.number().min(0, 'El total no puede ser negativo'),
  transaction_date: z.string().trim().min(1, 'La fecha de factura es obligatoria'),
  transaction_type: TransactionTypeEnum.default('costo_gasto'),
  due_date: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  invoice_url: z.string().trim().optional().or(z.literal('')),
  support_sha256: z.string().trim().optional().or(z.literal('')),
  support_storage_path: z.string().trim().optional().or(z.literal('')),
});

export const PettyCashEntrySchema = z.object({
  box_id: z.string().uuid('Caja menor inválida'),
  entry_type: z.enum(['ingreso', 'egreso']).default('egreso'),
  entry_date: z.string().trim().min(1, 'La fecha es obligatoria'),
  supplier_name: z.string().trim().min(1, 'El proveedor o responsable es obligatorio'),
  supplier_document: z.string().trim().optional().or(z.literal('')),
  invoice_number: z.string().trim().optional().or(z.literal('')),
  concept: z.string().trim().min(1, 'El concepto es obligatorio'),
  tax_amount: z.coerce.number().min(0, 'El IVA no puede ser negativo').default(0),
  total_amount: z.coerce.number().positive('El valor total debe ser mayor a $0'),
  receipt_url: z.string().trim().optional().or(z.literal('')),
  support_sha256: z.string().trim().optional().or(z.literal('')),
  support_storage_path: z.string().trim().optional().or(z.literal('')),
});

export const VoidRecordSchema = z.object({
  id: z.string().uuid('ID de registro inválido'),
  reason: z.string().trim().min(3, 'Debes indicar un motivo de anulación de al menos 3 caracteres'),
});

export const SignedUploadRequestSchema = z.object({
  filename: z.string().trim().min(1, 'Nombre de archivo requerido'),
  contentType: z.string().trim().min(1, 'Tipo MIME requerido'),
  sha256: z.string().trim().regex(/^[a-f0-9]{64}$/i, 'Hash SHA-256 inválido'),
  module: z.enum(['compras', 'caja-menor', 'ventas', 'ingesta']).default('compras'),
});
