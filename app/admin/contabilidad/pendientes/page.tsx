import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { PendientesClientView } from '@/components/admin/contabilidad/PendientesClientView';

export const dynamic = 'force-dynamic';

export default async function PendientesLegalesPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string; costCenterId?: string; thirdPartyId?: string }>;
}) {
  await requireRole(['admin', 'tesoreria']);
  const sp = await searchParams;
  const db = await getServerDb();

  let query = db
    .from('v_pendientes_legales')
    .select('*')
    .order('record_date', { ascending: false });

  if (sp.motivo) query = query.eq('motivo', sp.motivo);
  if (sp.costCenterId) query = query.eq('cost_center_id', sp.costCenterId);
  if (sp.thirdPartyId) query = query.eq('third_party_id', sp.thirdPartyId);

  const [rowsRes, allSummaryRes, costCentersRes] = await Promise.all([
    query.range(0, 499),
    db.from('v_pendientes_legales').select('motivo, amount').range(0, 4999),
    db.from('cost_centers').select('id, name').eq('is_active', true),
  ]);

  const summaryMap = new Map<string, { motivo: string; count: number; totalAmount: number }>();
  for (const r of allSummaryRes.data || []) {
    const m = r.motivo || 'otro';
    const curr = summaryMap.get(m) || { motivo: m, count: 0, totalAmount: 0 };
    curr.count += 1;
    curr.totalAmount += Number(r.amount) || 0;
    summaryMap.set(m, curr);
  }

  return (
    <div className="main">
      <PendientesClientView
        rows={(rowsRes.data || []) as Array<Record<string, unknown>>}
        summaryByMotivo={Array.from(summaryMap.values()).sort((a, b) => b.count - a.count)}
        costCenters={costCentersRes.data || []}
        currentFilters={{
          motivo: sp.motivo || '',
          costCenterId: sp.costCenterId || '',
          thirdPartyId: sp.thirdPartyId || '',
        }}
      />
    </div>
  );
}
