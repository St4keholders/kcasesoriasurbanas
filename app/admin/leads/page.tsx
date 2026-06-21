import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import Link from 'next/link';
import { PlusIcon, EyeIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

export default async function LeadsPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      appointments ( count ),
      sales ( count )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
  }

  // Calculate totals
  const leadsWithCounts = (leads || []).map(lead => ({
    ...lead,
    appointments_count: lead.appointments[0]?.count || 0,
    sales_count: lead.sales[0]?.count || 0
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-1">Leads / Clientes</h1>
          <p className="text-[#7a99b5] text-sm">Gestiona tus clientes potenciales y su historial.</p>
        </div>
        <Link
          href="/admin/leads/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Cliente
        </Link>
      </div>

      <DataTable
        data={leadsWithCounts}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Cliente',
            accessor: (row) => (
              <div>
                <div className="font-medium text-[#1a2d3d]">{row.full_name}</div>
                {row.document_number && <div className="text-xs text-[#7a99b5]">CC/NIT: {row.document_number}</div>}
              </div>
            ),
          },
          {
            header: 'Contacto',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[#3d5a73]">{row.phone}</div>
                {row.email && <div className="text-xs text-[#7a99b5]">{row.email}</div>}
              </div>
            ),
          },
          {
            header: 'Fuente',
            accessor: 'source',
          },
          {
            header: 'Interacciones',
            accessor: (row) => (
              <div className="flex gap-4 text-xs text-[#7a99b5]">
                <span title="Citas">{row.appointments_count} citas</span>
                <span title="Ventas">{row.sales_count} ventas</span>
              </div>
            ),
          },
          {
            header: 'Registro',
            accessor: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <Link
                href={`/admin/leads/${row.id}`}
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
