'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Modal } from '@/components/admin/ui/Modal';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { EditIcon, PlusIcon } from 'lucide-react';
import { saveSupplier } from './actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const SupplierSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  document_number: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof SupplierSchema>;

export function SupplierClientPage({ suppliers }: { suppliers: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: { is_active: true }
  });

  const openNew = () => {
    reset({ name: '', document_number: '', email: '', phone: '', address: '', is_active: true });
    setEditingId(null);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (s: any) => {
    reset({
      name: s.name,
      document_number: s.document_number || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      is_active: s.is_active
    });
    setEditingId(s.id);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await saveSupplier(editingId, data);
      setIsModalOpen(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Directorio de Proveedores</h1>
          <p className="text-[#7a99b5] text-sm">Gestiona la información de los proveedores para Tesorería.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      <DataTable
        data={suppliers}
        keyExtractor={(row) => row.id}
        columns={[
          { header: 'Nombre', accessor: (row) => <span className="font-medium text-[#1a2d3d]">{row.name}</span> },
          { header: 'NIT/CC', accessor: (row) => <span className="text-sm text-[#7a99b5]">{row.document_number || '-'}</span> },
          { header: 'Teléfono', accessor: (row) => <span className="text-sm text-[#7a99b5]">{row.phone || '-'}</span> },
          { header: 'Estado', accessor: (row) => <StatusBadge status={row.is_active ? 'activo' : 'inactivo'} /> },
          {
            header: 'Acciones',
            accessor: (row) => (
              <button
                onClick={() => openEdit(row)}
                className="p-1.5 text-[#5ba3d9] hover:bg-[#e6f2fb] rounded-md transition-colors"
                title="Editar"
              >
                <EditIcon className="w-4 h-4" />
              </button>
            ),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre / Razón Social</label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
            />
            {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#3d5a73]">NIT / Cédula</label>
              <input
                {...register('document_number')}
                type="text"
                className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#3d5a73]">Teléfono</label>
              <input
                {...register('phone')}
                type="text"
                className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Correo Electrónico</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
            />
            {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Dirección</label>
            <input
              {...register('address')}
              type="text"
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              className="w-4 h-4 text-[#5ba3d9] rounded"
            />
            <label className="text-sm font-medium text-[#3d5a73]">Proveedor Activo</label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-white text-[#3d5a73] border border-[#a8c4d9]/50 rounded-lg font-medium hover:bg-[#f7fbff]"
            >
              Cancelar
            </button>
            <LoadingButton type="submit" isLoading={isSubmitting}>
              Guardar
            </LoadingButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
