import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AddInvoiceButton } from './AddInvoiceButton';
import { BulkUploadButton } from './BulkUploadButton';
import { ExternalLinkIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default async function CajaMenorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'asesor', 'tesoreria']);
  
  const supabase = await createClient();
  
  const { data: box, error: boxError } = await (supabase as any)
    .from('petty_cash_boxes')
    .select('*, profiles!petty_cash_boxes_opened_by_fkey(full_name)')
    .eq('id', id)
    .single();

  if (boxError || !box) {
    redirect('/admin/caja-menor');
  }

  const { data: entries, error: entriesError } = await (supabase as any)
    .from('petty_cash_entries_full')
    .select('*')
    .eq('box_id', id)
    .order('entry_date', { ascending: false });

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  };



  return (
    <div className="main">
      <AdminTopbar 
        title={`Caja Menor #${box.box_number}`} 
        subtitle={box.name || `Abierta por ${box.profiles?.full_name}`}
        action={
          <div className="flex gap-2">
            {box.status === 'abierta' && (
              <>
                <BulkUploadButton boxId={id} />
                <AddInvoiceButton boxId={id} />
              </>
            )}
          </div>
        }
      />

      <div className="mb-6 card p-5 flex justify-between items-center bg-[var(--admin-bg-hover)]">
        <div>
          <div className="text-sm text-[var(--dim)] mb-1">Estado Actual</div>
          <StatusBadge status={box.status} />
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--dim)] mb-1">Total Gastado</div>
          <div className="text-2xl font-bold text-[var(--fg)]">
            {formatCurrency(entries?.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0)}
          </div>
        </div>
      </div>

      <DataTable
        data={entries || []}
        keyExtractor={(row: any) => row.id}
        columns={[
          {
            header: 'Fecha',
            accessor: (row: any) => <span className="text-sm">{formatDateTime(row.entry_date)}</span>,
          },
          {
            header: 'Proveedor',
            accessor: (row: any) => (
              <div>
                <div className="text-sm font-medium">{row.supplier_name}</div>
                <div className="text-xs text-[var(--dim)]">{row.supplier_document}</div>
              </div>
            ),
          },
          {
            header: 'Concepto',
            accessor: (row: any) => <span className="text-sm">{row.concept}</span>,
          },
          {
            header: 'IVA',
            accessor: (row: any) => <span className="text-sm">{formatCurrency(row.tax_amount)}</span>,
          },
          {
            header: 'Total',
            accessor: (row: any) => <span className="text-sm font-bold">{formatCurrency(row.total_amount)}</span>,
          },
          {
            header: 'Soporte',
            accessor: (row: any) => row.receipt_url ? (
              <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 text-sm">
                <ExternalLinkIcon className="w-3 h-3" /> Ver
              </a>
            ) : <span className="text-xs text-[var(--dim)]">N/A</span>,
          },

        ]}
      />
    </div>
  );
}
