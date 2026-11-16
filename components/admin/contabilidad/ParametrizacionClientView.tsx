'use client';

import React, { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Modal } from '@/components/admin/ui/Modal';
import {
  saveSignaturesAction,
  saveChartAccountAction,
  savePostingRuleAction,
} from '@/app/admin/contabilidad/actions';
import { formatCOP } from '@/lib/utils/money';
import { formatDateCO } from '@/lib/utils/dates';
import { PlusIcon, SaveIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

type AccountRow = Database['public']['Tables']['chart_of_accounts']['Row'];
type RuleRow = Database['public']['Tables']['posting_rules']['Row'];
type PaymentAccountRow = Database['public']['Tables']['payment_accounts']['Row'];
type TaxParamRow = Database['public']['Tables']['tax_parameters']['Row'];

interface SettingsData {
  id: number;
  company_name: string;
  company_nit: string;
  reviso_name: string;
  aprobo_name: string;
}

export function ParametrizacionClientView({
  accounts,
  rules,
  paymentAccounts,
  taxParameters,
  settings,
}: {
  accounts: AccountRow[];
  rules: RuleRow[];
  paymentAccounts: PaymentAccountRow[];
  taxParameters: TaxParamRow[];
  settings: SettingsData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'puc' | 'reglas' | 'pagos' | 'impuestos' | 'firmas'>('puc');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [sigForm, setSigForm] = useState({
    company_name: settings.company_name,
    company_nit: settings.company_nit,
    reviso_name: settings.reviso_name,
    aprobo_name: settings.aprobo_name,
  });

  const postableAccounts = accounts.filter((a) => a.is_postable);

  const handleSaveSignatures = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    const res = await saveSignaturesAction(sigForm);
    setIsSaving(false);
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    setStatusMessage('Parámetros de firmas e identificación actualizados correctamente.');
    router.refresh();
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get('code') || '').trim();
    const res = await saveChartAccountAction({
      code,
      name: String(fd.get('name') || ''),
      account_class: Number(code.slice(0, 1)) || 5,
      level: code.length === 1 ? 'clase' : code.length === 2 ? 'grupo' : code.length === 4 ? 'cuenta' : 'subcuenta',
      nature: String(fd.get('nature') || 'debito'),
      is_postable: code.length >= 6,
      default_tax_concept: String(fd.get('default_tax_concept') || 'ninguno'),
      keywords_csv: String(fd.get('keywords_csv') || ''),
    });
    setIsSaving(false);
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    setIsAccountModalOpen(false);
    setStatusMessage(`Cuenta ${code} guardada en el Plan Único de Cuentas.`);
    router.refresh();
  };

  const handleCreateRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await savePostingRuleAction({
      name: String(fd.get('name') || ''),
      priority: Number(fd.get('priority') || 50),
      account_class: fd.get('account_class') ? Number(fd.get('account_class')) : null,
      keyword_pattern: String(fd.get('keyword_pattern') || ''),
      debit_account_code: String(fd.get('debit_account_code') || ''),
      credit_account_code: String(fd.get('credit_account_code') || '230505'),
      tax_concept: String(fd.get('tax_concept') || 'servicios'),
      is_deductible: fd.get('is_deductible') === 'on',
    });
    setIsSaving(false);
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    setIsRuleModalOpen(false);
    setStatusMessage('Regla de contabilización creada.');
    router.refresh();
  };

  return (
    <>
      <AdminTopbar
        eyebrow="— CONTABILIDAD · CIERRE 2026"
        title={
          <span>
            Parametrización <em>contable y tributaria</em>
          </span>
        }
        subtitle="Plan Único de Cuentas (Decreto 2650), reglas del clasificador, cuentas de pago, retención en la fuente 2026 y firmas de comprobantes."
      />

      {statusMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-800 text-sm">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-800 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 glass-panel p-2 rounded-2xl">
        {[
          { id: 'puc', label: `Plan de Cuentas (${accounts.length})` },
          { id: 'reglas', label: `Reglas Clasificador (${rules.length})` },
          { id: 'pagos', label: `Cuentas de Pago (${paymentAccounts.length})` },
          { id: 'impuestos', label: `Retención en la Fuente 2026 (${taxParameters.length})` },
          { id: 'firmas', label: 'Firmas y Encabezado' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--sky-deep)] text-white shadow-sm'
                : 'text-[var(--fg-soft)] hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'puc' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="btn btn-primary text-sm flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Nueva cuenta PUC
            </button>
          </div>

          <DataTable
            data={accounts}
            keyExtractor={(row) => row.code}
            columns={[
              {
                header: 'Código',
                sortAccessor: (row) => row.code,
                accessor: (row) => (
                  <span className="font-mono font-semibold text-[var(--fg)]">{row.code}</span>
                ),
              },
              {
                header: 'Nombre de la cuenta',
                sortAccessor: (row) => row.name,
                accessor: (row) => <span className="font-medium text-[var(--fg)]">{row.name}</span>,
              },
              {
                header: 'Clase / Nivel',
                accessor: (row) => (
                  <span className="text-xs uppercase tracking-wider text-[var(--dim)]">
                    Clase {row.account_class} · {row.level}
                  </span>
                ),
              },
              {
                header: 'Naturaleza',
                accessor: (row) => (
                  <span className="text-xs font-semibold uppercase text-[var(--fg-soft)]">
                    {row.nature === 'debito' ? 'Débito' : 'Crédito'}
                  </span>
                ),
              },
              {
                header: 'Palabras clave (IA / Clasificador)',
                accessor: (row) => (
                  <span className="text-xs text-[var(--dim)]">
                    {(row.keywords || []).slice(0, 6).join(', ') || '-'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'reglas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(true)}
              className="btn btn-primary text-sm flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Nueva regla
            </button>
          </div>

          <DataTable
            data={rules}
            keyExtractor={(row) => row.id}
            columns={[
              {
                header: 'Prioridad',
                sortAccessor: (row) => row.priority,
                accessor: (row) => <span className="font-mono text-xs">{row.priority}</span>,
              },
              {
                header: 'Regla',
                accessor: (row) => (
                  <div>
                    <div className="font-semibold text-[var(--fg)] text-sm">{row.name}</div>
                    <div className="text-xs text-[var(--dim)] font-mono">{row.keyword_pattern}</div>
                  </div>
                ),
              },
              {
                header: 'Origen',
                accessor: (row) => (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.source === 'aprendida'
                        ? 'bg-sky-500/15 text-sky-900'
                        : 'bg-slate-500/15 text-slate-800'
                    }`}
                  >
                    {row.source === 'aprendida' ? 'Aprendida' : 'Manual'}
                  </span>
                ),
              },
              {
                header: 'Clase',
                accessor: (row) => (
                  <span className="text-xs font-mono">
                    {row.account_class ? `Clase ${row.account_class}` : 'Todas (5/6)'}
                  </span>
                ),
              },
              {
                header: 'Débito → Crédito',
                accessor: (row) => (
                  <span className="font-mono text-xs font-semibold text-[var(--sky-deep)]">
                    {row.debit_account_code} → {row.credit_account_code || '230505'}
                  </span>
                ),
              },
              {
                header: 'Deducible',
                accessor: (row) => (
                  <span className="text-xs">
                    {row.is_deductible ? 'Sí' : 'No deducible (531595)'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'pagos' && (
        <DataTable
          data={paymentAccounts}
          keyExtractor={(row) => row.id}
          columns={[
            {
              header: 'Nombre',
              accessor: (row) => <span className="font-semibold text-[var(--fg)]">{row.name}</span>,
            },
            {
              header: 'Medio de pago',
              accessor: (row) => (
                <span className="text-sm uppercase font-mono text-[var(--dim)]">
                  {row.payment_method || 'general'}
                </span>
              ),
            },
            {
              header: 'Cuenta contable',
              accessor: (row) => (
                <span className="font-mono font-bold text-[var(--sky-deep)]">
                  {row.account_code}
                </span>
              ),
            },
            {
              header: 'Por defecto',
              accessor: (row) => <span className="text-xs">{row.is_default ? 'Sí' : 'No'}</span>,
            },
          ]}
        />
      )}

      {activeTab === 'impuestos' && (
        <div className="space-y-3">
          <div className="glass-panel p-4 rounded-xl text-sm text-[var(--fg-soft)]">
            <strong>UVT 2026:</strong> {formatCOP(52374)} · Vigencia especial de bases de compras (27 UVT) y servicios (4 UVT) del 8 de mayo al 30 de junio de 2026; 10 UVT y 2 UVT en el resto del año.
          </div>

          <DataTable
            data={taxParameters}
            keyExtractor={(row) => row.id}
            columns={[
              {
                header: 'Concepto',
                accessor: (row) => (
                  <span className="font-semibold uppercase text-xs tracking-wider text-[var(--fg)]">
                    {row.concept}
                  </span>
                ),
              },
              {
                header: 'Cuenta Retefuente',
                accessor: (row) => (
                  <span className="font-mono font-semibold text-[var(--sky-deep)]">
                    {row.account_code}
                  </span>
                ),
              },
              {
                header: 'Vigencia desde / hasta',
                accessor: (row) => (
                  <span className="font-mono text-xs text-[var(--dim)]">
                    {formatDateCO(row.valid_from)} — {formatDateCO(row.valid_to)}
                  </span>
                ),
              },
              {
                header: 'Base mínima (UVT / COP)',
                accessor: (row) => (
                  <span className="font-mono text-xs">
                    {row.min_base_uvt} UVT ({formatCOP(Number(row.min_base_cop))})
                  </span>
                ),
              },
              {
                header: 'Tarifa',
                accessor: (row) => (
                  <span className="font-mono font-bold text-[var(--fg)]">
                    {Number(row.rate_pct)}%
                  </span>
                ),
              },
              {
                header: 'Detalle',
                accessor: (row) => <span className="text-xs text-[var(--dim)]">{row.notes}</span>,
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'firmas' && (
        <form onSubmit={handleSaveSignatures} className="glass-panel p-6 rounded-2xl max-w-2xl space-y-5">
          <h3 className="text-lg font-semibold text-[var(--fg)]">
            Firmas y encabezado oficial del comprobante contable
          </h3>
          <p className="text-sm text-[var(--dim)]">
            El campo <strong>Elaboró</strong> se completa automáticamente con el nombre del usuario que originó el registro. Los cargos o nombres de <strong>Revisó</strong> y <strong>Aprobó</strong> se imprimen con línea para firma manuscrita en los PDFs y en el paquete AZ.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Razón social</label>
              <input
                type="text"
                value={sigForm.company_name}
                onChange={(e) => setSigForm({ ...sigForm, company_name: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="label">NIT</label>
              <input
                type="text"
                value={sigForm.company_nit}
                onChange={(e) => setSigForm({ ...sigForm, company_nit: e.target.value })}
                className="input w-full font-mono"
                required
              />
            </div>
            <div>
              <label className="label">Firma Revisó</label>
              <input
                type="text"
                value={sigForm.reviso_name}
                onChange={(e) => setSigForm({ ...sigForm, reviso_name: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="label">Firma Aprobó</label>
              <input
                type="text"
                value={sigForm.aprobo_name}
                onChange={(e) => setSigForm({ ...sigForm, aprobo_name: e.target.value })}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex items-center gap-2"
            >
              <SaveIcon className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar firmas'}
            </button>
          </div>
        </form>
      )}

      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Agregar subcuenta al Plan Único de Cuentas"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código PUC (6 dígitos)</label>
              <input name="code" type="text" required placeholder="Ej. 513595" className="input w-full font-mono" />
            </div>
            <div>
              <label className="label">Naturaleza</label>
              <select name="nature" className="input w-full">
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nombre de la cuenta</label>
            <input name="name" type="text" required placeholder="Ej. SERVICIOS DE NUBE" className="input w-full" />
          </div>
          <div>
            <label className="label">Concepto de retención por defecto</label>
            <select name="default_tax_concept" className="input w-full">
              <option value="ninguno">Ninguno</option>
              <option value="compras">Compras (236540)</option>
              <option value="servicios">Servicios (236525)</option>
              <option value="honorarios">Honorarios (236515)</option>
              <option value="arrendamientos">Arrendamientos (236530)</option>
            </select>
          </div>
          <div>
            <label className="label">Palabras clave separadas por coma</label>
            <input name="keywords_csv" type="text" placeholder="nube, hosting, servidor" className="input w-full" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsAccountModalOpen(false)} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              Guardar cuenta
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Nueva regla de contabilización"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 mt-2">
          <div>
            <label className="label">Nombre descriptivo</label>
            <input name="name" type="text" required placeholder="Ej. Compra de cemento y agregados" className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Clase contable</label>
              <select name="account_class" className="input w-full">
                <option value="">Ambas (5 y 6)</option>
                <option value="5">5 — Gastos (Medellín)</option>
                <option value="6">6 — Costos (Obras)</option>
              </select>
            </div>
            <div>
              <label className="label">Prioridad (menor = primero)</label>
              <input name="priority" type="number" defaultValue={30} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="label">Palabras clave (separadas por |)</label>
            <input name="keyword_pattern" type="text" required placeholder="cemento|arena|triturado" className="input w-full font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subcuenta Débito</label>
              <select name="debit_account_code" required className="input w-full">
                {postableAccounts
                  .filter((a) => a.account_class === 5 || a.account_class === 6)
                  .map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Cuenta por Pagar (Crédito)</label>
              <select name="credit_account_code" className="input w-full">
                <option value="230505">230505 — GASTOS</option>
                <option value="210505">210505 — PROVEEDORES</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="is_deductible" type="checkbox" defaultChecked className="w-4 h-4" />
            <label className="text-sm text-[var(--fg-soft)]">Gasto/costo deducible fiscalmente</label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsRuleModalOpen(false)} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              Guardar regla
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
