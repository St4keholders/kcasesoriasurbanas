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
    <div className="main">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/leads" className="neu-icon" style={{ width: 40, height: 40 }}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[var(--fg)]">Nuevo Cliente / Lead</h1>
          <p className="text-[var(--dim)] text-sm mt-1">Registra un nuevo prospecto para seguimiento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="panel max-w-4xl space-y-6">
        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Nombre Completo <span className="text-rose-500">*</span></label>
            <input
              {...register('full_name')}
              type="text"
              className="neu-input w-full"
              placeholder="Ej. Juan Pérez"
            />
            {errors.full_name && <p className="text-rose-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Documento (CC/NIT)</label>
            <input
              {...register('document_number')}
              type="text"
              className="neu-input w-full"
              placeholder="Ej. 1000000000"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Teléfono <span className="text-rose-500">*</span></label>
            <input
              {...register('phone')}
              type="tel"
              className="neu-input w-full"
              placeholder="Ej. 300 000 0000"
            />
            {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Correo Electrónico</label>
            <input
              {...register('email')}
              type="email"
              className="neu-input w-full"
              placeholder="ejemplo@correo.com"
            />
            {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Fuente</label>
            <select
              {...register('source')}
              className="neu-input w-full"
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
            <label className="block text-sm font-medium text-[var(--fg-soft)]">Notas Adicionales</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="neu-input w-full resize-none"
              placeholder="Comentarios, requerimientos, historial breve..."
            ></textarea>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={isSubmitting} className="neu-btn-primary">
            {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
