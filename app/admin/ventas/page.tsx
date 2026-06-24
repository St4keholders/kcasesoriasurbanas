import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { AdminTopbar } from '@/components/admin/AdminTopbar';

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
    <>
      <AdminTopbar 
        eyebrow="— FINANZAS"
        title={<span>Ventas y <em>cotizaciones</em></span>}
        subtitle="Gestiona el ciclo de ingresos del negocio."
        searchPlaceholder="Buscar por cliente o número..."
        action={
          <Link href="/admin/ventas/nueva" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Nueva cotización
          </Link>
        }
      />

      <DataTable
        data={sales || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Número',
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{row.sale_number || 'Borrador'}</span>,
          },
          {
            header: 'Fecha',
            accessor: (row) => <span className="text-sm font-mono text-[var(--dim)]">{formatDate(row.created_at)}</span>,
          },
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="text-sm font-medium text-[var(--fg-soft)]">{row.leads?.full_name}</div>
                {row.leads?.document_number && <div className="text-xs text-[var(--dim)]">{row.leads?.document_number}</div>}
              </div>
            ),
          },
          {
            header: 'Total',
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{formatCurrency(row.total)}</span>,
          },
          {
            header: 'Asesor',
            accessor: (row) => <span className="text-sm text-[var(--fg-soft)]">{row.profiles?.full_name}</span>,
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
                className="btn btn-ghost"
              >
                <EyeIcon className="w-4 h-4" /> Detalle
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
