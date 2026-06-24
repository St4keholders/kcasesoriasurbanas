import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let variantClass = '';
  let label = status;

  if (['pagada', 'atendida', 'completado', 'activo'].includes(normalized)) {
    variantClass = 'attended';
  } else if (['pendiente', 'en_curso'].includes(normalized)) {
    variantClass = 'pending';
  } else if (['cancelada', 'anulado', 'inactivo'].includes(normalized)) {
    variantClass = 'cancelled';
  } else if (['agendada', 'pendiente_pago', 'cotizacion'].includes(normalized)) {
    variantClass = 'scheduled';
  }

  // format label visually (e.g. "pendiente_pago" -> "Pendiente Pago")
  label = label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`status-badge ${variantClass}`}>
      {label}
    </span>
  );
}
