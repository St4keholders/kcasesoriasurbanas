'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { LeadAutocomplete } from '@/components/admin/ui/LeadAutocomplete';
import { createAppointment } from '../actions';

const AppointmentSchema = z.object({
  lead_id: z.string().optional().or(z.literal('')),
  lead_name: z.string().optional(),
  service_type_id: z.string().optional().or(z.literal('')),
  assigned_advisor_id: z.string().min(1, 'Debe asignar un asesor'),
  scheduled_at: z.string().min(1, 'Fecha y hora requerida'),
  duration_minutes: z.coerce.number().min(15).default(60),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof AppointmentSchema>;

export function NuevaCitaForm({ services, advisors, defaultLeadId, defaultLead }: { services: any[], advisors: any[], defaultLeadId?: string, defaultLead?: any }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(AppointmentSchema),
    defaultValues: {
      lead_id: defaultLeadId || '',
      lead_name: '',
      duration_minutes: 60,
    }
  });

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const id = await createAppointment(data);
      router.push(`/admin/citas/${id}`);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel max-w-4xl space-y-6">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1 md:col-span-2">
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
          <label className="block text-sm font-medium text-[var(--fg-soft)]">Servicio</label>
          <select
            {...register('service_type_id')}
            className="neu-input w-full"
          >
            <option value="">-- Seleccionar Servicio (Opcional) --</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--fg-soft)]">Asesor Asignado <span className="text-rose-500">*</span></label>
          <select
            {...register('assigned_advisor_id')}
            className="neu-input w-full"
          >
            <option value="">-- Seleccionar Asesor --</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
          {errors.assigned_advisor_id && <p className="text-rose-500 text-xs mt-1">{errors.assigned_advisor_id.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--fg-soft)]">Fecha y Hora <span className="text-rose-500">*</span></label>
          <input
            {...register('scheduled_at')}
            type="datetime-local"
            className="neu-input w-full"
          />
          {errors.scheduled_at && <p className="text-rose-500 text-xs mt-1">{errors.scheduled_at.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--fg-soft)]">Duración (minutos)</label>
          <input
            {...register('duration_minutes')}
            type="number"
            min="15"
            step="15"
            className="neu-input w-full"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="block text-sm font-medium text-[var(--fg-soft)]">Notas para la cita</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="neu-input w-full resize-none"
          ></textarea>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={isSubmitting} className="neu-btn-primary">
          {isSubmitting ? 'Guardando...' : 'Agendar Cita'}
        </button>
      </div>
    </form>
  );
}
