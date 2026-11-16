import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  pagada: 'Pagada',
  anulado: 'Anulado',
  anulada: 'Anulada',
  cotizacion: 'Cotización',
  borrador: 'Borrador',
  contabilizado: 'Contabilizado',
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  reembolsada: 'Reembolsada',
  agendada: 'Agendada',
  en_curso: 'En curso',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
  atendida: 'Atendida',
  activo: 'Activo',
  inactivo: 'Inactivo',
  aprobado: 'Aprobado',
  pendiente_revision: 'Pendiente de revisión',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().trim();

  let variantClass = 'neutral';
  if (
    ['pagada', 'pagado', 'atendida', 'completado', 'activo', 'contabilizado', 'aprobado'].includes(
      normalized
    )
  ) {
    variantClass = 'success';
  } else if (
    ['pendiente', 'en_curso', 'pendiente_pago', 'borrador', 'pendiente_revision', 'reprogramada'].includes(
      normalized
    )
  ) {
    variantClass = 'warning';
  } else if (['cancelada', 'anulado', 'anulada', 'inactivo', 'rechazado'].includes(normalized)) {
    variantClass = 'danger';
  } else if (['agendada', 'cotizacion', 'abierta'].includes(normalized)) {
    variantClass = 'info';
  }

  const label =
    STATUS_LABELS[normalized] ||
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return <span className={`badge ${variantClass}`}>{label}</span>;
}
