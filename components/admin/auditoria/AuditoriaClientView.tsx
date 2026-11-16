'use client';

import React from 'react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Database } from '@/types/database';

type AuditLogRow = Database['public']['Tables']['audit_log']['Row'] & {
  profiles?: { full_name: string; role: string } | null;
};

interface AuditoriaClientViewProps {
  logs: AuditLogRow[];
}

export function AuditoriaClientView({ logs }: AuditoriaClientViewProps) {
  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), 'dd MMM yyyy, HH:mm:ss', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <>
      <AdminTopbar
        title="Registro de Auditoría"
        subtitle="Monitorea la actividad del sistema para fines de seguridad y control."
      />

      <DataTable
        data={logs || []}
        keyExtractor={(row) => row.id}
        columns={[
          {
            header: 'Fecha y hora',
            accessor: (row) => (
              <span className="text-xs font-mono text-[var(--dim)] whitespace-nowrap">
                {formatDateTime(row.created_at)}
              </span>
            ),
          },
          {
            header: 'Usuario',
            accessor: (row) => (
              <div>
                <div className="text-sm text-[var(--fg)] font-semibold">
                  {row.profiles?.full_name || 'Sistema / Automático'}
                </div>
                <div className="text-xs text-[var(--dim)]">{row.profiles?.role || '-'}</div>
              </div>
            ),
          },
          {
            header: 'Acción',
            accessor: (row) => (
              <span
                className={`status-badge ${
                  row.action === 'INSERT'
                    ? 'attended'
                    : row.action === 'UPDATE'
                    ? 'pending'
                    : row.action === 'VOID' || row.action === 'DELETE'
                    ? 'cancelled'
                    : 'scheduled'
                }`}
              >
                {row.action === 'VOID' ? 'ANULACIÓN' : row.action}
              </span>
            ),
          },
          {
            header: 'Tabla',
            accessor: (row) => (
              <span className="text-sm font-semibold tracking-wider text-[var(--fg-soft)] uppercase">
                {row.table_name}
              </span>
            ),
          },
          {
            header: 'ID Registro',
            accessor: (row) => (
              <span
                className="text-xs text-[var(--dim)] truncate max-w-[120px] block"
                title={row.record_id || ''}
              >
                {row.record_id || '-'}
              </span>
            ),
          },
          {
            header: 'Detalle',
            accessor: (row) => (
              <details className="text-xs cursor-pointer group">
                <summary className="text-[var(--sky)] font-medium">Ver cambios</summary>
                <div className="absolute z-10 mt-2 p-3 bg-white border border-[var(--shadow-dark)] rounded-xl shadow-xl max-w-sm max-h-60 overflow-auto hidden group-open:block">
                  {row.old_data && (
                    <div className="mb-2">
                      <div className="font-semibold text-rose-600 mb-1">Anterior:</div>
                      <pre className="text-[10px] bg-rose-50 p-2 rounded">
                        {JSON.stringify(row.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {row.new_data && (
                    <div>
                      <div className="font-semibold text-emerald-600 mb-1">Nuevo:</div>
                      <pre className="text-[10px] bg-emerald-50 p-2 rounded">
                        {JSON.stringify(row.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ),
          },
        ]}
      />
    </>
  );
}
