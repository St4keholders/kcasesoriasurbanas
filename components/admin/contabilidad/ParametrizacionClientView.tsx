'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SaveIcon, PlusIcon, RefreshCwIcon, Loader2Icon } from 'lucide-react';
import { saveCategoryAction, reapplyCategoryAction, createAccountAction, saveSettingsAction } from '@/app/admin/contabilidad/actions';

type Account = { code: string; name: string };

function AccountSelect({ value, onChange, accounts, allowEmpty, disabled }: { value: string; onChange: (v: string) => void; accounts: Account[]; allowEmpty?: boolean; disabled?: boolean }) {
  return (
    <select className="erp-select" style={{ width: '100%' }} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {allowEmpty && <option value="">Igual a oficina</option>}
      {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
    </select>
  );
}

export function ParametrizacionClientView({ categories, accounts, settings, canEdit }: { categories: any[]; accounts: Account[]; settings: any; canEdit: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(categories);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const [busy, start] = useTransition();
  const [acc, setAcc] = useState({ code: '', name: '' });
  const [firmas, setFirmas] = useState({ reviso_name: settings?.reviso_name || '', aprobo_name: settings?.aprobo_name || '' });

  const expense = useMemo(() => accounts.filter((a) => /^[156]/.test(a.code)), [accounts]);
  const liab = useMemo(() => accounts.filter((a) => /^2/.test(a.code)), [accounts]);

  const edit = (id: string, p: any) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const save = (row: any) =>
    start(async () => {
      const res = await saveCategoryAction({
        id: row.id, name: row.name, office_account: row.office_account, obra_account: row.obra_account || '',
        payable_account: row.payable_account, withholding_account: row.withholding_account,
        is_deductible: row.is_deductible, is_active: row.is_active, ai_hint: row.ai_hint || '',
      });
      if (!res.ok) return setMsg({ t: 'error', m: res.error });
      setDirty((d) => ({ ...d, [row.id]: false }));
      if (confirm('Cuentas guardadas. ¿Aplicar el cambio a los comprobantes pendientes de esta categoría? (Los aprobados no se tocan.)')) {
        const r2 = await reapplyCategoryAction({ id: row.id });
        setMsg(r2.ok ? { t: 'ok', m: `Se actualizaron ${r2.data.updated} operaciones pendientes.` } : { t: 'error', m: r2.error });
      } else setMsg({ t: 'ok', m: 'Categoría guardada.' });
    });

  return (
    <div className="erp">
      <div className="erp-head">
        <div>
          <div className="eyebrow">Contabilidad</div>
          <h1>Parametrización <em>contable</em></h1>
          <p>Tú decides a qué cuenta va cada categoría. La auxiliar solo escoge la categoría; el sistema usa la cuenta de oficina o la de obra según el centro de costo.</p>
        </div>
      </div>
      {msg && <div className={`erp-alert ${msg.t === 'ok' ? 'ok' : 'error'}`}>{msg.m}</div>}

      <div className="glass erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr><th>Categoría</th><th>Cuenta oficina (KC)</th><th>Cuenta obra (Tolú / Bello)</th><th>Por pagar</th><th>Retención</th><th>Deducible</th><th>Activa</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ minWidth: 180 }}><input className="erp-input" style={{ width: '100%' }} value={r.name} disabled={!canEdit} onChange={(e) => edit(r.id, { name: e.target.value })} /></td>
                <td style={{ minWidth: 240 }}><AccountSelect value={r.office_account} accounts={expense} disabled={!canEdit} onChange={(v) => edit(r.id, { office_account: v })} /></td>
                <td style={{ minWidth: 240 }}><AccountSelect value={r.obra_account} accounts={expense} allowEmpty disabled={!canEdit} onChange={(v) => edit(r.id, { obra_account: v })} /></td>
                <td style={{ minWidth: 150 }}><AccountSelect value={r.payable_account} accounts={liab} disabled={!canEdit} onChange={(v) => edit(r.id, { payable_account: v })} /></td>
                <td style={{ minWidth: 150 }}><AccountSelect value={r.withholding_account} accounts={liab} disabled={!canEdit} onChange={(v) => edit(r.id, { withholding_account: v })} /></td>
                <td><input type="checkbox" checked={r.is_deductible} disabled={!canEdit} onChange={(e) => edit(r.id, { is_deductible: e.target.checked })} /></td>
                <td><input type="checkbox" checked={r.is_active} disabled={!canEdit} onChange={(e) => edit(r.id, { is_active: e.target.checked })} /></td>
                <td>{canEdit && dirty[r.id] && <button className="erp-btn primary sm" disabled={busy} onClick={() => save(r)}>{busy ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Guardar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div className="glass erp-form">
            <div className="erp-section-title">Nueva categoría</div>
            <button className="erp-btn" onClick={() => start(async () => {
              const name = prompt('Nombre de la categoría:');
              if (!name?.trim()) return;
              const res = await saveCategoryAction({ name: name.trim(), office_account: '519595', obra_account: '61201095', payable_account: '230505', withholding_account: '236525', is_deductible: true, is_active: true, ai_hint: '' });
              if (!res.ok) return setMsg({ t: 'error', m: res.error });
              router.refresh();
              setMsg({ t: 'ok', m: 'Categoría creada con cuentas por defecto; ajústalas en la tabla.' });
            })}><PlusIcon /> Agregar categoría</button>
            <div className="erp-section-title" style={{ marginTop: 10 }}>Nueva cuenta o auxiliar del PUC</div>
            <div className="erp-grid">
              <div className="erp-field"><label>Código</label><input className="erp-input" value={acc.code} onChange={(e) => setAcc({ ...acc, code: e.target.value })} placeholder="51959503" /></div>
              <div className="erp-field"><label>Nombre</label><input className="erp-input" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} /></div>
            </div>
            <button className="erp-btn" disabled={busy} onClick={() => start(async () => {
              const res = await createAccountAction(acc);
              if (!res.ok) return setMsg({ t: 'error', m: res.error });
              setAcc({ code: '', name: '' });
              router.refresh();
              setMsg({ t: 'ok', m: 'Cuenta creada.' });
            })}><PlusIcon /> Crear cuenta</button>
          </div>
          <div className="glass erp-form">
            <div className="erp-section-title">Firmas de la portada AZ</div>
            <div className="erp-field"><label>Revisó</label><input className="erp-input" value={firmas.reviso_name} onChange={(e) => setFirmas({ ...firmas, reviso_name: e.target.value })} /></div>
            <div className="erp-field"><label>Aprobó</label><input className="erp-input" value={firmas.aprobo_name} onChange={(e) => setFirmas({ ...firmas, aprobo_name: e.target.value })} /></div>
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>Elaboró: el usuario que descarga el AZ.</div>
            <button className="erp-btn primary" disabled={busy} onClick={() => start(async () => {
              const res = await saveSettingsAction(firmas);
              setMsg(res.ok ? { t: 'ok', m: 'Firmas guardadas.' } : { t: 'error', m: res.error });
            })}><SaveIcon /> Guardar firmas</button>
            <button className="erp-btn ghost sm" onClick={() => router.refresh()}><RefreshCwIcon /> Recargar</button>
          </div>
        </div>
      )}
    </div>
  );
}
