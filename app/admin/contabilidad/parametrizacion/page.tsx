import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { ParametrizacionClientView } from '@/components/admin/contabilidad/ParametrizacionClientView';

export const dynamic = 'force-dynamic';

export default async function ParametrizacionPage() {
  const { profile } = await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();
  const [{ data: categories }, { data: accounts }, { data: settings }] = await Promise.all([
    db.from('expense_categories').select('*').order('sort_order'),
    db.from('chart_of_accounts').select('code, name, is_postable, is_active').eq('is_active', true).eq('is_postable', true).order('code'),
    db.from('accounting_settings').select('*').eq('id', 1).maybeSingle(),
  ]);
  return (
    <ParametrizacionClientView
      categories={categories || []}
      accounts={accounts || []}
      settings={settings}
      canEdit={profile.role === 'admin'}
    />
  );
}
