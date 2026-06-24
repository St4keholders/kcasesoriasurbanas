import React, { forwardRef } from 'react';

interface NeuInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const NeuInput = forwardRef<HTMLInputElement, NeuInputProps>(
  ({ className = '', error, label, ...props }, ref) => {
    return (
      <div className={`field ${className}`}>
        {label && <label className="field-label">{label}</label>}
        <input
          ref={ref}
          className={`input ${error ? 'border-rose-500' : ''}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);
NeuInput.displayName = 'NeuInput';

interface NeuTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const NeuTextarea = forwardRef<HTMLTextAreaElement, NeuTextareaProps>(
  ({ className = '', error, label, ...props }, ref) => {
    return (
      <div className={`field ${className}`}>
        {label && <label className="field-label">{label}</label>}
        <textarea
          ref={ref}
          className={`input resize-none ${error ? 'border-rose-500' : ''}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);
NeuTextarea.displayName = 'NeuTextarea';

interface NeuSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const NeuSelect = forwardRef<HTMLSelectElement, NeuSelectProps>(
  ({ className = '', error, label, children, ...props }, ref) => {
    return (
      <div className={`field ${className}`}>
        {label && <label className="field-label">{label}</label>}
        <div className="select-wrap">
          <select
            ref={ref}
            className={`input ${error ? 'border-rose-500' : ''}`}
            {...props}
          >
            {children}
          </select>
          <div className="select-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);
NeuSelect.displayName = 'NeuSelect';
