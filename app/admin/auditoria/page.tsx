import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function AuditoriaPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles ( full_name, role )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching audit logs:', error);
  }

  const formatDateTime = (iso: string) => format(new Date(iso), "dd MMM yyyy, HH:mm:ss", { locale: es });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-1">Registro de Auditoría</h1>
        <p className="text-[#7a99b5] text-sm">Monitorea la actividad del sistema para fines de seguridad y control.</p>
      </div>

      <DataTable
        data={logs || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Fecha y Hora',
            accessor: (row) => <span className="text-xs font-medium text-[#1a2d3d] whitespace-nowrap">{formatDateTime(row.created_at)}</span>,
          },
          {
            header: 'Usuario',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[#1a2d3d] font-medium">{row.profiles?.full_name || 'Sistema / Desconocido'}</div>
                <div className="text-xs text-[#7a99b5]">{row.profiles?.role}</div>
              </div>
            ),
          },
          {
            header: 'Acción',
            accessor: (row) => (
              <span className={`px-2 py-1 text-xs font-medium rounded-md uppercase
                ${row.action === 'INSERT' ? 'bg-emerald-100 text-emerald-800' : 
                  row.action === 'UPDATE' ? 'bg-amber-100 text-amber-800' : 
                  row.action === 'DELETE' ? 'bg-rose-100 text-rose-800' : 
                  'bg-[#e6f2fb] text-[#3b7dbf]'}`}
              >
                {row.action}
              </span>
            ),
          },
          {
            header: 'Entidad',
            accessor: (row) => <span className="text-sm font-mono text-[#3d5a73]">{row.entity_type}</span>,
          },
          {
            header: 'ID Entidad',
            accessor: (row) => <span className="text-xs text-[#7a99b5] truncate max-w-[120px] block" title={row.entity_id}>{row.entity_id || '-'}</span>,
          },
          {
            header: 'Detalle',
            accessor: (row) => (
              <details className="text-xs cursor-pointer group">
                <summary className="text-[#5ba3d9] font-medium">Ver JSON</summary>
                <div className="absolute z-10 mt-2 p-3 bg-white border border-[#a8c4d9]/50 rounded-lg shadow-xl max-w-sm max-h-60 overflow-auto hidden group-open:block">
                  {row.old_data && (
                    <div className="mb-2">
                      <div className="font-semibold text-rose-600 mb-1">Old:</div>
                      <pre className="text-[10px] bg-rose-50 p-2 rounded">{JSON.stringify(row.old_data, null, 2)}</pre>
                    </div>
                  )}
                  {row.new_data && (
                    <div>
                      <div className="font-semibold text-emerald-600 mb-1">New:</div>
                      <pre className="text-[10px] bg-emerald-50 p-2 rounded">{JSON.stringify(row.new_data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            ),
          },
        ]}
      />
    </div>
  );
}
