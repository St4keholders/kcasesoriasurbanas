'use client';

import React, { useState, useMemo } from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';
import { PlusIcon, EyeIcon, UploadCloudIcon, CalendarIcon, CreditCardIcon, ReceiptIcon, FileTextIcon, WalletIcon, SearchIcon } from 'lucide-react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { BulkUploadModal } from './BulkUploadModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';

export function ComprasClientView({ 
  initialPurchases, 
  costCenters = [], 
  suppliers = [],
  pettyCash = []
}: { 
  initialPurchases: any[], 
  costCenters?: any[], 
  suppliers?: any[],
  pettyCash?: any[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
      if (supplierFilter) {
        valid = valid && p.supplier_id === supplierFilter;
      }
      if (costCenterFilter) {
        valid = valid && p.cost_center_id === costCenterFilter;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const invoiceMatch = p.invoice_number && p.invoice_number.toLowerCase().includes(query);
        const purchaseMatch = p.purchase_number && p.purchase_number.toLowerCase().includes(query);
        const supplierMatch = (p.suppliers?.name || p.supplier_name || '').toLowerCase().includes(query);
        valid = valid && (invoiceMatch || purchaseMatch || supplierMatch);
      }
      return valid;
    });
  }, [initialPurchases, dateFrom, dateTo, supplierFilter, costCenterFilter, searchQuery]);

  const dynamicKpis = useMemo(() => {
    const validPurchases = filteredPurchases.filter(p => p.status !== 'anulada');
    const totalComprasMes = validPurchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const totalRetencionesMes = validPurchases.reduce((acc, p) => acc + (Number(p.withholding_tax) || 0), 0);
    const ivaCompras = validPurchases.reduce((acc, p) => acc + (Number(p.tax_iva) || 0), 0);

    let filteredPettyCash = pettyCash;
    if (costCenterFilter) {
      filteredPettyCash = []; // Cajas menores don't belong directly to a cost center like purchases do
    } else if (supplierFilter) {
      const selectedSupplier = suppliers.find(s => s.id === supplierFilter);
      if (selectedSupplier) {
        filteredPettyCash = filteredPettyCash.filter(pc => 
          pc.supplier_name && pc.supplier_name.toLowerCase().includes(selectedSupplier.name.toLowerCase())
        );
      }
    }

    const totalCajasMenoresMes = filteredPettyCash.reduce((acc, pc) => acc + (Number(pc.total_amount) || 0), 0);
    const ivaCajas = filteredPettyCash.reduce((acc, pc) => acc + (Number(pc.tax_amount) || 0), 0);
    
    return {
      totalComprasMes,
      totalIvaMes: ivaCompras + ivaCajas,
      totalRetencionesMes,
      totalCajasMenoresMes
    };
  }, [filteredPurchases, pettyCash, costCenterFilter, supplierFilter, suppliers]);

  return (
    <>
      <AdminTopbar 
        eyebrow="— TESORERÍA"
        title={<span>Compras y <em>gastos</em></span>}
        subtitle="Gestiona las cuentas por pagar y los egresos de la empresa."
        action={
          <div className="flex items-center gap-3">
            <button onClick={() => setIsModalOpen(true)} className="neu-btn-secondary py-1.5 text-sm">
              <UploadCloudIcon className="w-4 h-4" /> Masivo
            </button>
            <Link href="/admin/compras/nueva" className="neu-btn-primary py-1.5 text-sm">
              <PlusIcon className="w-4 h-4" /> Nueva compra
            </Link>
          </div>
        }
      />

      {/* FILTER BAR */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mt-6 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Search */}
        <div className="w-full xl:w-80 relative shrink-0">
           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dim)]" />
           <input 
             type="text"
             placeholder="Buscar por factura o proveedor..."
             className="neu-input pl-9 w-full py-2 text-sm"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-4 py-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-[var(--dim)]" />
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-[var(--fg)] outline-none cursor-pointer w-[110px]"
              title="Fecha desde"
            />
            <span className="text-[var(--dim)]">-</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-[var(--fg)] outline-none cursor-pointer w-[110px]"
              title="Fecha hasta"
            />
          </div>
          
          <select 
            className="neu-input py-2 min-w-[160px] text-sm"
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
          >
            <option value="">Todos los Centros</option>
            {costCenters.map(cc => (
              <option key={cc.id} value={cc.id}>{cc.name}</option>
            ))}
          </select>
          
          <select 
            className="neu-input py-2 min-w-[160px] text-sm"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">Todos los Proveedores</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {(dateFrom || dateTo || supplierFilter || costCenterFilter || searchQuery) && (
            <button 
              onClick={() => { setDateFrom(''); setDateTo(''); setSupplierFilter(''); setCostCenterFilter(''); setSearchQuery(''); }} 
              className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 whitespace-nowrap"
            >
              Quitar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-6">
        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total Compras (Mes)</span>
            <div className="icon-box sm"><CreditCardIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(dynamicKpis.totalComprasMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total IVA (Mes)</span>
            <div className="icon-box sm amber"><ReceiptIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(dynamicKpis.totalIvaMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Total Retenciones</span>
            <div className="icon-box sm purple"><FileTextIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(dynamicKpis.totalRetencionesMes)}</div>
        </div>

        <div className="card flex flex-col justify-center p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--dim)]">Cajas Menores (Mes)</span>
            <div className="icon-box sm green"><WalletIcon /></div>
          </div>
          <div className="text-2xl font-bold font-display text-[var(--fg)]">{formatCurrency(dynamicKpis.totalCajasMenoresMes)}</div>
        </div>
      </div>

      <DataTable
        data={filteredPurchases}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Factura / Doc.',
            sortAccessor: (row) => row.purchase_number,
            accessor: (row) => (
              <div>
                <div className="font-semibold text-[var(--fg)]">{row.purchase_number || 'Borrador'}</div>
                {row.invoice_number && <div className="text-xs text-[var(--dim)]">Ref: {row.invoice_number}</div>}
              </div>
            ),
          },
          {
            header: 'Fecha',
            sortAccessor: (row) => row.transaction_date,
            accessor: (row) => <span className="text-sm font-mono text-[var(--dim)]">{formatDate(row.transaction_date)}</span>,
          },
          {
            header: 'Proveedor',
            sortAccessor: (row) => row.suppliers?.name || row.supplier_name || '',
            accessor: (row) => <span className="text-sm font-medium text-[var(--fg-soft)]">{row.suppliers?.name || row.supplier_name || 'Sin Proveedor'}</span>,
          },
          {
            header: 'Centro Costo',
            sortAccessor: (row) => row.cost_centers?.name || '',
            accessor: (row) => <span className="text-sm text-[var(--dim)]">{row.cost_centers?.name}</span>,
          },
          {
            header: 'Total',
            sortAccessor: (row) => Number(row.total),
            accessor: (row) => <span className="text-sm font-semibold text-[var(--fg)]">{formatCurrency(row.total)}</span>,
          },
          {
            header: 'Estado',
            sortAccessor: (row) => row.status,
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Acciones',
            sortable: false,
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
