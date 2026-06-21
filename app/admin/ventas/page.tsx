import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function VentasPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      *,
      leads ( full_name, document_number ),
      profiles!sales_closed_by_fkey ( full_name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => format(new Date(iso), "dd MMM yyyy", { locale: es });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-1">Ventas y Cotizaciones</h1>
          <p className="text-[#7a99b5] text-sm">Gestiona el ciclo de ingresos del negocio.</p>
        </div>
        <Link
          href="/admin/ventas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva Cotización
        </Link>
      </div>

      <DataTable
        data={sales || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Número',
            accessor: (row) => <span className="text-sm font-medium text-[#1a2d3d]">{row.sale_number || 'Borrador'}</span>,
          },
          {
            header: 'Fecha',
            accessor: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[#1a2d3d]">{row.leads?.full_name}</div>
                {row.leads?.document_number && <div className="text-xs text-[#7a99b5]">{row.leads?.document_number}</div>}
              </div>
            ),
          },
          {
            header: 'Total',
            accessor: (row) => <span className="text-sm font-medium">{formatCurrency(row.total)}</span>,
          },
          {
            header: 'Asesor',
            accessor: (row) => <span className="text-sm">{row.profiles?.full_name}</span>,
          },
          {
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <Link
                href={`/admin/ventas/${row.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5ba3d9] bg-[#f7fbff] border border-[#a8c4d9]/50 hover:bg-[#e6f2fb] rounded-lg transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                Detalle
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
