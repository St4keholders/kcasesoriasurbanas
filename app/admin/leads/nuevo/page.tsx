'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { createLead } from '../actions';

const LeadSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  document_number: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().min(5, 'Teléfono requerido'),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof LeadSchema>;

export default function NuevoLeadPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      source: 'WhatsApp',
    }
  });

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const newId = await createLead(data);
      router.push(`/admin/leads/${newId}`);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/leads" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Nuevo Cliente / Lead</h1>
          <p className="text-[#7a99b5] text-sm">Registra un nuevo prospecto para seguimiento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre Completo <span className="text-rose-500">*</span></label>
            <input
              {...register('full_name')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
            {errors.full_name && <p className="text-rose-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Documento (CC/NIT)</label>
            <input
              {...register('document_number')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Teléfono <span className="text-rose-500">*</span></label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
            {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Correo Electrónico</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
            {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Fuente</label>
            <select
              {...register('source')}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
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
            <label className="block text-sm font-medium text-[#3d5a73]">Notas Adicionales</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors resize-none"
            ></textarea>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <LoadingButton type="submit" isLoading={isSubmitting}>
            Guardar Cliente
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
