'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortAccessor?: (row: T) => any;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({ data, columns, keyExtractor }: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDesc, setSortDesc] = useState<boolean>(false);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      if (sortDesc) {
        setSortCol(null);
        setSortDesc(false);
      } else {
        setSortDesc(true);
      }
    } else {
      setSortCol(colIndex);
      setSortDesc(false);
    }
  };

  const sortedData = useMemo(() => {
    if (sortCol === null) return data;
    const col = columns[sortCol];
    if (!col) return data;

    return [...data].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (col.sortAccessor) {
        valA = col.sortAccessor(a);
        valB = col.sortAccessor(b);
      } else if (typeof col.accessor === 'string' || typeof col.accessor === 'number') {
        valA = a[col.accessor as keyof T];
        valB = b[col.accessor as keyof T];
      }

      // Handle nulls
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDesc ? -cmp : cmp;
      }
      
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, columns, sortCol, sortDesc]);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => {
              const isSortable = col.sortable !== false && (col.sortAccessor || typeof col.accessor !== 'function');
              
              return (
                <th 
                  key={i} 
                  onClick={() => isSortable && handleSort(i)}
                  className={isSortable ? "cursor-pointer hover:bg-[var(--bg)] transition-colors group select-none" : ""}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {isSortable && (
                      <div className="flex flex-col text-[var(--dim)] opacity-40 group-hover:opacity-100 transition-opacity">
                        {sortCol === i ? (
                          sortDesc ? <ChevronDownIcon className="w-3 h-3 text-[var(--primary)]" /> : <ChevronUpIcon className="w-3 h-3 text-[var(--primary)]" />
                        ) : (
                          <div className="w-3 h-3 flex flex-col justify-center items-center">
                            <ChevronUpIcon className="w-2.5 h-2.5 -mb-1" />
                            <ChevronDownIcon className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={keyExtractor(row)}>
              {columns.map((col, i) => (
                <td key={i}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <h3 className="empty-title">Sin <em>resultados</em></h3>
                  <p className="empty-sub">No encontramos registros que coincidan con la búsqueda o los filtros aplicados.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="table-footer">
        <div>Mostrando {sortedData.length} registros</div>
        {/* Pagination mock para mantener el diseño visual del panel */}
        {sortedData.length > 0 && (
          <div className="pager">
            <button>&lt;</button>
            <button className="active">1</button>
            <button>&gt;</button>
          </div>
        )}
      </div>
    </div>
  );
}
