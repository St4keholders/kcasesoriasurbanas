'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Supplier {
  id: string;
  name: string;
  document_number: string | null;
}

interface SupplierAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  error?: string;
  defaultSupplier?: Supplier | null;
}

export function SupplierAutocomplete({
  onChange,
  onInputChange,
  error,
  defaultSupplier,
}: SupplierAutocompleteProps) {
  const [query, setQuery] = useState(defaultSupplier ? defaultSupplier.name : '');
  const [debouncedQuery] = useDebounce(query, 250);
  const [options, setOptions] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function runSearch() {
      if (debouncedQuery.trim().length < 2) {
        setOptions([]);
        return;
      }
      setIsLoading(true);
      const { data } = await supabase.rpc('search_suppliers_smart', {
        p_query: debouncedQuery.trim(),
        p_limit: 8,
      });

      setOptions(data || []);
      setIsLoading(false);
    }

    runSearch();
  }, [debouncedQuery, supabase]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          onChange('');
          if (onInputChange) onInputChange(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar proveedor por NIT o nombre..."
        className={`input w-full ${error ? 'border-rose-500' : ''}`}
      />
      {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}

      {isOpen && (query.length >= 2 || options.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#a8c4d9]/50 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-[#7a99b5]">Buscando...</div>
          ) : options.length > 0 ? (
            <ul>
              {options.map((supplier) => (
                <li
                  key={supplier.id}
                  onClick={() => {
                    setQuery(supplier.name);
                    onChange(supplier.id);
                    if (onInputChange) onInputChange(supplier.name);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-[#f7fbff] cursor-pointer text-sm"
                >
                  <div className="font-medium text-[#1a2d3d]">{supplier.name}</div>
                  {supplier.document_number && (
                    <div className="text-xs text-[#7a99b5] font-mono">
                      NIT: {supplier.document_number}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-[#7a99b5]">
              No se encontraron coincidencias; se registrará como nuevo tercero.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
