'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Lead {
  id: string;
  full_name: string;
  document_number: string | null;
}

interface LeadAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  error?: string;
  defaultLead?: Lead | null;
}

export function LeadAutocomplete({ value, onChange, onInputChange, error, defaultLead }: LeadAutocompleteProps) {
  const [query, setQuery] = useState(defaultLead ? defaultLead.full_name : '');
  const [debouncedQuery] = useDebounce(query, 300);
  const [options, setOptions] = useState<Lead[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function searchLeads() {
      if (debouncedQuery.length < 2) {
        setOptions([]);
        return;
      }
      setIsLoading(true);
      const { data } = await supabase
        .from('leads')
        .select('id, full_name, document_number')
        .ilike('full_name', `%${debouncedQuery}%`)
        .limit(5);
      
      setOptions(data || []);
      setIsLoading(false);
    }
    
    searchLeads();
  }, [debouncedQuery, supabase]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          onChange(''); // Reset selected ID when typing
          if (onInputChange) onInputChange(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar cliente por nombre..."
        className={`neu-input w-full ${error ? 'border-rose-500' : ''}`}
      />
      {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
      
      {isOpen && (query.length >= 2 || options.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#a8c4d9]/50 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-[#7a99b5]">Buscando...</div>
          ) : options.length > 0 ? (
            <ul>
              {options.map((lead) => (
                <li
                  key={lead.id}
                  onClick={() => {
                    setQuery(lead.full_name);
                    onChange(lead.id);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-[#f7fbff] cursor-pointer text-sm"
                >
                  <div className="font-medium text-[#1a2d3d]">{lead.full_name}</div>
                  {lead.document_number && <div className="text-xs text-[#7a99b5]">CC: {lead.document_number}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-[#7a99b5]">No se encontraron clientes.</div>
          )}
        </div>
      )}
    </div>
  );
}
