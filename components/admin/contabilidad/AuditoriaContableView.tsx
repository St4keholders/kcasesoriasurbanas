'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckIcon, BanIcon, FileTextIcon, SaveIcon, Loader2Icon, SearchIcon, HistoryIcon, ExternalLinkIcon } from 'lucide-react';
import {
  approveOperationsAction,
  getOperationAction,
  updateOperationAction,
  voidOperationAction,
} from '@/app/admin/contabilidad/actions';

type Option = { id: string; name: string };
type Row = {
  source_table: 'purchases' | 'petty_cash_entries' | 'sales';
  source_id: string;
  fecha: string;
  cc_number: string | null;
  ce_number: string | null;
  estado: 'pendiente' | 'aprobado' | 'anulado';
  tercero: string;
  concepto: string;
  categoria: string | null;
  category_id: string | null;
  centro_costo: string | null;
  cost_center_id: string | null;
  total: number;
  posible_duplicado: boolean;
  sin_soporte: boolean;
  fecha_revisar: boolean;
  descuadrado: boolean;
};

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fdate = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m) - 1]} ${y}`;
};
const key = (r: { source_table: string; source_id: string }) => `${r.source_table}:${r.source_id}`;

const TABS = [
  { id: 'pendiente', label: 'Por revisar' },
  { id: 'duplicados', label: 'Posibles duplicados' },
  { id: 'sin_soporte', label: 'Sin soporte' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'anulado', label: 'Anulados' },
  { id: 'todos', label: 'Todos' },
] as const;

type Detail = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function AuditoriaContableView({
  rows,
  categories,
  costCenters,
  canApprove,
}: {
  rows: Row[];
  categories: Option[];
  costCenters: Option[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pendiente');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [center, setCenter] = useState('');
  const [local, setLocal] = useState<Record<string, Partial<Row>>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const [busy, startBusy] = useTransition();

  const data = useMemo(() => rows.map((r) => ({ ...r, ...(local[key(r)] || {}) })) as Row[], [rows, local]);

  const counts = useMemo(() => ({
    pendiente: data.filter((r) => r.estado === 'pendiente').length,
    duplicados: data.filter((r) => r.posible_duplicado && r.estado !== 'anulado').length,
    sin_soporte: data.filter((r) => r.sin_soporte && r.estado !== 'anulado').length,
    aprobado: data.filter((r) => r.estado === 'aprobado').length,
    anulado: data.filter((r) => r.estado === 'anulado').length,
    todos: data.length,
  }), [data]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((r) => {
      if (tab === 'pendiente' && r.estado !== 'pendiente') return false;
      if (tab === 'aprobado' && r.estado !== 'aprobado') return false;
      if (tab === 'anulado' && r.estado !== 'anulado') return false;
      if (tab === 'duplicados' && !(r.posible_duplicado && r.estado !== 'anulado')) return false;
      if (tab === 'sin_soporte' && !(r.sin_soporte && r.estado !== 'anulado')) return false;
      if (cat && r.category_id !== cat) return false;
      if (center && r.cost_center_id !== center) return false;
      if (term && !`${r.tercero} ${r.concepto} ${r.cc_number} ${r.ce_number}`.toLowerCase().includes(term)) return false;
      return true;
    }).sort((a, b) => (tab === 'duplicados'
      ? `${a.tercero.toLowerCase()}${a.fecha}${a.total}`.localeCompare(`${b.tercero.toLowerCase()}${b.fecha}${b.total}`)
      : String(a.cc_number || a.ce_number).localeCompare(String(b.cc_number || b.ce_number))));
  }, [data, tab, q, cat, center]);

  const effSel = sel && list.some((r) => key(r) === sel) ? sel : list[0] ? key(list[0]) : null;
  const current = list.find((r) => key(r) === effSel) || null;

  const load = useCallback(async (r: Row) => {
    setLoading(true);
    setMsg(null);
    const res = await getOperationAction({ source_table: r.source_table, source_id: r.source_id });
    setLoading(false);
    if (!res.ok) { setMsg({ t: 'error', m: res.error }); return; }
    const d = res.data;
    setDetail(d);
    setForm({
      date: d.date,
      supplier_name: d.supplier_name,
      supplier_document: d.supplier_doc || '',
      concept: d.concept,
      category_id: d.category_id || '',
      cost_center_id: d.cost_center_id || '',
      invoice_number: d.invoice_number || '',
      base: d.base,
      iva: d.iva,
      retencion: d.withholding,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (current) load(current);
      else { setDetail(null); setForm(null); }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effSel]);

  const move = (dir: 1 | -1) => {
    const idx = list.findIndex((r) => key(r) === effSel);
    const next = list[Math.min(list.length - 1, Math.max(0, idx + dir))];
    if (next) setSel(key(next));
  };

  const nextAfter = (k: string) => {
    const idx = list.findIndex((r) => key(r) === k);
    const next = list[idx + 1] || list[idx - 1];
    return next ? key(next) : null;
  };

  const approve = () => {
    if (!current || !canApprove || current.estado !== 'pendiente') return;
    const k = key(current);
    startBusy(async () => {
      const res = await approveOperationsAction({ items: [{ source_table: current.source_table, source_id: current.source_id }] });
      if (!res.ok) { setMsg({ t: 'error', m: res.error }); return; }
      setLocal((p) => ({ ...p, [k]: { ...(p[k] || {}), estado: 'aprobado' } }));
      setMsg({ t: 'ok', m: 'Aprobado y bloqueado.' });
      if (tab === 'pendiente' || tab === 'duplicados' || tab === 'sin_soporte') setSel(nextAfter(k));
    });
  };

  const save = () => {
    if (!current || !form) return;
    startBusy(async () => {
      const res = await updateOperationAction({ source_table: current.source_table, source_id: current.source_id, ...form });
      if (!res.ok) { setMsg({ t: 'error', m: res.error }); return; }
      const catName = categories.find((c) => c.id === form.category_id)?.name || null;
      const ccName = costCenters.find((c) => c.id === form.cost_center_id)?.name || null;
      setLocal((p) => ({
        ...p,
        [key(current)]: { ...(p[key(current)] || {}), fecha: form.date, tercero: form.supplier_name, concepto: form.concept, categoria: catName, category_id: form.category_id, centro_costo: ccName, cost_center_id: form.cost_center_id, total: Number(form.base) + Number(form.iva) - Number(form.retencion) },
      }));
      setMsg({ t: 'ok', m: 'Corrección guardada: el CC y el CE se actualizaron.' });
      await load(current);
    });
  };

  const annul = () => {
    if (!current || !canApprove) return;
    const reason = window.prompt('Motivo de la anulación:', current.posible_duplicado ? 'Registro duplicado' : '');
    if (!reason?.trim()) return;
    const k = key(current);
    startBusy(async () => {
      const res = await voidOperationAction({ source_table: current.source_table, source_id: current.source_id, reason: reason.trim() });
      if (!res.ok) { setMsg({ t: 'error', m: res.error }); return; }
      setLocal((p) => ({ ...p, [k]: { ...(p[k] || {}), estado: 'anulado' } }));
      setMsg({ t: 'ok', m: 'Operación anulada.' });
      setSel(nextAfter(k));
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); move(-1); }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); approve(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const duplicates = useMemo(() => {
    if (!current?.posible_duplicado) return [];
    const t = current.tercero.toLowerCase().replace(/\s+/g, ' ');
    return data.filter((r) => key(r) !== key(current) && r.estado !== 'anulado' && r.fecha === current.fecha && Number(r.total) === Number(current.total) && r.tercero.toLowerCase().replace(/\s+/g, ' ') === t);
  }, [current, data]);

  const locked = current?.estado !== 'pendiente';
  const setF = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  return (
    <div className="erp">
      <div className="erp-head">
        <div>
          <div className="eyebrow">Contabilidad</div>
          <h1>Auditoría <em>contable</em></h1>
          <p>Segunda revisión de cada pago. Corrige si hace falta y aprueba: el comprobante queda bloqueado.</p>
        </div>
        <div className="erp-actions">
          <span style={{ fontSize: 12, color: 'var(--dim)', alignSelf: 'center' }}>
            <span className="kbd">↑</span> <span className="kbd">↓</span> moverse · <span className="kbd">A</span> aprobar · <span className="kbd">Ctrl ↵</span> guardar
          </span>
          {canApprove && <Link className="erp-btn" href="/admin/contabilidad/auditoria/historial"><HistoryIcon /> Historial de cambios</Link>}
        </div>
      </div>

      <div className="erp-toolbar glass">
        <div className="erp-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`erp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setSel(null); }}>
              {t.label} <span className="count">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="grow" />
        <div style={{ position: 'relative' }}>
          <SearchIcon style={{ position: 'absolute', left: 9, top: 9, width: 15, height: 15, color: 'var(--dim)' }} />
          <input className="erp-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Buscar" value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
        </div>
        <select className="erp-select" value={cat} onChange={(e) => { setCat(e.target.value); setSel(null); }}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="erp-select" value={center} onChange={(e) => { setCenter(e.target.value); setSel(null); }}>
          <option value="">Todos los centros</option>
          {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="erp-split">
        <div className="glass erp-list">
          {list.slice(0, 400).map((r) => (
            <button key={key(r)} className={key(r) === effSel ? 'active' : ''} onClick={() => setSel(key(r))}>
              <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tercero}</div>
              <div className="s"><span className="mono" style={{ fontFamily: 'var(--mono)' }}>{r.cc_number || r.ce_number}</span><span>{fmt(r.total)}</span></div>
              <div className="s">
                <span>{fdate(r.fecha)} · {r.categoria || 'Sin categoría'}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {r.posible_duplicado && r.estado !== 'anulado' && <span className="chip warn">Duplicado?</span>}
                  {r.sin_soporte && <span className="chip void">Sin soporte</span>}
                  {r.estado === 'aprobado' && <span className="chip ok">Aprobado</span>}
                  {r.estado === 'anulado' && <span className="chip void">Anulado</span>}
                </span>
              </div>
            </button>
          ))}
          {list.length > 400 && <div style={{ padding: 10, fontSize: 12, color: 'var(--dim)' }}>Mostrando 400 de {list.length}. Usa los filtros para acotar.</div>}
          {!list.length && <div style={{ padding: 20, fontSize: 13, color: 'var(--dim)' }}>Nada por aquí.</div>}
        </div>

        <div className="erp-review">
          <div className="glass erp-doc">
            {loading ? (
              <div className="empty"><Loader2Icon className="animate-spin" /></div>
            ) : detail?.viewUrl ? (
              detail.viewKind === 'image' ? <img src={detail.viewUrl} alt="Soporte" /> : <iframe src={detail.viewUrl} title="Soporte" allow="autoplay" />
            ) : (
              <div className="empty">{current ? 'Esta operación no tiene soporte adjunto.' : 'Selecciona una operación.'}</div>
            )}
            {detail?.viewUrl && (
              <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <a href={detail.viewUrl} target="_blank" rel="noreferrer" className="erp-btn ghost sm"><ExternalLinkIcon /> Abrir soporte</a>
              </div>
            )}
          </div>

          <div className="glass erp-form">
            {!current || !form ? (
              <div style={{ color: 'var(--dim)', fontSize: 13 }}>Selecciona una operación de la lista.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700 }}>{[current.cc_number, current.ce_number].filter(Boolean).join(' · ')}</div>
                  <span className={`chip ${current.estado === 'aprobado' ? 'ok' : current.estado === 'anulado' ? 'void' : 'pend'}`}>
                    {current.estado === 'aprobado' ? 'Aprobado' : current.estado === 'anulado' ? 'Anulado' : 'Por revisar'}
                  </span>
                </div>
                {msg && <div className={`erp-alert ${msg.t === 'ok' ? 'ok' : 'error'}`}>{msg.m}</div>}
                {duplicates.length > 0 && (
                  <div className="erp-alert error">
                    Mismo tercero, fecha y valor que: {duplicates.map((d) => (
                      <button key={key(d)} className="erp-btn ghost sm" onClick={() => { setTab('todos'); setSel(key(d)); }}>{d.cc_number || d.ce_number}</button>
                    ))}
                  </div>
                )}
                {current.fecha_revisar && <div className="erp-alert">La fecha está fuera de 2026 o en el futuro: verifícala.</div>}

                <fieldset disabled={locked || busy} style={{ display: 'contents' }}>
                  <div className="erp-grid">
                    <div className="erp-field full">
                      <label>Categoría</label>
                      <select className="erp-select" value={form.category_id} onChange={(e) => setF({ category_id: e.target.value })}>
                        <option value="">Escoge…</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="erp-field">
                      <label>Tercero</label>
                      <input className="erp-input" value={form.supplier_name} onChange={(e) => setF({ supplier_name: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>NIT / CC</label>
                      <input className="erp-input" value={form.supplier_document} onChange={(e) => setF({ supplier_document: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Fecha</label>
                      <input type="date" className="erp-input" value={form.date} onChange={(e) => setF({ date: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Centro de costo</label>
                      <select className="erp-select" value={form.cost_center_id} onChange={(e) => setF({ cost_center_id: e.target.value })} disabled={current.source_table !== 'purchases'}>
                        <option value="">Sin centro</option>
                        {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="erp-field full">
                      <label>Concepto</label>
                      <input className="erp-input" value={form.concept} onChange={(e) => setF({ concept: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Factura N.º</label>
                      <input className="erp-input" value={form.invoice_number} onChange={(e) => setF({ invoice_number: e.target.value })} />
                    </div>
                    <div className="erp-field">
                      <label>Base</label>
                      <input type="number" className="erp-input" value={form.base} onChange={(e) => setF({ base: Number(e.target.value) })} />
                    </div>
                    <div className="erp-field">
                      <label>IVA</label>
                      <input type="number" className="erp-input" value={form.iva} onChange={(e) => setF({ iva: Number(e.target.value) })} />
                    </div>
                    <div className="erp-field">
                      <label>Retención</label>
                      <input type="number" className="erp-input" value={form.retencion} onChange={(e) => setF({ retencion: Number(e.target.value) })} disabled={current.source_table !== 'purchases'} />
                    </div>
                  </div>
                </fieldset>

                {detail?.entries?.map((e: any) => (
                  <div key={e.id}>
                    <div className="erp-section-title">{e.entry_type === 'CC' ? 'Causación' : e.entry_type === 'CE' ? 'Egreso' : e.entry_type} · {e.entry_number}</div>
                    <table className="erp-lines">
                      <tbody>
                        {e.lines.map((l: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.account_code}</td>
                            <td>{l.account_name}</td>
                            <td className="num">{l.debit ? fmt(l.debit) : ''}</td>
                            <td className="num">{l.credit ? fmt(l.credit) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 }}>
                  {!locked && <button className="erp-btn" onClick={save} disabled={busy}><SaveIcon /> Guardar corrección</button>}
                  <a className="erp-btn" href={`/api/contabilidad/operacion/pdf?source=${current.source_table}&id=${current.source_id}`} target="_blank" rel="noreferrer"><FileTextIcon /> PDF</a>
                  {canApprove && !locked && <button className="erp-btn danger" onClick={annul} disabled={busy}><BanIcon /> Anular</button>}
                  {canApprove && !locked && (
                    <button className="erp-btn success" style={{ marginLeft: 'auto' }} onClick={approve} disabled={busy}>
                      {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Aprobar y siguiente
                    </button>
                  )}
                </div>
                <button className="erp-btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => router.refresh()}>Actualizar lista</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
