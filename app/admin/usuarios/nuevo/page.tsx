'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

const UserSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'asesor', 'tesoreria'], { required_error: 'Debe seleccionar un rol' }),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type FormData = z.infer<typeof UserSchema>;

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      role: 'asesor',
    }
  });

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Error al crear el usuario');
      }
      
      router.push('/admin/usuarios');
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/usuarios" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Nuevo Usuario</h1>
          <p className="text-[#7a99b5] text-sm">Registra un nuevo miembro del equipo y asígnale un rol.</p>
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
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre Completo</label>
            <input
              {...register('fullName')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
              placeholder="Ej: Juan Pérez"
            />
            {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Correo Electrónico</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
              placeholder="correo@ejemplo.com"
            />
            {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Teléfono (opcional)</label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
              placeholder="+57 300..."
            />
            {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Rol</label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            >
              <option value="asesor">Asesor</option>
              <option value="tesoreria">Tesorería</option>
              <option value="admin">Administrador</option>
            </select>
            {errors.role && <p className="text-rose-500 text-xs mt-1">{errors.role.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Contraseña Inicial</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
            {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <LoadingButton type="submit" isLoading={isSubmitting}>
            Crear Usuario
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
