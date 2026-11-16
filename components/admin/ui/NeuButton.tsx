'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { KcLoader } from '@/components/ui/KcLoader';

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function NeuButton({ 
  children, 
  variant = 'secondary', 
  isLoading = false, 
  icon,
  className = '',
  disabled,
  ...props 
}: NeuButtonProps) {
  const formStatus = useFormStatus();
  const busy = isLoading || (props.type === 'submit' && formStatus.pending);
  const baseClass = variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';
  const loadingClass = busy ? 'opacity-75 cursor-not-allowed' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button 
      className={`${baseClass} ${loadingClass} ${disabledClass} ${className}`}
      disabled={busy || disabled}
      {...props}
    >
      {busy ? (
        <KcLoader size={18} delayMs={150} label="Procesando acción..." className="mr-1.5" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
