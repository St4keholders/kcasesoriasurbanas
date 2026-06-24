'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { SupplierAutocomplete } from '@/components/admin/ui/SupplierAutocomplete';
import { createPurchase } from '../actions';

const PurchaseSchema = z.object({
  supplier_name: z.string().min(1, 'Proveedor requerido'),
  cost_center_id: z.string().optional().or(z.literal('')),
  invoice_number: z.string().optional(),
  concept: z.string().min(1, 'Concepto requerido'),
  transaction_date: z.string().min(1, 'Fecha requerida'),
  transaction_type: z.enum(['costo_gasto', 'inversion', 'otro']).default('costo_gasto'),
  due_date: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(0, 'Monto no válido'),
  tax_iva: z.coerce.number().min(0).default(0),
  withholding_tax: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof PurchaseSchema>;

export function NuevaCompraForm({ costCenters, suppliers }: { costCenters: any[], suppliers: any[] }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: {
      amount: 0,
      tax_iva: 0,
      withholding_tax: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'costo_gasto'
    }
  });

  const watchAmount = watch('amount') || 0;
  const watchTax = watch('tax_iva') || 0;
  const watchWithholding = watch('withholding_tax') || 0;
  const total = Number(watchAmount) + Number(watchTax) - Number(watchWithholding);

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const payload = { ...data, total };
      const id = await createPurchase(payload);
      router.push(`/admin/compras/${id}`);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
      


      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">Información del Proveedor</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Proveedor (Buscar o escribir nombre)</label>
            <Controller
              control={control}
              name="supplier_id"
              render={({ field: { onChange, value } }) => (
                <SupplierAutocomplete 
                  value={value || ''} 
                  onChange={onChange} 
                  onInputChange={(text) => setValue('supplier_name', text)}
                  error={errors.supplier_id?.message}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">Detalle del Gasto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Concepto / Descripción <span className="text-rose-500">*</span></label>
            <input
              {...register('concept')}
              type="text"
              className="neu-input w-full"
            />
            {errors.concept && <p className="text-rose-500 text-xs">{errors.concept.message}</p>}
          </div>
          
          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Tipo de Transacción <span className="text-rose-500">*</span></label>
            <select
              {...register('transaction_type')}
              className="neu-input w-full"
            >
              <option value="costo_gasto">Costo / Gasto</option>
              <option value="inversion">Inversión</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Centro de Costo</label>
            <select
              {...register('cost_center_id')}
              className="neu-input w-full"
            >
              <option value="">-- Seleccionar --</option>
              {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Número de Factura (Ref)</label>
            <input
              {...register('invoice_number')}
              type="text"
              className="neu-input w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Fecha de Transacción <span className="text-rose-500">*</span></label>
            <input
              {...register('transaction_date')}
              type="date"
              className="neu-input w-full"
            />
            {errors.transaction_date && <p className="text-rose-500 text-xs">{errors.transaction_date.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Fecha de Vencimiento (Pago)</label>
            <input
              {...register('due_date')}
              type="date"
              className="neu-input w-full"
            />
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">Valores</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Subtotal (Monto) <span className="text-rose-500">*</span></label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              className="neu-input w-full"
            />
            {errors.amount && <p className="text-rose-500 text-xs">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">IVA</label>
            <input
              {...register('tax_iva')}
              type="number"
              step="0.01"
              className="neu-input w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Retención</label>
            <input
              {...register('withholding_tax')}
              type="number"
              step="0.01"
              className="neu-input w-full"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-[var(--dim)] mb-1">Total a Pagar</div>
              <div className="text-2xl font-bold text-[var(--sky-deep)]">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--shadow-dark)]">
          <label className="block text-sm font-medium text-[var(--fg-soft)] mb-1">Notas Adicionales</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="neu-input w-full resize-none"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="neu-btn-primary">
          {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  );
}
