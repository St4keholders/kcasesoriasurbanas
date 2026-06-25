'use client';

import React from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AddInvoiceButton } from '@/app/admin/caja-menor/[id]/AddInvoiceButton';
import { BulkUploadButton } from '@/app/admin/caja-menor/[id]/BulkUploadButton';
import { ExternalLinkIcon, DownloadIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CajaMenorDetailClientViewProps {
  box: any;
  entries: any[];
}

export function CajaMenorDetailClientView({ box, entries }: CajaMenorDetailClientViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  };

  const handleDownloadPDF = () => {
    const totalGastado = entries?.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rows = entries.map(e => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e8f0f8;font-size:13px;color:#3d5a73">${formatDateTime(e.entry_date)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8f0f8;font-size:13px;font-weight:600;color:#1a2d3d">${e.supplier_name || ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8f0f8;font-size:13px;color:#3d5a73">${e.concept || ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8f0f8;font-size:13px;color:#7a99b5;text-align:right">${formatCurrency(e.tax_amount || 0)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8f0f8;font-size:13px;font-weight:700;color:#1a2d3d;text-align:right">${formatCurrency(e.total_amount)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Caja Menor #${box.box_number} - KC Asesorías</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; margin:0; padding:40px; background:#fff; color:#1a2d3d; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:3px solid #5ba3d9; }
          .logo { font-size:22px; font-weight:800; color:#1a2d3d; }
          .logo span { color:#5ba3d9; }
          .meta { text-align:right; font-size:13px; color:#7a99b5; }
          .meta strong { color:#1a2d3d; display:block; font-size:16px; }
          .summary { display:flex; gap:24px; margin-bottom:28px; }
          .summary-card { flex:1; background:#f7fbff; border:1px solid #e0ecf5; border-radius:10px; padding:16px 20px; }
          .summary-card .label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#7a99b5; margin-bottom:4px; }
          .summary-card .value { font-size:20px; font-weight:700; color:#1a2d3d; }
          table { width:100%; border-collapse:collapse; }
          thead th { padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#7a99b5; background:#f7fbff; border-bottom:2px solid #d4e6f3; }
          thead th:nth-child(4), thead th:nth-child(5) { text-align:right; }
          .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e0ecf5; text-align:center; font-size:11px; color:#a8c4d9; }
          @media print { body { padding:20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">KC <span>Asesorías</span> Urbanas S.A.S</div>
            <div style="font-size:12px;color:#7a99b5;margin-top:4px">NIT: 902012620-0 | kcasesoriasurbanas@gmail.com</div>
          </div>
          <div class="meta">
            <strong>Caja Menor #${box.box_number}</strong>
            ${box.name || ''}
            <br/>Estado: ${box.status === 'abierta' ? 'Abierta' : 'Cerrada'}
          </div>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Gastado</div>
            <div class="value">${formatCurrency(totalGastado)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Registros</div>
            <div class="value">${entries.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Fecha de Reporte</div>
            <div class="value" style="font-size:15px">${format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Concepto</th>
              <th>IVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding:14px 12px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #d4e6f3;color:#1a2d3d">TOTAL:</td>
              <td style="padding:14px 12px;text-align:right;font-weight:800;font-size:16px;border-top:2px solid #d4e6f3;color:#5ba3d9">${formatCurrency(totalGastado)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          Documento generado automáticamente por KC Asesorías Urbanas S.A.S — Este documento es para uso interno.
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <>
      <AdminTopbar 
        title={`Caja Menor #${box.box_number}`} 
        subtitle={box.name || `Abierta por ${box.profiles?.full_name}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="neu-btn-secondary flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> Descargar PDF
            </button>
            {box.status === 'abierta' && (
              <>
                <BulkUploadButton boxId={box.id} />
                <AddInvoiceButton boxId={box.id} />
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
    </>
  );
}
