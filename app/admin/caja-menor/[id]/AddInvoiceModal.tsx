'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XIcon, Loader2, UploadIcon, CameraIcon } from 'lucide-react';
import { uploadSupportDirect } from '@/lib/utils/client-storage';
import { createPettyCashEntryAction } from '../actions';
import { parseNitAndDv } from '@/lib/utils/nit';

export function AddInvoiceModal({ boxId, onClose }: { boxId: string; onClose: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nitWarning, setNitWarning] = useState<string | null>(null);

  const handleNitBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (!val) {
      setNitWarning(null);
      return;
    }
    const parsed = parseNitAndDv(val);
    if (!parsed.nit) {
      setNitWarning('El NIT o documento debe contener dígitos válidos.');
    } else if (val.includes('-') && !parsed.isValidDv) {
      setNitWarning(`Dígito de verificación no coincide (esperado: ${parsed.expectedDv}).`);
    } else {
      setNitWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setWarning(null);

    try {
      const formData = new FormData(e.currentTarget);
      const entry_date = String(formData.get('entry_date') || '');
      const supplier_name = String(formData.get('supplier_name') || '').trim();
      const supplier_document = String(formData.get('supplier_document') || '').trim();
      const invoice_number = String(formData.get('invoice_number') || '').trim();
      const concept = String(formData.get('concept') || '').trim();
      const tax_amount = parseFloat(String(formData.get('tax_amount') || '0')) || 0;
      const total_amount = parseFloat(String(formData.get('total_amount') || '0'));

      let receipt_url = '';
      let support_sha256 = '';
      let support_storage_path = '';

      if (selectedFile) {
        const uploaded = await uploadSupportDirect(selectedFile, 'caja-menor');
        receipt_url = uploaded.viewUrl;
        support_sha256 = uploaded.sha256;
        support_storage_path = uploaded.storagePath;
        if (uploaded.isDuplicate) {
          setWarning('Atención: este archivo coincide (SHA-256) con un soporte previamente cargado.');
        }
      }

      const result = await createPettyCashEntryAction({
        box_id: boxId,
        entry_type: 'egreso',
        entry_date,
        supplier_name,
        supplier_document,
        invoice_number,
        concept,
        tax_amount,
        total_amount,
        receipt_url,
        support_sha256,
        support_storage_path,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la factura';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-2xl bg-[var(--admin-bg)] relative max-h-[90vh] overflow-y-auto glass-panel">
        <button
          onClick={onClose}
          type="button"
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-2 text-[var(--dim)] hover:text-[var(--danger)] rounded-full transition-colors hover:bg-[var(--admin-bg-hover)]"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-[var(--fg)] mb-6">Añadir factura o gasto de caja menor</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {warning && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 text-sm">
            {warning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-group">
              <label className="label">Fecha</label>
              <input
                name="entry_date"
                type="date"
                required
                className="input"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label className="label">Número de factura / documento</label>
              <input
                name="invoice_number"
                type="text"
                className="input"
                placeholder="Ej. FE-1042"
              />
            </div>

            <div className="form-group md:col-span-2">
              <label className="label">Concepto</label>
              <input
                name="concept"
                type="text"
                required
                className="input"
                placeholder="Ej. Impresión de planos o papelería"
              />
            </div>

            <div className="form-group">
              <label className="label">Proveedor</label>
              <input
                name="supplier_name"
                type="text"
                required
                className="input"
                placeholder="Nombre o razón social"
              />
            </div>

            <div className="form-group">
              <label className="label">NIT / Documento</label>
              <input
                name="supplier_document"
                type="text"
                onBlur={handleNitBlur}
                className="input"
                placeholder="Ej. 890900608-9"
              />
              {nitWarning && <p className="text-xs text-amber-600 mt-1">{nitWarning}</p>}
            </div>

            <div className="form-group">
              <label className="label">Valor IVA (COP)</label>
              <input
                name="tax_amount"
                type="number"
                step="1"
                min="0"
                className="input"
                defaultValue="0"
              />
            </div>

            <div className="form-group">
              <label className="label">Valor total (COP)</label>
              <input
                name="total_amount"
                type="number"
                step="1"
                min="1"
                required
                className="input"
                placeholder="0"
              />
            </div>

            <div className="form-group md:col-span-2">
              <label className="label">Soporte (imagen, PDF, XML o ZIP)</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn btn-secondary cursor-pointer flex items-center gap-2 text-sm">
                  <UploadIcon className="w-4 h-4" />
                  <span>Seleccionar archivo</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,application/xml,text/xml,application/zip,.pdf,.xml,.zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                <label className="btn btn-ghost cursor-pointer flex items-center gap-2 text-sm">
                  <CameraIcon className="w-4 h-4" />
                  <span>Tomar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {selectedFile && (
                  <span className="text-xs text-[var(--fg-soft)] font-mono truncate max-w-xs">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--shadow-dark)]">
            <button
              type="button"
              onClick={onClose}
              className="neu-btn flex-1 text-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="neu-btn-primary flex-1 justify-center flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...
                </>
              ) : (
                'Guardar factura'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
