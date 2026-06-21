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
  lead_id: z.string().min(1, 'Debe seleccionar un cliente'),
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

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(AppointmentSchema),
    defaultValues: {
      lead_id: defaultLeadId || '',
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
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
      {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1 md:col-span-2">
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
          <label className="block text-sm font-medium text-[#3d5a73]">Servicio</label>
          <select
            {...register('service_type_id')}
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] transition-colors text-sm"
          >
            <option value="">-- Seleccionar Servicio (Opcional) --</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#3d5a73]">Asesor Asignado <span className="text-rose-500">*</span></label>
          <select
            {...register('assigned_advisor_id')}
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] transition-colors text-sm"
          >
            <option value="">-- Seleccionar Asesor --</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
          {errors.assigned_advisor_id && <p className="text-rose-500 text-xs mt-1">{errors.assigned_advisor_id.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#3d5a73]">Fecha y Hora <span className="text-rose-500">*</span></label>
          <input
            {...register('scheduled_at')}
            type="datetime-local"
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] transition-colors text-sm"
          />
          {errors.scheduled_at && <p className="text-rose-500 text-xs mt-1">{errors.scheduled_at.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#3d5a73]">Duración (minutos)</label>
          <input
            {...register('duration_minutes')}
            type="number"
            min="15"
            step="15"
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] transition-colors text-sm"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="block text-sm font-medium text-[#3d5a73]">Notas para la cita</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] transition-colors text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <LoadingButton type="submit" isLoading={isSubmitting}>
          Agendar Cita
        </LoadingButton>
      </div>
    </form>
  );
}
