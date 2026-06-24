import React from 'react';

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
  const baseClass = variant === 'primary' ? 'neu-btn-primary' : 'neu-btn';
  const loadingClass = isLoading ? 'opacity-70 cursor-not-allowed' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button 
      className={`${baseClass} ${loadingClass} ${disabledClass} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
