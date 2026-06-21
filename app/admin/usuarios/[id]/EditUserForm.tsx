'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { updateUserData, updateUserPassword } from '../actions';
import { useRouter } from 'next/navigation';

const EditUserSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'asesor', 'tesoreria'], { required_error: 'Debe seleccionar un rol' }),
  is_active: z.boolean(),
});

type EditFormData = z.infer<typeof EditUserSchema>;

export function EditUserForm({ user, id }: { user: any, id: string }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [pwdErrorMsg, setPwdErrorMsg] = useState('');
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(EditUserSchema),
    defaultValues: {
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'asesor',
      is_active: user.is_active ?? true,
    }
  });

  const onSubmit = async (data: EditFormData) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateUserData(id, data);
      setSuccessMsg('Datos actualizados correctamente.');
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErrorMsg('');
    setPwdSuccessMsg('');
    if (newPassword.length < 8) {
      setPwdErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    
    setIsUpdatingPwd(true);
    try {
      await updateUserPassword(id, newPassword);
      setPwdSuccessMsg('Contraseña actualizada correctamente.');
      setNewPassword('');
    } catch (error: any) {
      setPwdErrorMsg(error.message);
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Edit Data Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
        <h2 className="text-lg font-medium text-[#1a2d3d] mb-4 border-b border-[#a8c4d9]/40 pb-2">Datos del Usuario</h2>
        
        {errorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
        {successMsg && <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">{successMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-[#3d5a73]">Correo Electrónico (No modificable)</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre Completo</label>
            <input
              {...register('full_name')}
              type="text"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
            {errors.full_name && <p className="text-rose-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Teléfono (opcional)</label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
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

          <div className="space-y-1 flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('is_active')}
                type="checkbox"
                className="w-5 h-5 text-[#5ba3d9] border-[#a8c4d9] rounded focus:ring-[#5ba3d9]"
              />
              <span className="text-sm font-medium text-[#3d5a73]">Usuario Activo</span>
            </label>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <LoadingButton type="submit" isLoading={isSubmitting}>
            Guardar Cambios
          </LoadingButton>
        </div>
      </form>

      {/* Reset Password Form */}
      <form onSubmit={onResetPassword} className="bg-white p-8 rounded-xl shadow-sm border border-[#a8c4d9]/40 space-y-6">
        <h2 className="text-lg font-medium text-[#1a2d3d] mb-4 border-b border-[#a8c4d9]/40 pb-2">Resetear Contraseña</h2>
        
        {pwdErrorMsg && <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{pwdErrorMsg}</div>}
        {pwdSuccessMsg && <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">{pwdSuccessMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Nueva Contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
              placeholder="Min. 8 caracteres"
            />
          </div>
          <div>
            <LoadingButton type="submit" isLoading={isUpdatingPwd} className="w-full md:w-auto">
              Cambiar Contraseña
            </LoadingButton>
          </div>
        </div>
      </form>
    </div>
  );
}
