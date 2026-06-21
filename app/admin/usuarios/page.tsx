import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EditIcon, BanIcon, CheckCircleIcon } from 'lucide-react';
import { deactivateUser, activateUser } from './actions';

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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-1">Usuarios</h1>
          <p className="text-[#7a99b5] text-sm">Gestiona el acceso y roles de los miembros del equipo.</p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Usuario
        </Link>
      </div>

      <DataTable
        data={users}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Nombre Completo',
            accessor: (row) => (
              <div className="font-medium text-[#1a2d3d]">
                {row.full_name || 'Sin nombre'}
                <div className="text-xs text-[#7a99b5] font-normal">{row.email}</div>
              </div>
            ),
          },
          {
            header: 'Rol',
            accessor: (row) => <span className="uppercase text-xs font-semibold tracking-wider text-[#3d5a73]">{row.role}</span>,
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
                  className="p-1.5 text-[#5ba3d9] hover:bg-[#e6f2fb] rounded-md transition-colors"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </Link>
                {row.is_active ? (
                  <form action={deactivateUser.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      title="Desactivar"
                    >
                      <BanIcon className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form action={activateUser.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
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
    </div>
  );
}
