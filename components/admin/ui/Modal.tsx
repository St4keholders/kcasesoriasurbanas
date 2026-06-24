'use client';

import React, { useEffect } from 'react';
import { XIcon } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1a2d3d]/40 backdrop-blur-sm animate-[fadeIn_0.25s_var(--ease)]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-[var(--admin-bg)] rounded-[28px] w-full ${maxWidthClass} flex flex-col max-h-[90vh] shadow-[-12px_-12px_30px_var(--shadow-light),12px_12px_30px_var(--shadow-dark),0_30px_60px_rgba(26,45,61,0.2)] animate-[modalSlideUp_0.4s_var(--ease-bounce)]`}>
        <div className="flex items-start justify-between px-8 pt-8 pb-6">
          <h2 className="text-2xl text-[var(--fg)] font-[var(--font-display)] leading-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--dim)] neu-raised-sm hover:text-[var(--danger)] transition-all shrink-0"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-8 pb-8 overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="px-8 pb-8 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
