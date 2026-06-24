'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Modal } from '@/components/admin/ui/Modal';
import { LoadingButton } from '@/components/admin/ui/LoadingButton';
import { EditIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { saveCostCenter, deleteCostCenter } from './actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { NeuInput, NeuTextarea } from '@/components/admin/ui/NeuInput';
import { NeuButton } from '@/components/admin/ui/NeuButton';

const CostCenterSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof CostCenterSchema>;

export function CostCenterClientPage({ costCenters }: { costCenters: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(CostCenterSchema) as any,
    defaultValues: { is_active: true }
  });

  const openNew = () => {
    reset({ name: '', description: '', is_active: true });
    setEditingId(null);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (cc: any) => {
    reset({
      name: cc.name,
      description: cc.description || '',
      is_active: cc.is_active
    });
    setEditingId(cc.id);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await saveCostCenter(editingId, data);
      setIsModalOpen(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el centro de costo "${name}"?`)) return;
    try {
      await deleteCostCenter(id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="main">
      <AdminTopbar 
        title="Centros de Costo" 
        subtitle="Catálogo de categorías para registro de compras y gastos."
        action={
          <button onClick={openNew} className="neu-btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo Centro de Costo
          </button>
        }
      />

      <DataTable
        data={costCenters}
        keyExtractor={(row) => row.id}
        columns={[
          { header: 'Nombre', accessor: (row) => <span className="font-semibold text-[var(--fg)]">{row.name}</span> },
          { header: 'Descripción', accessor: (row) => <span className="text-sm text-[var(--dim)]">{row.description}</span> },
          { header: 'Estado', accessor: (row) => <StatusBadge status={row.is_active ? 'activo' : 'inactivo'} /> },
          {
            header: 'Acciones',
            accessor: (row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(row)}
                  className="neu-btn p-2"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(row.id, row.name)}
                  className="neu-btn p-2 text-rose-500 hover:text-rose-600"
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {errorMsg && <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
          
          <NeuInput
            label="Nombre"
            {...register('name')}
            error={errors.name?.message}
          />

          <NeuTextarea
            label="Descripción"
            {...register('description')}
            rows={2}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              className="w-4 h-4 text-[#5ba3d9] rounded"
            />
            <label className="text-sm font-semibold text-[var(--fg-soft)] uppercase tracking-wider">Centro de Costo Activo</label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <NeuButton
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </NeuButton>
            <NeuButton type="submit" variant="primary" isLoading={isSubmitting}>
              Guardar
            </NeuButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
