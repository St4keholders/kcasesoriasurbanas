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
    <div className="overflow-x-auto bg-white rounded-lg border border-[#a8c4d9]/40">
      <table className="w-full text-left text-sm text-[#3d5a73]">
        <thead className="bg-[#f7fbff] text-[#1a2d3d] border-b border-[#a8c4d9]/40">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#a8c4d9]/40">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-[#f7fbff]/50 transition-colors">
              {columns.map((col, i) => (
                <td key={i} className="px-6 py-4">
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-[#7a99b5]">
                No hay resultados para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
