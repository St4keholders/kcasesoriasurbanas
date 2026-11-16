'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/admin/ui/Modal';
import { DownloadIcon } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, unknown>[];
  title: string;
  filename: string;
  columnsMap: Record<string, string>;
  dateField: string;
}

export function ExportCSVModal({
  isOpen,
  onClose,
  data,
  title,
  filename,
  columnsMap,
  dateField,
}: ExportCSVModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = async () => {
    let filteredData = data;
    if (dateFrom || dateTo) {
      filteredData = data.filter((item) => {
        const itemDateStr = item[dateField];
        if (!itemDateStr || typeof itemDateStr !== 'string') return false;

        const itemDate = new Date(itemDateStr);
        let valid = true;

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) valid = false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) valid = false;
        }

        return valid;
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    const headers = Object.values(columnsMap);
    worksheet.addRow(headers);

    for (const item of filteredData) {
      const rowValues: (string | number | boolean | null)[] = [];
      for (const key of Object.keys(columnsMap)) {
        const value = key.split('.').reduce<unknown>((o, i) => {
          if (o && typeof o === 'object' && i in (o as Record<string, unknown>)) {
            return (o as Record<string, unknown>)[i];
          }
          return undefined;
        }, item);

        if (value === null || value === undefined) {
          rowValues.push('');
        } else if (typeof value === 'object') {
          rowValues.push(JSON.stringify(value));
        } else if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          rowValues.push(value);
        } else {
          rowValues.push(String(value));
        }
      }
      worksheet.addRow(rowValues);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button onClick={onClose} className="neu-btn-secondary">
            Cancelar
          </button>
          <button onClick={handleExport} className="neu-btn-primary flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      }
    >
      <div className="space-y-4 mt-4">
        <p className="text-sm text-[var(--dim)]">
          Selecciona el rango de fechas para la exportación.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1">
              Fecha desde
            </label>
            <input
              type="date"
              className="neu-input w-full text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1">
              Fecha hasta
            </label>
            <input
              type="date"
              className="neu-input w-full text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
