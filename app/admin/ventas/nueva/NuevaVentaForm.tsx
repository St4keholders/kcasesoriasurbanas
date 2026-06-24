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
  lead_id: z.string().optional().or(z.literal('')),
  lead_name: z.string().optional(),
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
      lead_name: '',
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}

      <div className="panel space-y-4">
        <h2 className="font-medium text-[var(--fg)] border-b border-[var(--shadow-dark)] pb-2">Datos Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Cliente (Buscar o escribir nombre) <span className="text-rose-500">*</span></label>
            <Controller
              control={control}
              name="lead_id"
              render={({ field: { onChange, value } }) => (
                <LeadAutocomplete 
                  value={value} 
                  onChange={onChange} 
                  onInputChange={(text) => setValue('lead_name', text)}
                  error={errors.lead_id?.message}
                  defaultLead={defaultLead}
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Estado Inicial</label>
            <select
              {...register('status')}
              className="neu-input w-full"
            >
              <option value="cotizacion">Cotización (Borrador)</option>
              <option value="pendiente_pago">Venta Confirmada (Pendiente Pago)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--shadow-dark)] pb-2">
          <h2 className="font-medium text-[var(--fg)]">Detalle de Servicios</h2>
          <button
            type="button"
            onClick={() => append({ service_type_id: '', description: '', quantity: 1, unit_price: 0 })}
            className="text-sm font-medium text-[var(--sky-deep)] hover:text-[var(--sky)] flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" /> Agregar Ítem
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end bg-[var(--admin-bg)] p-4 rounded-xl shadow-inner border border-[var(--shadow-dark)]">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <label className="block text-xs font-medium text-[var(--fg-soft)]">Catálogo</label>
                <select
                  {...register(`items.${index}.service_type_id`)}
                  onChange={(e) => {
                    register(`items.${index}.service_type_id`).onChange(e);
                    handleServiceChange(index, e.target.value);
                  }}
                  className="neu-input w-full"
                >
                  <option value="">Manual / Ninguno</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="col-span-12 md:col-span-4 space-y-1">
                <label className="block text-xs font-medium text-[var(--fg-soft)]">Descripción <span className="text-rose-500">*</span></label>
                <input
                  {...register(`items.${index}.description`)}
                  type="text"
                  className="neu-input w-full"
                />
                {errors.items?.[index]?.description && <p className="text-rose-500 text-xs">{errors.items[index]?.description?.message}</p>}
              </div>

              <div className="col-span-6 md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-[var(--fg-soft)]">Cant.</label>
                <input
                  {...register(`items.${index}.quantity`)}
                  type="number"
                  step="0.1"
                  className="neu-input w-full"
                />
              </div>

              <div className="col-span-6 md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-[var(--fg-soft)]">Precio Un.</label>
                <input
                  {...register(`items.${index}.unit_price`)}
                  type="number"
                  className="neu-input w-full"
                />
              </div>

              <div className="col-span-12 md:col-span-1 flex justify-end pb-1">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="p-2 text-rose-500 hover:text-rose-600 disabled:opacity-50 neu-icon"
                  style={{width: 40, height: 40}}
                >
                  <TrashIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
          {errors.items && <p className="text-rose-500 text-sm">{errors.items.root?.message}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-6 mt-6 border-t border-[var(--shadow-dark)] pt-6">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Notas Adicionales</label>
            <textarea
              {...register('notes')}
              rows={4}
              className="neu-input w-full resize-none"
              placeholder="Términos, condiciones, comentarios..."
            ></textarea>
          </div>

          <div className="w-full md:w-64 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--dim)]">Subtotal:</span>
              <span className="font-medium text-[var(--fg)]">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--dim)]">Impuestos (+$):</span>
              <input
                {...register('tax')}
                type="number"
                className="neu-input w-24 text-right py-1"
              />
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--dim)]">Descuento (-$):</span>
              <input
                {...register('discount')}
                type="number"
                className="neu-input w-24 text-right py-1"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--shadow-dark)]">
              <span className="font-medium text-[var(--fg)]">Total:</span>
              <span className="font-bold text-lg text-[var(--sky-deep)]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="neu-btn-primary">
          {isSubmitting ? 'Guardando...' : 'Guardar Documento'}
        </button>
      </div>
    </form>
  );
}
