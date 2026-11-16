'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SupplierAutocomplete } from '@/components/admin/ui/SupplierAutocomplete';
import { createPurchase } from '../actions';
import { uploadSupportDirect } from '@/lib/utils/client-storage';
import { UploadIcon } from 'lucide-react';
import { formatCOP } from '@/lib/utils/money';

const PurchaseFormSchema = z.object({
  supplier_id: z.string().optional(),
  supplier_name: z.string().min(1, 'El proveedor es obligatorio'),
  cost_center_id: z.string().optional(),
  invoice_number: z.string().optional(),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  transaction_date: z.string().min(1, 'La fecha es obligatoria'),
  transaction_type: z.enum(['costo_gasto', 'inversion', 'otro']),
  due_date: z.string().optional(),
  amount: z.number().min(0, 'Monto no válido'),
  tax_iva: z.number().min(0),
  withholding_tax: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof PurchaseFormSchema>;

interface CostCenterOption {
  id: string;
  name: string;
}

export function NuevaCompraForm({
  costCenters,
}: {
  costCenters: CostCenterOption[];
  suppliers?: unknown[];
}) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(PurchaseFormSchema),
    defaultValues: {
      supplier_id: '',
      supplier_name: '',
      cost_center_id: '',
      invoice_number: '',
      concept: '',
      amount: 0,
      tax_iva: 0,
      withholding_tax: 0,
      total: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'costo_gasto',
      due_date: '',
      notes: '',
    },
  });

  const watchAmount = watch('amount') || 0;
  const watchTax = watch('tax_iva') || 0;
  const watchWithholding = watch('withholding_tax') || 0;
  const total = Math.max(0, Number(watchAmount) + Number(watchTax) - Number(watchWithholding));

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      let invoice_url = '';
      let support_sha256 = '';
      let support_storage_path = '';

      if (selectedFile) {
        const uploaded = await uploadSupportDirect(selectedFile, 'compras');
        invoice_url = uploaded.viewUrl;
        support_sha256 = uploaded.sha256;
        support_storage_path = uploaded.storagePath;
      }

      const payload = {
        ...data,
        total,
        invoice_url,
        support_sha256,
        support_storage_path,
      };
      const id = await createPurchase(payload);
      router.push(`/admin/compras/${id}`);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Error al guardar la compra');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">
          Información del proveedor
        </h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Proveedor (buscar por NIT o nombre)
            </label>
            <Controller
              control={control}
              name="supplier_id"
              render={({ field: { onChange, value } }) => (
                <SupplierAutocomplete
                  value={value || ''}
                  onChange={onChange}
                  onInputChange={(text) => setValue('supplier_name', text)}
                  error={errors.supplier_name?.message}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">
          Detalle del gasto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Concepto / descripción <span className="text-rose-500">*</span>
            </label>
            <input {...register('concept')} type="text" className="input w-full" />
            {errors.concept && <p className="text-rose-500 text-xs">{errors.concept.message}</p>}
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Tipo de transacción <span className="text-rose-500">*</span>
            </label>
            <select {...register('transaction_type')} className="input w-full">
              <option value="costo_gasto">Costo / Gasto</option>
              <option value="inversion">Inversión</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Centro de costo
            </label>
            <select {...register('cost_center_id')} className="input w-full">
              <option value="">-- Seleccionar --</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Número de factura (Ref)
            </label>
            <input {...register('invoice_number')} type="text" className="input w-full" />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Fecha de transacción <span className="text-rose-500">*</span>
            </label>
            <input {...register('transaction_date')} type="date" className="input w-full" />
            {errors.transaction_date && (
              <p className="text-rose-500 text-xs">{errors.transaction_date.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Fecha de vencimiento (pago)
            </label>
            <input {...register('due_date')} type="date" className="input w-full" />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Soporte (PDF, imagen, XML o ZIP)
            </label>
            <label className="btn btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <UploadIcon className="w-4 h-4" />
              <span>{selectedFile ? selectedFile.name : 'Adjuntar soporte'}</span>
              <input
                type="file"
                accept="image/*,application/pdf,application/xml,text/xml,application/zip,.pdf,.xml,.zip"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">
          Valores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">
              Subtotal (monto) <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="1"
              className="input w-full"
            />
            {errors.amount && <p className="text-rose-500 text-xs">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">IVA</label>
            <input
              {...register('tax_iva', { valueAsNumber: true })}
              type="number"
              step="1"
              className="input w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Retención</label>
            <input
              {...register('withholding_tax', { valueAsNumber: true })}
              type="number"
              step="1"
              className="input w-full"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-[var(--dim)] mb-1">Total a pagar</div>
              <div className="text-2xl font-bold text-[var(--sky-deep)] font-mono">
                {formatCOP(total)}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--shadow-dark)]">
          <label className="block text-sm font-medium text-[var(--fg-soft)] mb-1">
            Notas adicionales
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            className="input w-full resize-none"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Guardando...' : 'Registrar gasto'}
        </button>
      </div>
    </form>
  );
}
