'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Modal } from '@/components/admin/ui/Modal';
import { EditIcon, PlusIcon, EyeIcon } from 'lucide-react';
import Link from 'next/link';
import { saveSupplier } from './actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { NeuInput } from '@/components/admin/ui/NeuInput';
import { calculateDianDv, normalizeNitDigits } from '@/lib/utils/nit';
import { formatCOP } from '@/lib/utils/money';

const SupplierFormSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  document_number: z.string().optional(),
  dv: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof SupplierFormSchema>;

export interface SupplierListItem {
  id: string;
  name: string;
  document_number: string | null;
  nit_normalized?: string | null;
  dv?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  total_paid_2026?: number;
  pending_count?: number;
}

export function SupplierClientPage({ suppliers }: { suppliers: SupplierListItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(SupplierFormSchema),
    defaultValues: {
      name: '',
      document_number: '',
      dv: '',
      email: '',
      phone: '',
      address: '',
      is_active: true,
    },
  });

  const watchedNit = watch('document_number');
  const computedDv = calculateDianDv(watchedNit);

  const openNew = () => {
    reset({
      name: '',
      document_number: '',
      dv: '',
      email: '',
      phone: '',
      address: '',
      is_active: true,
    });
    setEditingId(null);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (s: SupplierListItem) => {
    const cleanDigits = normalizeNitDigits(s.nit_normalized || s.document_number);
    reset({
      name: s.name,
      document_number: cleanDigits,
      dv: s.dv || (cleanDigits ? String(calculateDianDv(cleanDigits) ?? '') : ''),
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      is_active: s.is_active,
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
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Error al guardar proveedor');
    }
  };

  return (
    <>
      <AdminTopbar
        eyebrow="— TESORERÍA Y CONTABILIDAD"
        title={
          <span>
            Directorio de <em>proveedores y terceros</em>
          </span>
        }
        subtitle="Consulta el consolidado de pagos 2026, retenciones, soportes y pendientes por tercero."
        searchPlaceholder="Buscar proveedor por NIT o nombre..."
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
          {
            header: 'Nombre / Razón social',
            sortAccessor: (row) => row.name,
            accessor: (row) => (
              <Link
                href={`/admin/proveedores/${row.id}`}
                className="font-semibold text-[var(--fg)] hover:text-[var(--sky-deep)] hover:underline"
              >
                {row.name}
              </Link>
            ),
          },
          {
            header: 'NIT / Documento',
            sortAccessor: (row) => row.document_number || '',
            accessor: (row) => (
              <span className="text-sm font-mono text-[var(--dim)]">
                {row.document_number || 'Sin NIT'}
              </span>
            ),
          },
          {
            header: 'Total pagado 2026',
            sortAccessor: (row) => row.total_paid_2026 || 0,
            accessor: (row) => (
              <span className="text-sm font-semibold font-mono text-[var(--fg)]">
                {formatCOP(row.total_paid_2026 || 0)}
              </span>
            ),
          },
          {
            header: 'Pendientes',
            sortAccessor: (row) => row.pending_count || 0,
            accessor: (row) =>
              (row.pending_count || 0) > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                  {row.pending_count} pendiente{row.pending_count === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/12 text-emerald-800">
                  Al día
                </span>
              ),
          },
          {
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.is_active ? 'activo' : 'inactivo'} />,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/proveedores/${row.id}`}
                  className="btn btn-ghost text-xs px-2 py-1 flex items-center gap-1"
                  title="Ver ficha 2026"
                >
                  <EyeIcon className="w-4 h-4" /> Ficha
                </Link>
                <button
                  onClick={() => openEdit(row)}
                  className="btn btn-ghost text-xs px-2 py-1"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <NeuInput
            label="Nombre / Razón social"
            {...register('name')}
            error={errors.name?.message}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <NeuInput
                label="NIT / Cédula (solo dígitos)"
                {...register('document_number', {
                  onBlur: (e) => {
                    const clean = normalizeNitDigits(e.target.value);
                    setValue('document_number', clean);
                    const dv = calculateDianDv(clean);
                    if (dv !== null) setValue('dv', String(dv));
                  },
                })}
              />
            </div>
            <div>
              <NeuInput
                label={`DV ${computedDv !== null ? `(DIAN: ${computedDv})` : ''}`}
                maxLength={1}
                {...register('dv')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NeuInput label="Teléfono" {...register('phone')} />
            <NeuInput
              label="Correo electrónico"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          <NeuInput label="Dirección" {...register('address')} />

          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              className="w-4 h-4 text-[var(--sky)] rounded"
            />
            <label className="text-sm font-semibold text-[var(--fg-soft)] uppercase tracking-wider">
              Proveedor activo
            </label>
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
