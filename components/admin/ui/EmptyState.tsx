import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-[#a8c4d9]/40 rounded-xl border-dashed">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#f7fbff] flex items-center justify-center text-[#7a99b5] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[#1a2d3d] mb-1">{title}</h3>
      <p className="text-sm text-[#7a99b5] text-center max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
