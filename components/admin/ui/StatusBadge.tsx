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
  
  let bg = 'bg-gray-100';
  let text = 'text-gray-800';
  let dot = 'bg-gray-500';
  let label = status;

  if (['pagada', 'atendida', 'completado', 'activo'].includes(normalized)) {
    bg = 'bg-emerald-100';
    text = 'text-emerald-800';
    dot = 'bg-emerald-500';
  } else if (['pendiente', 'pendiente_pago', 'cotizacion', 'en_curso', 'agendada'].includes(normalized)) {
    bg = 'bg-amber-100';
    text = 'text-amber-800';
    dot = 'bg-amber-500';
  } else if (['cancelada', 'anulado', 'inactivo'].includes(normalized)) {
    bg = 'bg-rose-100';
    text = 'text-rose-800';
    dot = 'bg-rose-500';
  }

  // format label visually (e.g. "pendiente_pago" -> "Pendiente Pago")
  label = label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', bg, text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
