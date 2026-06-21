'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { LeadAutocomplete } from '@/components/admin/ui/LeadAutocomplete';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { createSale } from '../actions';

const SaleItemSchema = z.object({
  service_type_id: z.string().optional().or(z.literal('')),
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.coerce.number().min(0.1, 'Cantidad > 0'),
  unit_price: z.coerce.number().min(0, 'Precio >= 0'),
});

const SaleSchema = z.object({
  lead_id: z.string().min(1, 'Debe seleccionar un cliente'),
  appointment_id: z.string().optional().or(z.literal('')),
  status: z.enum(['cotizacion', 'pendiente_pago', 'pagada']),
  items: z.array(SaleItemSchema).min(1, 'Agregue al menos un servicio'),
  tax: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof SaleSchema>;

export function NuevaVentaForm({ services, defaultLeadId, defaultLead }: { services: any[], defaultLeadId?: string, defaultLead?: any }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(SaleSchema),
    defaultValues: {
      lead_id: defaultLeadId || '',
      status: 'cotizacion',
      tax: 0,
      discount: 0,
      items: [{ service_type_id: '', description: '', quantity: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items');
  const watchTax = watch('tax');
  const watchDiscount = watch('discount');

  const subtotal = watchItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
  const total = subtotal + Number(watchTax) - Number(watchDiscount);

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const id = await createSale(data);
      router.push(`/admin/ventas/${id}`);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    if (!serviceId) return;
    const s = services.find(x => x.id === serviceId);
    if (s) {
      setValue(`items.${index}.description`, s.name);
      setValue(`items.${index}.unit_price`, s.base_price || 0);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
        <h2 className="font-medium text-[#1a2d3d] border-b border-[#a8c4d9]/40 pb-2">Datos Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Cliente <span className="text-rose-500">*</span></label>
            <Controller
              control={control}
              name="lead_id"
              render={({ field: { onChange, value } }) => (
                <LeadAutocomplete 
                  value={value} 
                  onChange={onChange} 
                  error={errors.lead_id?.message}
                  defaultLead={defaultLead}
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Estado Inicial</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
            >
              <option value="cotizacion">Cotización (Borrador)</option>
              <option value="pendiente_pago">Venta Confirmada (Pendiente Pago)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-4">
        <div className="flex justify-between items-center border-b border-[#a8c4d9]/40 pb-2">
          <h2 className="font-medium text-[#1a2d3d]">Detalle de Servicios</h2>
          <button
            type="button"
            onClick={() => append({ service_type_id: '', description: '', quantity: 1, unit_price: 0 })}
            className="text-sm font-medium text-[#5ba3d9] hover:text-[#3b7dbf] flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" /> Agregar Ítem
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end bg-[#f7fbff] p-4 rounded-lg border border-[#a8c4d9]/30">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <label className="block text-xs font-medium text-[#3d5a73]">Catálogo</label>
                <select
                  {...register(`items.${index}.service_type_id`)}
                  onChange={(e) => {
                    register(`items.${index}.service_type_id`).onChange(e);
                    handleServiceChange(index, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                >
                  <option value="">Manual / Ninguno</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="col-span-12 md:col-span-4 space-y-1">
                <label className="block text-xs font-medium text-[#3d5a73]">Descripción <span className="text-rose-500">*</span></label>
                <input
                  {...register(`items.${index}.description`)}
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                />
                {errors.items?.[index]?.description && <p className="text-rose-500 text-xs">{errors.items[index]?.description?.message}</p>}
              </div>

              <div className="col-span-6 md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-[#3d5a73]">Cant.</label>
                <input
                  {...register(`items.${index}.quantity`)}
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                />
              </div>

              <div className="col-span-6 md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-[#3d5a73]">Precio Un.</label>
                <input
                  {...register(`items.${index}.unit_price`)}
                  type="number"
                  className="w-full px-3 py-2 bg-white border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
                />
              </div>

              <div className="col-span-12 md:col-span-1 flex justify-end pb-1">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {errors.items && <p className="text-rose-500 text-sm">{errors.items.root?.message}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-6 mt-6 border-t border-[#a8c4d9]/40 pt-6">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Notas Adicionales</label>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm resize-none"
              placeholder="Términos, condiciones, comentarios..."
            ></textarea>
          </div>

          <div className="w-full md:w-64 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#7a99b5]">Subtotal:</span>
              <span className="font-medium text-[#1a2d3d]">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#7a99b5]">Impuestos (+$):</span>
              <input
                {...register('tax')}
                type="number"
                className="w-24 px-2 py-1 text-right bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
              />
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#7a99b5]">Descuento (-$):</span>
              <input
                {...register('discount')}
                type="number"
                className="w-24 px-2 py-1 text-right bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#a8c4d9]/40">
              <span className="font-medium text-[#1a2d3d]">Total:</span>
              <span className="font-bold text-lg text-[#5ba3d9]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <LoadingButton type="submit" isLoading={isSubmitting}>
          Guardar Documento
        </LoadingButton>
      </div>
    </form>
  );
}
