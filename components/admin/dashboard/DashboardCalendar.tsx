'use client';

import React from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function DashboardCalendar({ appointments }: { appointments: any[] }) {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  
  const daysInMonth = eachDayOfInterval({ start, end });
  const firstDayOfWeek = getDay(start); // 0 = Domingo, 1 = Lunes, etc.
  
  // Ajustar para que la semana empiece en Lunes
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const hasAppointment = (date: Date) => {
    return appointments.some(app => {
      if (!app.scheduled_at) return false;
      return isSameDay(new Date(app.scheduled_at), date);
    });
  };

  return (
    <div className="w-full h-full bg-white rounded-xl border border-[var(--border)] p-4 flex flex-col shadow-sm">
      <h3 className="text-[var(--fg)] font-semibold mb-4 text-center capitalize">
        {format(today, 'MMMM yyyy', { locale: es })}
      </h3>
      
      <div className="grid grid-cols-7 gap-[1px] bg-[var(--border)] border border-[var(--border)] rounded flex-1">
        {/* Cabecera días */}
        {weekDays.map((day, idx) => (
          <div key={`weekday-${idx}`} className="bg-[var(--surface)] text-[var(--dim)] text-xs font-bold text-center py-2">
            {day}
          </div>
        ))}

        {/* Padding al inicio del mes */}
        {Array.from({ length: paddingDays }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-[#f8fafc] min-h-[40px]" />
        ))}

        {/* Días del mes */}
        {daysInMonth.map((date) => {
          const isAppointed = hasAppointment(date);
          const isToday = isSameDay(date, today);
          
          return (
            <div 
              key={date.toString()} 
              className={`
                bg-white min-h-[40px] flex items-center justify-center p-1 relative
                ${isAppointed ? 'bg-blue-50/50' : ''}
              `}
            >
              <div 
                className={`
                  w-7 h-7 flex items-center justify-center text-xs rounded-full font-medium transition-all
                  ${isAppointed ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--fg-soft)]'}
                  ${isToday && !isAppointed ? 'border border-[var(--primary)] text-[var(--primary)]' : ''}
                `}
              >
                {format(date, 'd')}
              </div>
            </div>
          );
        })}

        {/* Padding al final del mes */}
        {Array.from({ length: (42 - (paddingDays + daysInMonth.length)) % 7 }).map((_, i) => (
          <div key={`pad-end-${i}`} className="bg-[#f8fafc] min-h-[40px]" />
        ))}
      </div>
      
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--dim)]">
        <div className="w-3 h-3 bg-[var(--primary)] rounded-full"></div>
        <span>Citas Programadas</span>
      </div>
    </div>
  );
}
