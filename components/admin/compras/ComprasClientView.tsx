'use client';

import React, { useState, useMemo } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon, UploadCloudIcon, CalendarIcon, CreditCardIcon, ReceiptIcon, FileTextIcon, WalletIcon } from 'lucide-react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { BulkUploadModal } from './BulkUploadModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';

export function ComprasClientView({ 
  initialPurchases, 
  costCenters = [], 
  suppliers = [],
  kpis = { totalComprasMes: 0, totalIvaMes: 0, totalRetencionesMes: 0, totalCajasMenoresMes: 0 }
}: { 
  initialPurchases: any[], 
  costCenters?: any[], 
  suppliers?: any[],
  kpis?: { totalComprasMes: number, totalIvaMes: number, totalRetencionesMes: number, totalCajasMenoresMes: number }
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => {
    if (!iso) return 'N/A';
    try {
      return format(new Date(iso), "dd MMM yyyy", { locale: es });
    } catch {
      return iso;
    }
  };

  const filteredPurchases = useMemo(() => {
    return initialPurchases.filter(p => {
      let valid = true;
      if (dateFrom && p.transaction_date) {
        valid = valid && !isBefore(parseISO(p.transaction_date), startOfDay(parseISO(dateFrom)));
      }
      if (dateTo && p.transaction_date) {
        valid = valid && !isAfter(parseISO(p.transaction_date), endOfDay(parseISO(dateTo)));
      }
      return valid;
    });
  }, [initialPurchases, dateFrom, dateTo]);

  return (
    <>
      <AdminTopbar 
        eyebrow="— TESORERÍA"
        title={<span>Compras y <em>gastos</em></span>}
        subtitle="Gestiona las cuentas por pagar y los egresos de la empresa."
        searchPlaceholder="Buscar por factura o proveedor..."
        onSearch={(value) => {
          // Simple search mock
        }}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-4 py-2 shadow-sm text-sm">
              <CalendarIcon className="w-4 h-4 text-[var(--dim)]" />
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[var(--fg)] outline-none cursor-pointer"
                title="Fecha desde"
              />
              <span className="text-[var(--dim)]">-</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[var(--fg)] outline-none cursor-pointer"
                title="Fecha hasta"
              />
            </div>
            
            <button onClick={() => setIsModalOpen(true)} className="btn">
              <UploadCloudIcon className="w-4 h-4" /> Masivo
            </button>
            
            <Link href="/admin/compras/nueva" className="btn btn-primary">
              <PlusIcon className="w-4 h-4" /> Nueva compra
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total Compras (Mes)</span>
            <div className="icon-box sm"><CreditCardIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(kpis.totalComprasMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total IVA (Mes)</span>
            <div className="icon-box sm amber"><ReceiptIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(kpis.totalIvaMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total Retenciones</span>
            <div className="icon-box sm purple"><FileTextIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(kpis.totalRetencionesMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Cajas Menores (Mes)</span>
            <div className="icon-box sm green"><WalletIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(kpis.totalCajasMenoresMes)}</div>
        </div>
      </div>

      <DataTable
        data={filteredPurchases}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Factura / Doc.',
            accessor: (row) => (
              <div>
                <div className="font-semibold text-[var(--fg)]">{row.purchase_number || 'Borrador'}</div>
                {row.invoice_number && <div className="text-xs text-[var(--dim)]">Ref: {row.invoice_number}</div>}
              </div>
            ),
          },
          {
            header: 'Fecha',
            accessor: (row) => <span className="text-sm font-mono text-[var(--dim)]">{formatDate(row.transaction_date)}</span>,
          },
          {
            header: 'Proveedor',
            accessor: (row) => <span className="text-sm font-medium text-[var(--fg-soft)]">{row.suppliers?.name || row.supplier_name || 'Sin Proveedor'}</span>,
          },
          {
            header: 'Centro Costo',
            accessor: (row) => <span className="text-sm text-[var(--dim)]">{row.cost_centers?.name}</span>,
          },
          {
            header: 'Total',
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{formatCurrency(row.total)}</span>,
          },
          {
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            accessor: (row) => (
              <button
                onClick={() => setSelectedPurchase(row)}
                className="btn btn-ghost"
              >
                <EyeIcon className="w-4 h-4" /> Detalle
              </button>
            ),
          },
        ]}
      />

      {isModalOpen && (
        <BulkUploadModal 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          costCenters={costCenters}
          suppliers={suppliers}
          onClose={() => setSelectedPurchase(null)}
          onSave={() => {
            setSelectedPurchase(null);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
