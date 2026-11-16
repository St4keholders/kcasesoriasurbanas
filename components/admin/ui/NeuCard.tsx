import React from 'react';

interface NeuCardProps {
  children: React.ReactNode;
  variant?: 'raised' | 'raised-sm' | 'inset';
  className?: string;
  onClick?: () => void;
}

export function NeuCard({ children, variant = 'raised', className = '', onClick }: NeuCardProps) {
  let baseClass = 'glass-panel';
  if (variant === 'raised-sm') baseClass = 'glass-panel';
  if (variant === 'inset') baseClass = 'glass-panel';

  return (
    <div className={`${baseClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
