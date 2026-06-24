import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default async function CajaMenorPage() {
  await requireRole(['admin', 'asesor', 'tesoreria']);
  
  const supabase = await createClient();
  
  const { data: boxes, error } = await (supabase as any)
    .from('petty_cash_box_summary')
    .select('*')
    .order('box_number', { ascending: false });

  if (error) {
    console.error('Error fetching petty cash boxes:', error);
  }

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  return (
    <>
      <AdminTopbar 
        eyebrow="— FINANZAS"
        title={<span>Cajas <em>menores</em></span>}
        subtitle="Administra y supervisa los gastos de caja menor."
        searchPlaceholder="Buscar por número o responsable..."
        action={
          <Link href="/admin/caja-menor/nueva" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" /> Nueva caja menor
          </Link>
        }
      />

      <DataTable
        data={boxes || []}
        keyExtractor={(row: any) => row.id}
        columns={[
          {
            header: 'Número',
            accessor: (row: any) => <span className="font-mono text-sm">#{row.box_number}</span>,
          },
          {
            header: 'Nombre / Responsable',
            accessor: (row: any) => (
              <div>
                <div className="font-semibold text-[var(--fg)]">{row.name || 'Caja Menor'}</div>
                <div className="text-xs text-[var(--dim)]">{row.profiles?.full_name}</div>
              </div>
            ),
          },
          {
            header: 'Apertura',
            accessor: (row: any) => <span className="text-sm">{formatDateTime(row.opened_at)}</span>,
          },
          {
            header: 'Cierre',
            accessor: (row: any) => <span className="text-sm">{formatDateTime(row.closed_at) || '-'}</span>,
          },
          {
            header: 'Total Gastos',
            accessor: (row: any) => (
              <div>
                <div className="text-sm font-bold">{formatCurrency(row.total_spent)}</div>
                <div className="text-xs text-[var(--dim)]">{row.total_entries} facturas</div>
              </div>
            ),
          },
          {
            header: 'Estado',
            accessor: (row: any) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row: any) => (
              <Link
                href={`/admin/caja-menor/${row.id}`}
                className="btn btn-ghost"
              >
                <EyeIcon className="w-4 h-4" />
                Detalle
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
