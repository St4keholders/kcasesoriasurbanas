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
      <div className={`relative bg-[var(--bg-card)] rounded-2xl w-full ${maxWidthClass} flex flex-col max-h-[90vh] shadow-2xl border border-[var(--border)] animate-[modalSlideUp_0.4s_var(--ease-bounce)]`}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-xl text-[var(--fg)] font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--dim)] hover:bg-[var(--bg)] hover:text-rose-500 transition-all shrink-0"
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
