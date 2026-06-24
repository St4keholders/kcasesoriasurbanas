import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({ data, columns, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
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
          {data.length === 0 && (
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
        <div>Mostrando {data.length} registros</div>
        {/* Pagination mock para mantener el diseño visual del panel */}
        {data.length > 0 && (
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
