'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { createPurchase } from '../actions';

const PurchaseSchema = z.object({
  supplier_id: z.string().optional().or(z.literal('')),
  supplier_name: z.string().optional(),
  cost_center_id: z.string().min(1, 'Centro de costo requerido'),
  invoice_number: z.string().optional(),
  description: z.string().min(3, 'Descripción requerida'),
  invoice_date: z.string().min(1, 'Fecha de factura requerida'),
  due_date: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(0, 'Monto no válido'),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof PurchaseSchema>;

export function NuevaCompraForm({ costCenters, suppliers }: { costCenters: any[], suppliers: any[] }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: {
      amount: 0,
      tax: 0,
      invoice_date: new Date().toISOString().split('T')[0]
    }
  });

  const watchAmount = watch('amount') || 0;
  const watchTax = watch('tax') || 0;
  const total = Number(watchAmount) + Number(watchTax);

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const id = await createPurchase(data);
      router.push(`/admin/compras/${id}`);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
      
      {costCenters.length === 0 && (
        <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium">
          ⚠️ Atención: No tienes Centros de Costo creados. Para registrar una compra es obligatorio asignar un centro de costo. Por favor, ve a "Catálogos &gt; Centros de Costo" y crea uno antes de continuar.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
        <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Información del Proveedor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Proveedor (Catálogo)</label>
            <select
              {...register('supplier_id')}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            >
              <option value="">-- Proveedor Ocasional --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre del Proveedor (Si es ocasional)</label>
            <input
              {...register('supplier_name')}
              type="text"
              placeholder="Ej: Ferretería Central"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
        <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Detalle del Gasto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[#3d5a73]">Descripción de la Compra/Gasto <span className="text-rose-500">*</span></label>
            <input
              {...register('description')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
            {errors.description && <p className="text-rose-500 text-xs">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Centro de Costo <span className="text-rose-500">*</span></label>
            <select
              {...register('cost_center_id')}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </select>
            {errors.cost_center_id && <p className="text-rose-500 text-xs">{errors.cost_center_id.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Número de Factura (Ref)</label>
            <input
              {...register('invoice_number')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Fecha de Factura <span className="text-rose-500">*</span></label>
            <input
              {...register('invoice_date')}
              type="date"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
            {errors.invoice_date && <p className="text-rose-500 text-xs">{errors.invoice_date.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Fecha de Vencimiento (Pago)</label>
            <input
              {...register('due_date')}
              type="date"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
        <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Valores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Subtotal (Monto) <span className="text-rose-500">*</span></label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
            {errors.amount && <p className="text-rose-500 text-xs">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Impuestos</label>
            <input
              {...register('tax')}
              type="number"
              step="0.01"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-[#7a99b5] mb-1">Total a Pagar</div>
              <div className="text-2xl font-bold text-[#5ba3d9]">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#a8c4d9]/40">
          <label className="block text-sm font-medium text-[#3d5a73] mb-1">Notas Adicionales</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end">
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={costCenters.length === 0}>
          Registrar Gasto
        </LoadingButton>
      </div>
    </form>
  );
}
