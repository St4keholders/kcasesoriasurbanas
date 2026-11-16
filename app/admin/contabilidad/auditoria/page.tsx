import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { AuditoriaContableView } from '@/components/admin/contabilidad/AuditoriaContableView';

export const dynamic = 'force-dynamic';

export default async function AuditoriaContablePage() {
  const { profile } = await requireRole(['admin', 'tesoreria']);
  const db = await getServerDb();

  const cols =
    'source_table, source_id, fecha, cc_number, ce_number, estado, tercero, concepto, categoria, category_id, centro_costo, cost_center_id, total, posible_duplicado, sin_soporte, fecha_revisar, descuadrado, orden';
  const all: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db.from('v_kc_operaciones').select(cols).order('orden').range(from, from + 999);
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const [{ data: categories }, { data: costCenters }] = await Promise.all([
    db.from('expense_categories').select('id, name').eq('is_active', true).order('sort_order'),
    db.from('cost_centers').select('id, name').eq('is_active', true).order('name'),
  ]);

  return (
    <AuditoriaContableView
      rows={all}
      categories={categories || []}
      costCenters={costCenters || []}
      canApprove={profile.role === 'admin'}
    />
  );
}
