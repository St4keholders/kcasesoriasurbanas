'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Modal } from '@/components/admin/ui/Modal';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { EditIcon, PlusIcon } from 'lucide-react';
import { saveService } from './actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ServiceSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof ServiceSchema>;

export function ServiceClientPage({ services }: { services: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: { is_active: true, base_price: 0 }
  });

  const openNew = () => {
    reset({ name: '', description: '', base_price: 0, is_active: true });
    setEditingId(null);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (service: any) => {
    reset({
      name: service.name,
      description: service.description || '',
      base_price: service.base_price || 0,
      is_active: service.is_active
    });
    setEditingId(service.id);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await saveService(editingId, data);
      setIsModalOpen(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Tipos de Servicio</h1>
          <p className="text-[#7a99b5] text-sm">Catálogo de servicios ofrecidos.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Servicio
        </button>
      </div>

      <DataTable
        data={services}
        keyExtractor={(row) => row.id}
        columns={[
          { header: 'Nombre', accessor: (row) => <span className="font-medium text-[#1a2d3d]">{row.name}</span> },
          { header: 'Descripción', accessor: (row) => <span className="text-sm text-[#7a99b5] truncate max-w-xs block">{row.description}</span> },
          { header: 'Precio Base', accessor: (row) => <span className="text-sm">{formatCurrency(row.base_price || 0)}</span> },
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
        title={editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
      >
        <form id="serviceForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Nombre</label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
            />
            {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Descripción</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] resize-none"
            ></textarea>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#3d5a73]">Precio Base</label>
            <input
              {...register('base_price')}
              type="number"
              className="w-full px-3 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              className="w-4 h-4 text-[#5ba3d9] rounded"
            />
            <label className="text-sm font-medium text-[#3d5a73]">Servicio Activo</label>
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
