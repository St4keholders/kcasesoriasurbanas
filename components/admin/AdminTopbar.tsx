import React from 'react';
import { SearchIcon } from 'lucide-react';

interface AdminTopbarProps {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  eyebrow?: string;
}

export function AdminTopbar({ title, subtitle, action, searchPlaceholder, onSearch, eyebrow }: AdminTopbarProps) {
  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        <div className="page-actions">
          {action}
        </div>
      </div>
      
      {onSearch && (
        <div className="table-toolbar">
          <div className="search-input">
            <SearchIcon />
            <input 
              type="text" 
              className="input"
              placeholder={searchPlaceholder || "Buscar..."} 
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
