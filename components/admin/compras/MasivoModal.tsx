'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XIcon, UploadCloudIcon, CheckIcon, Loader2Icon, AlertTriangleIcon, SaveIcon, FileCode2Icon } from 'lucide-react';
import { uploadSupportDirect } from '@/lib/utils/client-storage';
import { extractInvoiceAction, saveInvoiceAction } from '@/app/admin/compras/actions';

type Option = { id: string; name: string };

type Status = 'subiendo' | 'leyendo' | 'listo' | 'guardando' | 'guardado' | 'error';

interface Fields {
  supplier_name: string;
  supplier_document: string;
  invoice_number: string;
  date: string;
  concept: string;
  category_id: string;
  cost_center_id: string;
  payment_method: string;
  base: number;
  iva: number;
  retencion: number;
  total: number;
  cufe: string;
}

interface Item {
  key: string;
  file: File;
  preview: string;
  status: Status;
  error?: string;
  warnings: string[];
  storagePath?: string;
  sha256?: string;
  savedNumber?: string | null;
  fields: Fields;
}

const STATUS_LABEL: Record<Status, string> = {
  subiendo: 'Subiendo…',
  leyendo: 'Leyendo con IA…',
  listo: 'Por verificar',
  guardando: 'Guardando…',
  guardado: 'Guardado',
  error: 'Error',
};

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export function MasivoModal({
  target,
  boxId,
  categories,
  costCenters,
  defaultCostCenterId = '',
  onClose,
}: {
  target: 'compras' | 'caja';
  boxId?: string;
  categories: Option[];
  costCenters: Option[];
  defaultCostCenterId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedAny = useRef(false);

  const patch = useCallback((key: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));
  }, []);
  const patchFields = (key: string, p: Partial<Fields>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, fields: { ...it.fields, ...p } } : it)));
  };

  const processOne = useCallback(
    async (it: Item) => {
      try {
        const up = await uploadSupportDirect(it.file, target === 'compras' ? 'compras' : 'caja-menor');
        patch(it.key, { status: 'leyendo', storagePath: up.storagePath, sha256: up.sha256 });
        const res = await extractInvoiceAction({
          storagePath: up.storagePath,
          mimeType: it.file.type,
          filename: it.file.name,
          sha256: up.sha256,
        });
        if (!res.ok) throw new Error(res.error);
        const d = res.data;
        setItems((prev) =>
          prev.map((x) =>
            x.key === it.key
              ? {
                  ...x,
                  status: 'listo',
                  warnings: d.warnings,
                  fields: {
                    ...x.fields,
                    supplier_name: d.supplier_name || '',
                    supplier_document: d.supplier_nit ? `${d.supplier_nit}${d.supplier_dv ? '-' + d.supplier_dv : ''}` : '',
                    invoice_number: d.invoice_number || '',
                    date: d.issue_date || '',
                    concept: d.concept || '',
                    category_id: d.category_id || x.fields.category_id,
                    cost_center_id: d.cost_center_id || x.fields.cost_center_id,
                    base: d.subtotal,
                    iva: d.tax_iva,
                    retencion: d.withholding_tax,
                    total: d.total,
                    cufe: d.cufe || '',
                  },
                }
              : x
          )
        );
      } catch (e) {
        patch(it.key, { status: 'error', error: e instanceof Error ? e.message : 'No se pudo procesar' });
      }
    },
    [patch, target]
  );

  const addFiles = (files: FileList | File[]) => {
    const otros = categories.find((c) => c.name === 'Otros')?.id || '';
    const fresh: Item[] = Array.from(files).map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'subiendo',
      warnings: [],
      fields: {
        supplier_name: '', supplier_document: '', invoice_number: '', date: '', concept: '',
        category_id: otros, cost_center_id: defaultCostCenterId, payment_method: 'transferencia',
        base: 0, iva: 0, retencion: 0, total: 0, cufe: '',
      },
    }));
    setItems((prev) => [...prev, ...fresh]);
    if (!selected && fresh[0]) setSelected(fresh[0].key);
    // Procesar de a 3 en paralelo
    (async () => {
      const queue = [...fresh];
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          const next = queue.shift();
          if (next) await processOne(next);
        }
      });
      await Promise.all(workers);
    })();
  };

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = items.find((i) => i.key === selected) || null;
  const pendingCount = items.filter((i) => i.status === 'listo').length;

  const save = async (it: Item) => {
    if (!it.storagePath) return;
    patch(it.key, { status: 'guardando', error: undefined });
    const f = it.fields;
    const res = await saveInvoiceAction({
      target,
      box_id: boxId || '',
      ...f,
      storagePath: it.storagePath,
      sha256: it.sha256 || '',
    });
    if (!res.ok) {
      patch(it.key, { status: 'listo', error: res.error });
      return false;
    }
    savedAny.current = true;
    patch(it.key, { status: 'guardado', savedNumber: res.data.number });
    return true;
  };

  const saveAndNext = async () => {
    if (!current) return;
    const ok = await save(current);
    if (ok) {
      const next = items.find((i) => i.key !== current.key && i.status === 'listo');
      if (next) setSelected(next.key);
    }
  };

  const close = () => {
    if (savedAny.current) router.refresh();
    onClose();
  };

  const isPdf = current?.file.type === 'application/pdf' || current?.file.name.toLowerCase().endsWith('.pdf');
  const isImg = current?.file.type.startsWith('image/');
  const totalCheck = useMemo(() => {
    if (!current) return 0;
    const f = current.fields;
    return Math.round(Number(f.base) + Number(f.iva) - Number(f.retencion) - Number(f.total));
  }, [current]);

  return (
    <div className="erp-overlay" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveAndNext(); }}>
      <div className="erp-sheet glass">
        <div className="erp-sheet-head">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Carga masiva de facturas</div>
            <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>
              La IA llena los campos. Verifica con la factura a la vista, escoge la categoría y guarda. Cada factura genera su causación y su egreso.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pendingCount > 0 && <span className="chip pend">{pendingCount} por verificar</span>}
            <button className="erp-btn ghost" onClick={close} aria-label="Cerrar"><XIcon /></button>
          </div>
        </div>

        <div className="erp-sheet-body">
          {/* Lista de archivos */}
          <div style={{ borderRight: '1px solid var(--border)' }}>
            <div className="erp-drop" onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}>
              <UploadCloudIcon style={{ width: 22, height: 22, margin: '0 auto 6px' }} />
              Arrastra o toca para agregar fotos, PDF, XML o ZIP
              <input ref={inputRef} type="file" multiple hidden accept="image/*,application/pdf,.pdf,.xml,.zip,text/xml,application/zip"
                onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            <div className="erp-list" style={{ maxHeight: 'none' }}>
              {items.map((it) => (
                <button key={it.key} className={it.key === selected ? 'active' : ''} onClick={() => setSelected(it.key)}>
                  <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.fields.supplier_name || it.file.name}
                  </div>
                  <div className="s">
                    <span className={`chip ${it.status === 'guardado' ? 'ok' : it.status === 'error' ? 'warn' : it.status === 'listo' ? 'pend' : 'info'}`}>
                      {(it.status === 'subiendo' || it.status === 'leyendo' || it.status === 'guardando') && <Loader2Icon className="animate-spin" style={{ width: 11, height: 11 }} />}
                      {it.status === 'guardado' ? `Guardado${it.savedNumber ? ' · ' + it.savedNumber : ''}` : STATUS_LABEL[it.status]}
                    </span>
                    <span>{it.fields.total ? fmt(it.fields.total) : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div style={{ background: '#f8fafc', display: 'flex' }}>
            {!current ? (
              <div className="erp-doc" style={{ flex: 1 }}><div className="empty">Agrega facturas para empezar.</div></div>
            ) : isImg ? (
              <img src={current.preview} alt="Factura" style={{ width: '100%', objectFit: 'contain' }} />
            ) : isPdf ? (
              <iframe src={current.preview} title="Factura" style={{ width: '100%', border: 0 }} />
            ) : (
              <div className="erp-doc" style={{ flex: 1 }}>
                <div className="empty"><div><FileCode2Icon style={{ width: 28, height: 28, margin: '0 auto 8px' }} />Factura electrónica (XML). Los datos se leyeron directamente del archivo.</div></div>
              </div>
            )}
          </div>

          {/* Formulario */}
          <div className="erp-form" style={{ borderLeft: '1px solid var(--border)' }}>
            {!current ? (
              <div style={{ color: 'var(--dim)', fontSize: 13 }}>Selecciona una factura de la lista.</div>
            ) : (
              <>
                {current.error && <div className="erp-alert error">{current.error}</div>}
                {current.warnings.map((w) => (
                  <div key={w} className="erp-alert"><AlertTriangleIcon style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />{w}</div>
                ))}
                {current.status === 'guardado' && <div className="erp-alert ok"><CheckIcon style={{ width: 13, height: 13, display: 'inline' }} /> Guardada con su causación y egreso.</div>}

                <fieldset disabled={current.status !== 'listo'} style={{ display: 'contents' }}>
                  <div className="erp-field">
                    <label>Categoría *</label>
                    <select className="erp-select" value={current.fields.category_id} onChange={(e) => patchFields(current.key, { category_id: e.target.value })}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="erp-grid">
                    <div className="erp-field full">
                      <label>Proveedor *</label>
                      <input className="erp-input" value={current.fields.supplier_name} onChange={(e) => patchFields(current.key, { supplier_name: e.target.value })} placeholder="Proveedor Ocasional si no aparece" />
                    </div>
                    <div className="erp-field">
                      <label>NIT / CC</label>
                      <input className="erp-input" value={current.fields.supplier_document} onChange={(e) => patchFields(current.key, { supplier_document: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Factura N.º</label>
                      <input className="erp-input" value={current.fields.invoice_number} onChange={(e) => patchFields(current.key, { invoice_number: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Fecha *</label>
                      <input type="date" className="erp-input" value={current.fields.date} onChange={(e) => patchFields(current.key, { date: e.target.value })} />
                    </div>
                    {target === 'compras' ? (
                      <div className="erp-field">
                        <label>Centro de costo</label>
                        <select className="erp-select" value={current.fields.cost_center_id} onChange={(e) => patchFields(current.key, { cost_center_id: e.target.value })}>
                          <option value="">Sin centro</option>
                          {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    ) : <div />}
                    <div className="erp-field full">
                      <label>Concepto *</label>
                      <input className="erp-input" value={current.fields.concept} onChange={(e) => patchFields(current.key, { concept: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Base</label>
                      <input type="number" className="erp-input" value={current.fields.base} onChange={(e) => patchFields(current.key, { base: Number(e.target.value) })} />
                    </div>
                    <div className="erp-field">
                      <label>IVA (de la factura)</label>
                      <input type="number" className="erp-input" value={current.fields.iva} onChange={(e) => patchFields(current.key, { iva: Number(e.target.value) })} />
                    </div>
                    <div className="erp-field">
                      <label>Retención (de la factura)</label>
                      <input type="number" className="erp-input" value={current.fields.retencion} onChange={(e) => patchFields(current.key, { retencion: Number(e.target.value) })} />
                    </div>
                    <div className="erp-field">
                      <label>Total pagado *</label>
                      <input type="number" className="erp-input" value={current.fields.total} onChange={(e) => patchFields(current.key, { total: Number(e.target.value) })} />
                    </div>
                    {target === 'compras' && (
                      <div className="erp-field full">
                        <label>Forma de pago</label>
                        <select className="erp-select" value={current.fields.payment_method} onChange={(e) => patchFields(current.key, { payment_method: e.target.value })}>
                          <option value="transferencia">Transferencia</option>
                          <option value="nequi">Nequi</option>
                          <option value="daviplata">Daviplata</option>
                          <option value="pse">PSE</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {totalCheck !== 0 && <div className="erp-alert">Base + IVA − retención = {fmt(Number(current.fields.base) + Number(current.fields.iva) - Number(current.fields.retencion))}; no coincide con el total.</div>}
                </fieldset>

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <button className="erp-btn primary" style={{ flex: 1, justifyContent: 'center' }} disabled={current.status !== 'listo'} onClick={saveAndNext}>
                    <SaveIcon /> Guardar y siguiente <span className="kbd" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}>Ctrl ↵</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
