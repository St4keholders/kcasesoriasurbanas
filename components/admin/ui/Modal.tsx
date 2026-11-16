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

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
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
      <div
        className="absolute inset-0 bg-[#142433]/35 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative glass-panel rounded-2xl w-full ${maxWidthClass} flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-xl text-[var(--fg)] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--dim)] hover:bg-[var(--bg)] hover:text-rose-600 transition-all shrink-0"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-3 border-t border-[var(--border)]">{footer}</div>
        )}
      </div>
    </div>
  );
}
