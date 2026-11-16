'use client';

import React, { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { uploadSupportDirect } from '@/lib/utils/client-storage';
import {
  processUploadedIngestionAction,
  approveOrCorrectIngestionAction,
} from '@/app/admin/ingesta/actions';
import { formatCOP } from '@/lib/utils/money';
import { calculateDianDv, normalizeNitDigits } from '@/lib/utils/nit';
import { useRouter } from 'next/navigation';
import {
  UploadCloudIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  FileTextIcon,
} from 'lucide-react';
import type { Database } from '@/types/database';

type IngestionRow = Database['public']['Tables']['document_ingestions']['Row'];

export function IngestaClientView({
  ingestions,
  accounts,
  costCenters,
}: {
  ingestions: IngestionRow[];
  accounts: Array<{ code: string; name: string; account_class: number }>;
  costCenters: Array<{ id: string; name: string; accounting_class: number }>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(ingestions[0]?.id || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedDoc = ingestions.find((i) => i.id === selectedId) || ingestions[0] || null;

  const [formState, setFormState] = useState(() => ({
    supplier_name: selectedDoc?.supplier_name || 'Proveedor Ocasional',
    supplier_nit: selectedDoc?.supplier_nit || '',
    supplier_dv: selectedDoc?.supplier_dv || '',
    invoice_number: selectedDoc?.invoice_number || '',
    issue_date: selectedDoc?.issue_date || '2026-06-15',
    cost_center_id: selectedDoc?.cost_center_id || '',
    concept: selectedDoc?.concept || '',
    subtotal: Number(selectedDoc?.subtotal || 0),
    tax_iva: Number(selectedDoc?.tax_iva || 0),
    withholding_tax: Number(selectedDoc?.withholding_tax || 0),
    total: Number(selectedDoc?.total || 0),
    suggested_account_code: selectedDoc?.suggested_account_code || '519595',
  }));

  const handleSelectDoc = (doc: IngestionRow) => {
    setSelectedId(doc.id);
    setFormState({
      supplier_name: doc.supplier_name || 'Proveedor Ocasional',
      supplier_nit: doc.supplier_nit || '',
      supplier_dv: doc.supplier_dv || '',
      invoice_number: doc.invoice_number || '',
      issue_date: doc.issue_date || '2026-06-15',
      cost_center_id: doc.cost_center_id || '',
      concept: doc.concept || '',
      subtotal: Number(doc.subtotal || 0),
      tax_iva: Number(doc.tax_iva || 0),
      withholding_tax: Number(doc.withholding_tax || 0),
      total: Number(doc.total || 0),
      suggested_account_code: doc.suggested_account_code || '519595',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      let rawTextOrXml: string | null = null;
      if (file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')) {
        rawTextOrXml = await file.text();
      }

      const uploaded = await uploadSupportDirect(file, 'ingesta');
      const res = await processUploadedIngestionAction({
        storagePath: uploaded.storagePath,
        sha256: uploaded.sha256,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        costCenterId: formState.cost_center_id || null,
        rawTextOrXml,
      });

      if (!res.ok) {
        throw new Error(res.error);
      }

      setFeedback(`Documento ${file.name} procesado y clasificado.`);
      setSelectedId(res.data.id);
      handleSelectDoc(res.data);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error procesando documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveOrCorrect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setIsSaving(true);
    setErrorMsg(null);
    setFeedback(null);

    const res = await approveOrCorrectIngestionAction({
      id: selectedDoc.id,
      ...formState,
    });

    setIsSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setFeedback('Documento aprobado y comprobantes CC + CE en borrador actualizados.');
    router.refresh();
  };

  const isLowConfidence = selectedDoc ? Number(selectedDoc.confidence) < 0.85 : false;
  const viewUrl = selectedDoc
    ? `/api/soportes/view?path=${encodeURIComponent(selectedDoc.storage_path)}`
    : null;

  return (
    <>
      <AdminTopbar
        eyebrow="— CONTABILIDAD · INGESTA INTELIGENTE (6B)"
        title={
          <span>
            Bandeja de <em>lectura de facturas</em>
          </span>
        }
        subtitle="Lectura directa de XML/ZIP DIAN (CUFE, NIT+DV, base, IVA, retenciones), PDF e imágenes, con validación tributaria y sugerencia de cuenta PUC."
        action={
          <label className="btn btn-primary cursor-pointer flex items-center gap-2 text-sm">
            <UploadCloudIcon className="w-4 h-4" />
            <span>{isUploading ? 'Procesando...' : 'Cargar factura (XML, ZIP, PDF o imagen)'}</span>
            <input
              type="file"
              accept=".xml,.zip,.pdf,image/*,application/pdf,application/xml,text/xml,application/zip"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        }
      />

      {feedback && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-800 text-sm">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Lista superior de documentos en bandeja */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
        {ingestions.map((doc) => {
          const active = doc.id === selectedDoc?.id;
          const low = Number(doc.confidence) < 0.85 || (doc.warnings || []).length > 0;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleSelectDoc(doc)}
              className={`px-4 py-2.5 rounded-2xl border text-left shrink-0 transition-all ${
                active
                  ? 'glass-panel border-[var(--sky-deep)] shadow-md'
                  : 'bg-white/60 border-[var(--border)] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)]">
                <FileTextIcon className="w-3.5 h-3.5 text-[var(--sky-deep)]" />
                <span>{doc.invoice_number || doc.storage_path.split('/').pop()}</span>
                {low && <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <div className="text-[11px] text-[var(--dim)] mt-0.5">
                {doc.supplier_name || 'Proveedor Ocasional'} · {formatCOP(Number(doc.total))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDoc ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Izquierda: Visor del documento */}
          <div className="card glass-panel p-4 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--fg)]">
                  Vista previa del soporte
                </h3>
                <p className="text-xs font-mono text-[var(--dim)]">
                  SHA-256: {selectedDoc.sha256.slice(0, 20)}...
                </p>
              </div>
              {viewUrl && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary text-xs"
                >
                  Abrir en pestaña nueva
                </a>
              )}
            </div>

            {viewUrl ? (
              <iframe
                src={viewUrl}
                title="Visor de soporte documental"
                className="w-full flex-1 rounded-xl border border-[var(--border)] bg-white"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--dim)]">
                Sin vista previa disponible
              </div>
            )}
          </div>

          {/* Derecha: Campos extraídos, advertencias y cuenta sugerida */}
          <form
            onSubmit={handleApproveOrCorrect}
            className="card glass-panel p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--fg)]">
                  Datos extraídos y clasificación contable
                </h3>
                <p className="text-xs text-[var(--dim)]">
                  Confianza: <strong>{Math.round(Number(selectedDoc.confidence) * 100)}%</strong> · Estado:{' '}
                  <strong className="uppercase">{selectedDoc.status}</strong>
                </p>
              </div>
              {selectedDoc.cufe && (
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-800"
                  title={selectedDoc.cufe}
                >
                  CUFE DIAN Verificado
                </span>
              )}
            </div>

            {(selectedDoc.warnings || []).length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-1">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-4 h-4" />
                  Advertencias detectadas ({selectedDoc.warnings.length}):
                </div>
                <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                  {selectedDoc.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="label text-xs">Proveedor / Emisor (excluido NIT KC)</label>
                <input
                  type="text"
                  value={formState.supplier_name}
                  onChange={(e) =>
                    setFormState({ ...formState, supplier_name: e.target.value })
                  }
                  className={`input w-full text-sm ${
                    formState.supplier_name === 'Proveedor Ocasional'
                      ? 'border-amber-500 bg-amber-50/40'
                      : ''
                  }`}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="label text-xs">NIT</label>
                  <input
                    type="text"
                    value={formState.supplier_nit}
                    onChange={(e) => {
                      const clean = normalizeNitDigits(e.target.value);
                      const dv = calculateDianDv(clean);
                      setFormState({
                        ...formState,
                        supplier_nit: clean,
                        supplier_dv: dv !== null ? String(dv) : formState.supplier_dv,
                      });
                    }}
                    className={`input w-full text-sm font-mono ${
                      !formState.supplier_nit ? 'border-amber-500 bg-amber-50/40' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="label text-xs">DV</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formState.supplier_dv}
                    onChange={(e) =>
                      setFormState({ ...formState, supplier_dv: e.target.value })
                    }
                    className="input w-full text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Número de factura</label>
                <input
                  type="text"
                  value={formState.invoice_number}
                  onChange={(e) =>
                    setFormState({ ...formState, invoice_number: e.target.value })
                  }
                  className="input w-full text-sm font-mono"
                />
              </div>
              <div>
                <label className="label text-xs">Fecha de emisión (2026)</label>
                <input
                  type="date"
                  value={formState.issue_date}
                  onChange={(e) =>
                    setFormState({ ...formState, issue_date: e.target.value })
                  }
                  className="input w-full text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Centro de costo</label>
                <select
                  value={formState.cost_center_id}
                  onChange={(e) =>
                    setFormState({ ...formState, cost_center_id: e.target.value })
                  }
                  className="input w-full text-sm"
                >
                  <option value="">Medellín (Clase 5)</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} (Clase {cc.accounting_class})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="label text-xs">Concepto / Detalle</label>
                <input
                  type="text"
                  value={formState.concept}
                  onChange={(e) => setFormState({ ...formState, concept: e.target.value })}
                  className="input w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Base / Subtotal (COP)</label>
                <input
                  type="number"
                  value={formState.subtotal}
                  onChange={(e) => {
                    const sub = Number(e.target.value) || 0;
                    setFormState({
                      ...formState,
                      subtotal: sub,
                      total: Math.max(0, sub + formState.tax_iva - formState.withholding_tax),
                    });
                  }}
                  className="input w-full text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">IVA (COP)</label>
                <input
                  type="number"
                  value={formState.tax_iva}
                  onChange={(e) => {
                    const iva = Number(e.target.value) || 0;
                    setFormState({
                      ...formState,
                      tax_iva: iva,
                      total: Math.max(0, formState.subtotal + iva - formState.withholding_tax),
                    });
                  }}
                  className="input w-full text-sm font-mono"
                />
              </div>
              <div>
                <label className="label text-xs">Retenciones (COP)</label>
                <input
                  type="number"
                  value={formState.withholding_tax}
                  onChange={(e) => {
                    const ret = Number(e.target.value) || 0;
                    setFormState({
                      ...formState,
                      withholding_tax: ret,
                      total: Math.max(0, formState.subtotal + formState.tax_iva - ret),
                    });
                  }}
                  className="input w-full text-sm font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label text-xs">
                  Subcuenta PUC sugerida por Clasificador 6A
                </label>
                <select
                  value={formState.suggested_account_code}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      suggested_account_code: e.target.value,
                    })
                  }
                  className={`input w-full text-sm font-mono ${
                    isLowConfidence ? 'border-amber-500 bg-amber-50/40' : ''
                  }`}
                >
                  {accounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Total Factura (COP)</label>
                <input
                  type="number"
                  value={formState.total}
                  onChange={(e) =>
                    setFormState({ ...formState, total: Number(e.target.value) || 0 })
                  }
                  className={`input w-full text-sm font-mono font-bold ${
                    formState.total <= 0 ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary flex items-center gap-2"
              >
                <CheckCircle2Icon className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Aprobar / Corregir y generar CC + CE'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card glass-panel p-12 text-center space-y-3">
          <p className="text-base font-medium text-[var(--fg)]">
            No hay documentos en la bandeja de ingesta todavía.
          </p>
          <p className="text-sm text-[var(--dim)]">
            Carga una factura electrónica DIAN (XML o ZIP), PDF o imagen usando el botón superior para extraer sus datos y generar la compra + CC + CE en borrador.
          </p>
        </div>
      )}
    </>
  );
}
