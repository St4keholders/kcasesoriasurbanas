import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { ParametrizacionClientView } from '@/components/admin/contabilidad/ParametrizacionClientView';

export const dynamic = 'force-dynamic';

export default async function ParametrizacionContablePage() {
  await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();

  const [accountsRes, rulesRes, paymentAccountsRes, taxParamsRes, settingsRes] = await Promise.all([
    db.from('chart_of_accounts').select('*').order('code', { ascending: true }).range(0, 1000),
    db.from('posting_rules').select('*').order('priority', { ascending: true }).range(0, 1000),
    db.from('payment_accounts').select('*').order('name', { ascending: true }),
    db.from('tax_parameters').select('*').order('concept', { ascending: true }).order('valid_from', { ascending: true }),
    db.from('accounting_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  return (
    <div className="main">
      <ParametrizacionClientView
        accounts={accountsRes.data || []}
        rules={rulesRes.data || []}
        paymentAccounts={paymentAccountsRes.data || []}
        taxParameters={taxParamsRes.data || []}
        settings={
          settingsRes.data || {
            id: 1,
            company_name: 'KC Asesorías Urbanas S.A.S',
            company_nit: '902012620-0',
            reviso_name: 'Contador',
            aprobo_name: 'Representante legal',
          }
        }
      />
    </div>
  );
}
