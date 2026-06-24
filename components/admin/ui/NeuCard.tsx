import React from 'react';

interface NeuCardProps {
  children: React.ReactNode;
  variant?: 'raised' | 'raised-sm' | 'inset';
  className?: string;
  onClick?: () => void;
}

export function NeuCard({ children, variant = 'raised', className = '', onClick }: NeuCardProps) {
  let baseClass = 'neu-raised';
  if (variant === 'raised-sm') baseClass = 'neu-raised-sm';
  if (variant === 'inset') baseClass = 'neu-inset';

  return (
    <div className={`${baseClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
