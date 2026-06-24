import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EditIcon, BanIcon, CheckCircleIcon } from 'lucide-react';
import { deactivateUser, activateUser } from './actions';

import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default async function UsuariosPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
  }

  const users = profiles || [];

  return (
    <>
      <AdminTopbar 
        eyebrow="— SISTEMA"
        title={<span>Directorio de <em>usuarios</em></span>}
        subtitle="Gestiona el acceso y roles de los miembros del equipo."
        searchPlaceholder="Buscar por nombre o correo..."
        action={
          <Link href="/admin/usuarios/nuevo" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo usuario
          </Link>
        }
      />

      <DataTable
        data={users}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Nombre Completo',
            accessor: (row) => (
              <div className="flex items-center gap-3">
                <div className="avatar">
                  {(row.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-[var(--fg)]">
                    {row.full_name || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-[var(--dim)] font-normal">{row.email}</div>
                </div>
              </div>
            ),
          },
          {
            header: 'Rol',
            accessor: (row) => <span className="uppercase text-xs font-semibold tracking-wider text-[var(--fg-soft)]">{row.role}</span>,
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
                  href={`/admin/usuarios/${row.id}`}
                  className="btn btn-ghost p-2"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </Link>
                {row.is_active ? (
                  <form action={deactivateUser.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="btn btn-ghost p-2 text-rose-500 hover:text-rose-600"
                      title="Desactivar"
                    >
                      <BanIcon className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form action={activateUser.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="btn btn-ghost p-2 text-emerald-500 hover:text-emerald-600"
                      title="Activar"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
