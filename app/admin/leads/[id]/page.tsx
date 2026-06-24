import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarPlusIcon, FileTextIcon } from 'lucide-react';
import { EditLeadForm } from './EditLeadForm';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { formatDate } from '@/lib/utils/date';

export default async function DetalleLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  
  // Fetch lead with history
  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      appointments ( id, scheduled_at, status, service_types(name) ),
      sales ( id, sale_number, total, status, created_at )
    `)
    .eq('id', id)
    .single();

  if (error || !lead) {
    notFound();
  }

  // format currency for sales table
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin/leads" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">{lead.full_name}</h1>
            <p className="text-[#7a99b5] text-sm">Registrado el {formatDate(lead.created_at)}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link
            href={`/admin/citas/nueva?leadId=${lead.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#3d5a73] border border-[#a8c4d9]/50 rounded-lg font-medium transition-colors hover:bg-[#f7fbff]"
          >
            <CalendarPlusIcon className="w-4 h-4" />
            Agendar Cita
          </Link>
          <Link
            href={`/admin/ventas/nueva?leadId=${lead.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5ba3d9] text-white rounded-lg font-medium transition-colors hover:bg-[#3b7dbf]"
          >
            <FileTextIcon className="w-4 h-4" />
            Crear Cotización
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-1">
          <EditLeadForm lead={lead} id={id} />
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Appointments History */}
          <div className="bg-white rounded-xl shadow-sm border border-[#a8c4d9]/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#a8c4d9]/40 bg-[#f7fbff]">
              <h2 className="font-medium text-[#1a2d3d]">Historial de Citas</h2>
            </div>
            <div className="p-0">
              <DataTable
                data={lead.appointments || []}
                keyExtractor={(row) => row.id}
                columns={[
                  {
                    header: 'Fecha',
                    accessor: (row) => <span className="text-sm">{formatDate(row.scheduled_at)}</span>,
                  },
                  {
                    header: 'Servicio',
                    accessor: (row) => <span className="text-sm">{row.service_types?.name || 'General'}</span>,
                  },
                  {
                    header: 'Estado',
                    accessor: (row) => <StatusBadge status={row.status} />,
                  },
                  {
                    header: '',
                    accessor: (row) => (
                      <Link href={`/admin/citas/${row.id}`} className="text-[#5ba3d9] text-xs hover:underline">
                        Ver
                      </Link>
                    ),
                  }
                ]}
              />
            </div>
          </div>

          {/* Sales History */}
          <div className="bg-white rounded-xl shadow-sm border border-[#a8c4d9]/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#a8c4d9]/40 bg-[#f7fbff]">
              <h2 className="font-medium text-[#1a2d3d]">Historial de Ventas y Cotizaciones</h2>
            </div>
            <div className="p-0">
              <DataTable
                data={lead.sales || []}
                keyExtractor={(row) => row.id}
                columns={[
                  {
                    header: 'Número',
                    accessor: (row) => <span className="text-sm font-medium">{row.sale_number || 'Borrador'}</span>,
                  },
                  {
                    header: 'Fecha',
                    accessor: (row) => <span className="text-sm text-[#7a99b5]">{formatDate(row.created_at)}</span>,
                  },
                  {
                    header: 'Total',
                    accessor: (row) => <span className="text-sm">{formatCurrency(row.total)}</span>,
                  },
                  {
                    header: 'Estado',
                    accessor: (row) => <StatusBadge status={row.status} />,
                  },
                  {
                    header: '',
                    accessor: (row) => (
                      <Link href={`/admin/ventas/${row.id}`} className="text-[#5ba3d9] text-xs hover:underline">
                        Ver
                      </Link>
                    ),
                  }
                ]}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
