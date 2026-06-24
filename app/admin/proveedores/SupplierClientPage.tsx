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

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { NeuInput } from '@/components/admin/ui/NeuInput';
import { NeuButton } from '@/components/admin/ui/NeuButton';

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
    <>
      <AdminTopbar 
        eyebrow="— TESORERÍA"
        title={<span>Directorio de <em>proveedores</em></span>}
        subtitle="Gestiona la información de los proveedores para Tesorería."
        searchPlaceholder="Buscar proveedor por nombre o NIT..."
        action={
          <button onClick={openNew} className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo proveedor
          </button>
        }
      />

      <DataTable
        data={suppliers}
        keyExtractor={(row) => row.id}
        columns={[
          { header: 'Nombre', accessor: (row) => <span className="font-semibold text-[var(--fg)]">{row.name}</span> },
          { header: 'NIT/CC', accessor: (row) => <span className="text-sm text-[var(--dim)]">{row.document_number || '-'}</span> },
          { header: 'Teléfono', accessor: (row) => <span className="text-sm font-medium text-[var(--fg-soft)]">{row.phone || '-'}</span> },
          { header: 'Estado', accessor: (row) => <StatusBadge status={row.is_active ? 'activo' : 'inactivo'} /> },
          {
            header: 'Acciones',
            accessor: (row) => (
              <button
                onClick={() => openEdit(row)}
                className="btn btn-ghost"
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {errorMsg && <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">{errorMsg}</div>}
          
          <NeuInput
            label="Nombre / Razón Social"
            {...register('name')}
            error={errors.name?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <NeuInput
              label="NIT / Cédula"
              {...register('document_number')}
            />
            <NeuInput
              label="Teléfono"
              {...register('phone')}
            />
          </div>

          <NeuInput
            label="Correo Electrónico"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <NeuInput
            label="Dirección"
            {...register('address')}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              className="w-4 h-4 text-[var(--sky)] rounded"
            />
            <label className="text-sm font-semibold text-[var(--fg-soft)] uppercase tracking-wider">Proveedor Activo</label>
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
