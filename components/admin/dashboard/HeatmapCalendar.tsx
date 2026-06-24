'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/admin/ui/Modal';
import { TrendingUpIcon, FileTextIcon } from 'lucide-react';
import Link from 'next/link';

interface HeatmapCalendarProps {
  purchases: any[];
  currentDateIso: string;
}

export function HeatmapCalendar({ purchases, currentDateIso }: HeatmapCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const currentDate = new Date(currentDateIso);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Dias en el mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...

  // Agrupar compras por dia
  const expensesByDay: Record<string, { total: number; count: number; items: any[] }> = {};
  let maxDailyTotal = 0;

  purchases.forEach(p => {
    if (!p.transaction_date || p.status === 'anulado') return;
    const dateStr = p.transaction_date; // YYYY-MM-DD
    
    // Verificar si es del mes actual
    const pDate = new Date(dateStr + 'T00:00:00');
    if (pDate.getFullYear() === year && pDate.getMonth() === month) {
      if (!expensesByDay[dateStr]) {
        expensesByDay[dateStr] = { total: 0, count: 0, items: [] };
      }
      expensesByDay[dateStr].total += Number(p.total) || 0;
      expensesByDay[dateStr].count += 1;
      expensesByDay[dateStr].items.push(p);

      if (expensesByDay[dateStr].total > maxDailyTotal) {
        maxDailyTotal = expensesByDay[dateStr].total;
      }
    }
  });

  const getIntensityClass = (total: number) => {
    if (total === 0) return 'bg-[var(--bg)] border-[var(--border)] text-[var(--dim)]';
    const ratio = total / maxDailyTotal;
    if (ratio < 0.2) return 'bg-[#e0f2fe] border-[#bae6fd] text-[#0369a1]'; 
    if (ratio < 0.4) return 'bg-[#bae6fd] border-[#7dd3fc] text-[#0c4a6e]'; 
    if (ratio < 0.6) return 'bg-[#7dd3fc] border-[#38bdf8] text-[#0c4a6e]'; 
    if (ratio < 0.8) return 'bg-[#38bdf8] border-[#0ea5e9] text-white'; 
    return 'bg-[#0ea5e9] border-[#0284c7] text-white'; 
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const days = [];
  // Celdas vacías iniciales
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 sm:h-24 bg-transparent"></div>);
  }

  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = expensesByDay[dateStr] || { total: 0, count: 0, items: [] };
    const hasData = dayData.total > 0;

    days.push(
      <div 
        key={d} 
        onClick={() => hasData && setSelectedDate(dateStr)}
        className={`relative h-20 sm:h-24 border rounded-xl p-2 transition-all ${getIntensityClass(dayData.total)} ${hasData ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : 'opacity-60'}`}
      >
        <div className="font-mono text-sm font-medium">{d}</div>
        {hasData && (
          <div className="absolute bottom-2 left-2 right-2 text-xs font-semibold truncate text-right">
            {formatCurrency(dayData.total)}
          </div>
        )}
      </div>
    );
  }

  const selectedDayData = selectedDate ? expensesByDay[selectedDate] : null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-[var(--dim)] uppercase tracking-wider mb-2">
            {day}
          </div>
        ))}
        {days}
      </div>

      <Modal 
        isOpen={!!selectedDate} 
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? `Gastos del ${selectedDate.split('-').reverse().join('/')}` : ''}
        maxWidth="lg"
      >
        {selectedDayData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                  <TrendingUpIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--dim)] uppercase tracking-wider">Total Gastado</div>
                  <div className="text-xl font-bold text-[var(--fg)]">{formatCurrency(selectedDayData.total)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-[var(--dim)] uppercase tracking-wider">Transacciones</div>
                <div className="text-xl font-bold text-[var(--fg)]">{selectedDayData.count}</div>
              </div>
            </div>

            <div className="font-semibold text-sm text-[var(--dim)] uppercase tracking-wider mt-6 mb-3">Detalle de Transacciones</div>
            <div className="space-y-3">
              {selectedDayData.items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-soft)] hover:border-[var(--sky-light)] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <FileTextIcon className="w-4 h-4 text-[var(--dim)]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[var(--fg)]">{item.concept || 'Sin concepto'}</div>
                      <div className="text-xs text-[var(--dim)] mt-0.5">{item.suppliers?.name || 'Proveedor ocasional'} • {item.cost_centers?.name || 'Sin asignar'}</div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="font-bold text-sm">{formatCurrency(Number(item.total))}</div>
                    <Link href={`/admin/compras/${item.id}`} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline">
                      Ver detalle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
