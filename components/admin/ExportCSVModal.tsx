'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/admin/ui/Modal';
import { DownloadIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  title: string;
  filename: string;
  columnsMap: Record<string, string>; // Maps data key to CSV column name
  dateField: string; // The field to use for date filtering
}

export function ExportCSVModal({ isOpen, onClose, data, title, filename, columnsMap, dateField }: ExportCSVModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = () => {
    // Filter data by dates if provided
    let filteredData = data;
    if (dateFrom || dateTo) {
      filteredData = data.filter(item => {
        const itemDateStr = item[dateField];
        if (!itemDateStr) return false;
        
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

    // Map data to requested columns
    const exportData = filteredData.map(item => {
      const row: any = {};
      for (const [key, label] of Object.entries(columnsMap)) {
        // Handle nested properties like 'leads.full_name'
        let value = key.split('.').reduce((o, i) => (o ? o[i] : undefined), item);
        
        if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
        }
        row[label] = value;
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, `${filename}.csv`);
    
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button onClick={onClose} className="neu-btn-secondary">Cancelar</button>
          <button onClick={handleExport} className="neu-btn-primary flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      }
    >
      <div className="space-y-4 mt-4">
        <p className="text-sm text-[var(--dim)]">Selecciona el rango de fechas para la exportación.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1">Fecha Desde</label>
            <input 
              type="date" 
              className="neu-input w-full text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1">Fecha Hasta</label>
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
