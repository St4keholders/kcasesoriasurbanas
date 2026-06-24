'use client';

import React from 'react';
import { WalletIcon, TrendingUpIcon, ShoppingCartIcon } from 'lucide-react';

export function DashboardSummaries({ 
  pettyCashBoxes, 
  topSales, 
  topPurchases 
}: { 
  pettyCashBoxes: any[], 
  topSales: any[], 
  topPurchases: any[] 
}) {
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* Cajas Menores */}
      <div className="panel flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--border)] pb-2">
          <WalletIcon className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-[var(--fg)]">Cajas Menores</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {pettyCashBoxes && pettyCashBoxes.length > 0 ? (
            pettyCashBoxes.map((box, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[var(--surface)] rounded border border-[var(--border)]">
                <span className="font-medium text-[var(--fg-soft)] truncate max-w-[120px]" title={box.name}>{box.name}</span>
                <span className="font-bold text-emerald-600">{formatCurrency(box.total_spent || 0)}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[var(--dim)] italic text-center py-2">No hay cajas activas</div>
          )}
        </div>
      </div>

      {/* Top Ventas */}
      <div className="panel flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--border)] pb-2">
          <TrendingUpIcon className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-[var(--fg)]">Top Ventas (Mes)</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {topSales && topSales.length > 0 ? (
            topSales.map((sale, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[var(--surface)] rounded border border-[var(--border)] hover:border-blue-200 transition-colors">
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-[var(--fg-soft)] truncate" title={sale.client_name}>{sale.client_name}</span>
                  {sale.invoice_number && <span className="text-[10px] text-[var(--dim)] truncate">Ref: {sale.invoice_number}</span>}
                </div>
                <span className="font-bold text-blue-600 shrink-0">{formatCurrency(sale.total)}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[var(--dim)] italic text-center py-2">Sin ventas recientes</div>
          )}
        </div>
      </div>

      {/* Top Compras */}
      <div className="panel flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--border)] pb-2">
          <ShoppingCartIcon className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-semibold text-[var(--fg)]">Top Compras (Mes)</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {topPurchases && topPurchases.length > 0 ? (
            topPurchases.map((purchase, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[var(--surface)] rounded border border-[var(--border)] hover:border-rose-200 transition-colors">
                <div className="flex flex-col overflow-hidden pr-2">
                  <span className="font-medium text-[var(--fg-soft)] truncate" title={purchase.suppliers?.name || 'Proveedor'}>{purchase.suppliers?.name || 'Proveedor'}</span>
                  <span className="text-[10px] text-[var(--dim)] truncate" title={purchase.concept}>{purchase.concept}</span>
                </div>
                <span className="font-bold text-rose-600 shrink-0">{formatCurrency(purchase.total)}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[var(--dim)] italic text-center py-2">Sin gastos recientes</div>
          )}
        </div>
      </div>

    </div>
  );
}
