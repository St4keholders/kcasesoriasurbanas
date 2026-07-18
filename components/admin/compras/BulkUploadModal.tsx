'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { XIcon, UploadCloudIcon, FileImageIcon, Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react';

import { Modal } from '@/components/admin/ui/Modal';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  costCenters?: any[];
}

export function BulkUploadModal({ onClose, onSuccess, costCenters = [] }: BulkUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    const results: any[] = [];
    setUploadResults([]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentProgress({ current: i + 1, total: files.length });

      const formData = new FormData();
      formData.append('files', file);
      if (selectedCostCenter) {
        formData.append('costCenterId', selectedCostCenter);
      }

      try {
        const res = await fetch('/api/compras/bulk-upload', {
          method: 'POST',
          body: formData,
        });

        let data;
        try {
          data = await res.json();
        } catch (e) {
          console.error('Error parsing JSON for file', file.name);
          results.push({
            fileName: file.name,
            status: 'error',
            error: 'Respuesta inválida del servidor'
          });
          setUploadResults([...results]);
          continue;
        }

        if (res.ok && data.results && data.results.length > 0) {
          results.push(data.results[0]);
        } else {
          results.push({
            fileName: file.name,
            status: 'error',
            error: data.error || 'Error en la carga masiva'
          });
        }
      } catch (error) {
        console.error('Network error for file', file.name, error);
        results.push({
          fileName: file.name,
          status: 'error',
          error: 'Error de red al intentar conectar'
        });
      }
      setUploadResults([...results]);
    }

    setCurrentProgress(null);
    setIsUploading(false);

    const hasSuccess = results.some(r => r.status === 'success');
    if (hasSuccess) {
      if (onSuccess) onSuccess();
      // Esperar un momento para recargar la página para que vean los resultados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Carga Masiva de Comprobantes" 
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-3 w-full pt-2">
          {uploadResults.length > 0 ? (
            <button 
              onClick={onClose}
              className="neu-btn-primary"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button 
                onClick={onClose}
                className="neu-btn-secondary"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="neu-btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    {currentProgress ? `Analizando (${currentProgress.current}/${currentProgress.total})...` : 'Subiendo y analizando con IA...'}
                  </>
                ) : (
                  <>
                    <UploadCloudIcon className="w-4 h-4" />
                    Subir {files.length > 0 && `(${files.length})`}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="w-full">
        <p className="text-sm text-[var(--dim)] mb-6 -mt-2">Sube múltiples facturas a Drive. Asegúrate de que el nombre del archivo sea el número de compra.</p>
        
        <div>
          {uploadResults.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium text-[var(--fg)] flex items-center gap-2">
                <CheckCircle2Icon className="w-5 h-5 text-emerald-500" /> Carga Completada
              </h3>
              <div className="grid gap-2">
                {uploadResults.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                    <div className="flex items-center gap-3">
                      {res.status === 'success' ? (
                        <CheckCircle2Icon className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircleIcon className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-sm font-medium text-[var(--fg)]">{res.fileName}</span>
                    </div>
                    {res.status === 'success' && res.link && (
                      <a href={res.link} target="_blank" rel="noreferrer" className="text-xs text-[var(--primary)] hover:underline">
                        Ver en Drive
                      </a>
                    )}
                    {res.status === 'error' && (
                      <span className="text-xs text-rose-500">{res.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div 
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                  isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--surface)]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                />
                <div className="bg-[var(--primary)]/10 p-4 rounded-full mb-4">
                  <UploadCloudIcon className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <p className="text-[var(--fg)] font-medium text-center">
                  Arrastra y suelta tus archivos aquí
                </p>
                <p className="text-[var(--dim)] text-sm text-center mt-2">
                  o haz clic para explorar tus archivos
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-[var(--fg)] mb-3">Archivos Seleccionados ({files.length})</h3>
                  <div className="grid gap-2 max-h-[30vh] overflow-y-auto pr-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileImageIcon className="w-5 h-5 text-[var(--dim)] shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium text-[var(--fg)] truncate">{file.name}</p>
                            <p className="text-xs text-[var(--dim)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFile(i)}
                          className="p-1.5 text-[var(--dim)] hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
                          title="Eliminar"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {costCenters && costCenters.length > 0 && (
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                        Centro de Costos (Aplica para todos)
                      </label>
                      <select 
                        className="neu-input w-full text-sm py-2"
                        value={selectedCostCenter}
                        onChange={(e) => setSelectedCostCenter(e.target.value)}
                        required
                      >
                        <option value="">-- Seleccionar --</option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
