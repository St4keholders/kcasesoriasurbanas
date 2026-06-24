'use client';

import React from 'react';
import { DashboardLineChart } from './DashboardLineChart';
import { DashboardCalendar } from './DashboardCalendar';
import { DashboardSummaries } from './DashboardSummaries';

interface AdminDashboardViewProps {
  chartData: any[];
  monthAppointments: any[];
  pettyCashBoxes: any[];
  topSales: any[];
  topPurchases: any[];
}

export function AdminDashboardView({
  chartData,
  monthAppointments,
  pettyCashBoxes,
  topSales,
  topPurchases
}: AdminDashboardViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
      {/* Gráfico Lineal (Columna Izquierda: ~58%) */}
      <div className="lg:col-span-7 card interactive flex flex-col h-[500px]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="display-title text-lg font-semibold">Ingresos y <em>Gastos</em></div>
            <div className="text-[var(--dim)] text-xs mt-1">Evolución en los últimos 30 días</div>
          </div>
        </div>
        <div className="flex-1 min-h-0 w-full pt-4">
          <DashboardLineChart data={chartData} />
        </div>
      </div>

      {/* Calendario (Columna Centro: ~17%) */}
      <div className="lg:col-span-2 flex flex-col h-[500px]">
        <DashboardCalendar appointments={monthAppointments} />
      </div>

      {/* Resúmenes y Tops (Columna Derecha: ~25%) */}
      <div className="lg:col-span-3 flex flex-col h-[500px] gap-6">
        <DashboardSummaries 
          pettyCashBoxes={pettyCashBoxes} 
          topSales={topSales} 
          topPurchases={topPurchases} 
        />
      </div>
    </div>
  );
}
