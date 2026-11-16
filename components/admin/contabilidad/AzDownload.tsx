'use client';

import React, { useState } from 'react';
import { ArchiveIcon, Loader2Icon, XIcon } from 'lucide-react';

export function AzDownload({ from, to }: { from: string; to: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ count: number; lots: number; size: number } | null>(null);
  const [approved, setApproved] = useState(false);
  const [supports, setSupports] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async (onlyApproved: boolean) => {
    setLoading(true);
    const res = await fetch(`/api/contabilidad/az/pdf?count=1&from=${from}&to=${to}&size=40${onlyApproved ? '&approved=1' : ''}`);
    const json = await res.json();
    setInfo(json.ok ? json.data : null);
    setLoading(false);
  };

  return (
    <>
      <button className="erp-btn primary" onClick={() => { setOpen(true); load(approved); }}><ArchiveIcon /> Descargar AZ</button>
      {open && (
        <div className="erp-overlay" onClick={() => setOpen(false)}>
          <div className="glass" style={{ margin: 'auto', width: 'min(520px, 100%)', padding: 18 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Archivo AZ</div>
              <button className="erp-btn ghost sm" onClick={() => setOpen(false)}><XIcon /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--dim)', margin: '6px 0 12px' }}>
              Del {from} al {to}. Cada lote trae portada con firmas e índice, y una hoja por operación (causación + egreso) con su soporte.
            </p>
            <div style={{ display: 'flex', gap: 14, fontSize: 13, marginBottom: 12 }}>
              <label><input type="checkbox" checked={approved} onChange={(e) => { setApproved(e.target.checked); load(e.target.checked); }} /> Solo aprobados</label>
              <label><input type="checkbox" checked={supports} onChange={(e) => setSupports(e.target.checked)} /> Incluir soportes</label>
            </div>
            {loading || !info ? (
              <Loader2Icon className="animate-spin" />
            ) : info.count === 0 ? (
              <div className="erp-alert">No hay operaciones en este rango.</div>
            ) : (
              <>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{info.count} operaciones · {info.lots} lote(s) de hasta {info.size}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 260, overflow: 'auto' }}>
                  {Array.from({ length: info.lots }, (_, i) => (
                    <a key={i} className="erp-btn sm" href={`/api/contabilidad/az/pdf?from=${from}&to=${to}&size=${info.size}&lot=${i + 1}${approved ? '&approved=1' : ''}${supports ? '' : '&supports=0'}`}>
                      Lote {i + 1}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
