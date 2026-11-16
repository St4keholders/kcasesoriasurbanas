import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { AzDownload } from '@/components/admin/contabilidad/AzDownload';

export const dynamic = 'force-dynamic';

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fdate = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m) - 1]} ${y}`;
};
const PAGE = 40;

type SP = { from?: string; to?: string; type?: string; status?: string; account?: string; center?: string; page?: string; tab?: string };

export default async function LibroDiarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole(['admin', 'tesoreria']);
  const sp = await searchParams;
  const from = sp.from || '2026-01-01';
  const to = sp.to || '2026-12-31';
  const tab = sp.tab === 'balance' ? 'balance' : 'diario';
  const page = Math.max(1, Number(sp.page || '1'));
  const db = await getServerDb();

  const [{ data: centers }] = await Promise.all([db.from('cost_centers').select('id, name').order('name')]);
  const qs = (p: Partial<SP>) => {
    const u = new URLSearchParams();
    const all = { ...sp, ...p } as Record<string, string | undefined>;
    Object.entries(all).forEach(([k, v]) => v && u.set(k, v));
    return `?${u.toString()}`;
  };

  let entries: any[] = [];
  let count = 0;
  let names = new Map<string, string>();
  let balance: any[] = [];

  if (tab === 'diario') {
    let q = db
      .from('journal_entries')
      .select('id, entry_number, entry_type, entry_date, status, concept, source_table, source_id, third_parties(name), cost_centers(name), journal_lines(account_code, description, debit, credit, line_order)', { count: 'exact' })
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date')
      .order('entry_type')
      .order('entry_number');
    if (sp.type) q = q.eq('entry_type', sp.type);
    if (sp.status) q = q.eq('status', sp.status);
    else q = q.neq('status', 'anulado');
    if (sp.center) q = q.eq('cost_center_id', sp.center);
    if (sp.account) {
      const { data: ids } = await db.from('journal_lines').select('entry_id').like('account_code', `${sp.account}%`).range(0, 9999);
      const list = Array.from(new Set((ids || []).map((i) => i.entry_id)));
      q = q.in('id', list.length ? list.slice(0, 1500) : ['00000000-0000-0000-0000-000000000000']);
    }
    const res = await q.range((page - 1) * PAGE, page * PAGE - 1);
    entries = res.data || [];
    count = res.count || 0;
    const codes = new Set<string>();
    entries.forEach((e) => (e.journal_lines || []).forEach((l: any) => codes.add(l.account_code)));
    if (codes.size) {
      const { data: acc } = await db.from('chart_of_accounts').select('code, name').in('code', Array.from(codes));
      names = new Map((acc || []).map((a) => [a.code, a.name]));
    }
  } else {
    const { data } = await db.rpc('kc_balance_prueba', { p_from: from, p_to: to, p_only_approved: sp.status === 'aprobado' });
    balance = data || [];
  }

  const pages = Math.max(1, Math.ceil(count / PAGE));
  const pageDebit = entries.reduce((a, e) => a + (e.journal_lines || []).reduce((s: number, l: any) => s + Number(l.debit), 0), 0);
  const pageCredit = entries.reduce((a, e) => a + (e.journal_lines || []).reduce((s: number, l: any) => s + Number(l.credit), 0), 0);
  const xlsx = `/api/contabilidad/libro-diario/xlsx${qs({ page: undefined, tab: undefined })}`;

  return (
    <div className="erp">
      <div className="erp-head">
        <div>
          <div className="eyebrow">Contabilidad</div>
          <h1>Libro <em>diario</em></h1>
          <p>Todos los comprobantes en orden de fecha. Descarga el Excel o el archivo AZ (una hoja por operación con su soporte).</p>
        </div>
        <div className="erp-actions">
          <a className="erp-btn" href={xlsx}>Exportar Excel</a>
          <AzDownload from={from} to={to} />
        </div>
      </div>

      <form className="erp-toolbar glass" method="get">
        <input type="hidden" name="tab" value={tab} />
        <div className="erp-tabs">
          <Link className={`erp-tab ${tab === 'diario' ? 'active' : ''}`} href={qs({ tab: 'diario', page: '1' })}>Libro diario</Link>
          <Link className={`erp-tab ${tab === 'balance' ? 'active' : ''}`} href={qs({ tab: 'balance', page: '1' })}>Balance de prueba</Link>
        </div>
        <div className="grow" />
        <input className="erp-input" type="date" name="from" defaultValue={from} />
        <input className="erp-input" type="date" name="to" defaultValue={to} />
        {tab === 'diario' && (
          <>
            <select className="erp-select" name="type" defaultValue={sp.type || ''}>
              <option value="">Todos los tipos</option>
              <option value="CC">CC · Causación</option>
              <option value="CE">CE · Egreso</option>
              <option value="RC">RC · Recibo de caja</option>
              <option value="NC">NC · Nota</option>
            </select>
            <input className="erp-input" name="account" placeholder="Cuenta (ej. 5195)" defaultValue={sp.account || ''} style={{ width: 130 }} />
            <select className="erp-select" name="center" defaultValue={sp.center || ''}>
              <option value="">Todos los centros</option>
              {(centers || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        <select className="erp-select" name="status" defaultValue={sp.status || ''}>
          <option value="">Pendientes y aprobados</option>
          <option value="aprobado">Solo aprobados</option>
          {tab === 'diario' && <option value="pendiente">Solo pendientes</option>}
          {tab === 'diario' && <option value="anulado">Anulados</option>}
        </select>
        <button className="erp-btn primary" type="submit">Filtrar</button>
      </form>

      {tab === 'diario' ? (
        <>
          <div className="glass erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr><th>Fecha</th><th>Comprobante</th><th>Tercero / cuenta</th><th>Centro</th><th className="num">Débito</th><th className="num">Crédito</th><th>Estado</th><th /></tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <React.Fragment key={e.id}>
                    <tr>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fdate(e.entry_date)}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{e.entry_number}</td>
                      <td><div style={{ fontWeight: 600 }}>{e.third_parties?.name || '-'}</div><div className="muted">{e.concept}</div></td>
                      <td className="muted">{e.cost_centers?.name || '-'}</td>
                      <td /><td />
                      <td><span className={`chip ${e.status === 'aprobado' ? 'ok' : e.status === 'anulado' ? 'void' : 'pend'}`}>{e.status === 'aprobado' ? 'Aprobado' : e.status === 'anulado' ? 'Anulado' : 'Por revisar'}</span></td>
                      <td>{e.source_table && <a className="erp-btn ghost sm" target="_blank" rel="noreferrer" href={`/api/contabilidad/operacion/pdf?source=${e.source_table}&id=${e.source_id}`}>PDF</a>}</td>
                    </tr>
                    {(e.journal_lines || []).sort((a: any, b: any) => a.line_order - b.line_order).map((l: any, i: number) => (
                      <tr key={`${e.id}-${i}`}>
                        <td /><td />
                        <td className="muted" style={{ paddingLeft: 22 }}><span className="mono" style={{ color: 'var(--fg)' }}>{l.account_code}</span> {names.get(l.account_code) || ''}</td>
                        <td />
                        <td className="num">{Number(l.debit) ? fmt(l.debit) : ''}</td>
                        <td className="num">{Number(l.credit) ? fmt(l.credit) : ''}</td>
                        <td /><td />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {!entries.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--dim)' }}>No hay comprobantes con estos filtros.</td></tr>}
              </tbody>
              <tfoot>
                <tr><td colSpan={4}>Sumas de esta página</td><td className="num">{fmt(pageDebit)}</td><td className="num">{fmt(pageCredit)}</td><td colSpan={2} /></tr>
              </tfoot>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--dim)' }}>
            <span>{count} comprobantes</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {page > 1 && <Link className="erp-btn sm" href={qs({ page: String(page - 1) })}>Anterior</Link>}
              Página {page} de {pages}
              {page < pages && <Link className="erp-btn sm" href={qs({ page: String(page + 1) })}>Siguiente</Link>}
            </span>
          </div>
        </>
      ) : (
        <div className="glass erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>Cuenta</th><th>Nombre</th><th className="num">Débitos</th><th className="num">Créditos</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.account_code}>
                  <td className="mono"><Link href={qs({ tab: 'diario', account: b.account_code, page: '1' })}>{b.account_code}</Link></td>
                  <td>{b.account_name}</td>
                  <td className="num">{fmt(b.debit)}</td>
                  <td className="num">{fmt(b.credit)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmt(b.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Sumas iguales</td>
                <td className="num">{fmt(balance.reduce((a, b) => a + Number(b.debit), 0))}</td>
                <td className="num">{fmt(balance.reduce((a, b) => a + Number(b.credit), 0))}</td>
                <td className="num">{fmt(balance.reduce((a, b) => a + Number(b.balance), 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
