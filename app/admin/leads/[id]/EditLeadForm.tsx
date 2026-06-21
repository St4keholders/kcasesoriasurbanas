'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { updateLead } from '../actions';
import { useRouter } from 'next/navigation';

const LeadSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  document_number: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().min(5, 'Teléfono requerido'),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof LeadSchema>;

export function EditLeadForm({ lead, id }: { lead: any, id: string }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      full_name: lead.full_name || '',
      document_number: lead.document_number || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'WhatsApp',
      notes: lead.notes || '',
    }
  });

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateLead(id, data);
      setSuccessMsg('Datos actualizados correctamente.');
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-5">
      <h2 className="text-lg font-medium text-[#1a2d3d] mb-2 border-b border-[#a8c4d9]/40 pb-2">Datos del Cliente</h2>
      
      {errorMsg && <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
      {successMsg && <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">{successMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#3d5a73]">Nombre Completo</label>
          <input
            {...register('full_name')}
            type="text"
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#3d5a73]">Documento (CC/NIT)</label>
          <input
            {...register('document_number')}
            type="text"
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#3d5a73]">Teléfono</label>
          <input
            {...register('phone')}
            type="tel"
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#3d5a73]">Correo Electrónico</label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#3d5a73]">Fuente</label>
          <select
            {...register('source')}
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm"
          >
            <option value="WhatsApp">WhatsApp</option>
            <option value="Web">Sitio Web</option>
            <option value="Referido">Referido</option>
            <option value="Instagram">Instagram</option>
            <option value="Llamada">Llamada</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-[#3d5a73]">Notas</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <LoadingButton type="submit" isLoading={isSubmitting}>
          Guardar Cambios
        </LoadingButton>
      </div>
    </form>
  );
}
