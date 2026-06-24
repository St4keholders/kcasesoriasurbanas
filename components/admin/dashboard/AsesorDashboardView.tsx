'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AsesorDashboardViewProps {
  recentLeads: any[];
  topIncomes: any[];
  upcomingAppointments: any[];
  pendingQuotes: any[];
}

export function AsesorDashboardView({
  recentLeads,
  topIncomes,
  upcomingAppointments,
  pendingQuotes
}: AsesorDashboardViewProps) {
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      return format(new Date(iso), "d MMM yyyy, h:mm a", { locale: es });
    } catch {
      return iso.split('T')[0];
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'nuevo': return 'badge neutral';
      case 'contactado': return 'badge info';
      case 'calificado': return 'badge success';
      case 'borrador': return 'badge neutral';
      case 'pendiente_pago': return 'badge warning';
      case 'pagada': return 'badge success';
      default: return 'badge neutral';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      
      {/* Columna 1: Leads más recientes */}
      <div className="card flex flex-col h-[500px] p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="display-title text-base font-semibold">Leads <em>recientes</em></h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1 bg-[var(--bg-soft)]">
          {recentLeads.length > 0 ? (
            recentLeads.map((lead, idx) => (
              <div key={idx} className="flex flex-col p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--sky)] transition-colors">
                <span className="font-semibold text-sm text-[var(--fg)] truncate">{lead.full_name || lead.company_name}</span>
                <span className="text-xs text-[var(--dim)] mt-1">{lead.email || lead.phone}</span>
                <div className="mt-2 flex justify-between items-center">
                  <span className={getStatusColor(lead.status)}>
                    {lead.status?.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[var(--dim)]">
                    {lead.created_at ? format(new Date(lead.created_at), "d MMM", { locale: es }) : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--dim)] italic">
              Sin leads recientes
            </div>
          )}
        </div>
      </div>

      {/* Columna 2: Top Ingresos del Mes */}
      <div className="card flex flex-col h-[500px] p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="display-title text-base font-semibold">Top <em>Ingresos</em></h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1 bg-[var(--bg-soft)]">
          {topIncomes.length > 0 ? (
            topIncomes.map((income, idx) => (
              <div key={idx} className="flex flex-col p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--sky)] transition-colors">
                <span className="font-semibold text-sm text-[var(--fg)] truncate">{income.client_name}</span>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs font-mono text-[var(--dim)]">{income.invoice_number}</span>
                  <span className="text-sm font-bold text-[var(--success)]">{formatCurrency(income.total || 0)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--dim)] italic">
              Sin ingresos registrados
            </div>
          )}
        </div>
      </div>

      {/* Columna 3: Próximas Citas */}
      <div className="card flex flex-col h-[500px] p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="display-title text-base font-semibold">Próximas <em>Citas</em></h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1 bg-[var(--bg-soft)]">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((apt, idx) => (
              <div key={idx} className="flex flex-col p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--sky)] transition-colors">
                <span className="font-semibold text-sm text-[var(--fg)] truncate">{apt.client_name || apt.project_name}</span>
                <span className="text-xs font-medium text-[var(--sky-deep)] mt-1">
                  {formatDate(apt.scheduled_at)}
                </span>
                <div className="mt-2">
                  <span className={getStatusColor(apt.status)}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--dim)] italic">
              No hay citas programadas
            </div>
          )}
        </div>
      </div>

      {/* Columna 4: Cotizaciones en Seguimiento */}
      <div className="card flex flex-col h-[500px] p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="display-title text-base font-semibold">En <em>Seguimiento</em></h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1 bg-[var(--bg-soft)]">
          {pendingQuotes.length > 0 ? (
            pendingQuotes.map((quote, idx) => (
              <div key={idx} className="flex flex-col p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--sky)] transition-colors">
                <span className="font-semibold text-sm text-[var(--fg)] truncate">{quote.client_name}</span>
                <span className="text-[10px] text-[var(--dim)] mt-1 truncate">{quote.concept || 'Servicios'}</span>
                <div className="mt-2 flex justify-between items-center">
                  <span className={getStatusColor(quote.status)}>
                    {quote.status?.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-[var(--sky-deep)]">{formatCurrency(quote.total || 0)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--dim)] italic">
              Sin cotizaciones pendientes
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
