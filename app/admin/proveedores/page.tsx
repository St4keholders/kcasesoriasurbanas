import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { SupplierClientPage, type SupplierListItem } from './SupplierClientPage';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage() {
  await requireRole(['admin', 'tesoreria', 'asesor']);
  const db = await getServerDb();

  const [thirdPartiesRes, purchasesRes, pettyRes, pendientesRes] = await Promise.all([
    db
      .from('third_parties')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(0, 999),
    db
      .from('purchases')
      .select('third_party_id, supplier_id, total, transaction_date, status')
      .gte('transaction_date', '2026-01-01')
      .lte('transaction_date', '2026-12-31')
      .neq('status', 'anulado')
      .range(0, 1999),
    db
      .from('petty_cash_entries')
      .select('third_party_id, total_amount, entry_date, entry_type, status')
      .gte('entry_date', '2026-01-01')
      .lte('entry_date', '2026-12-31')
      .neq('status', 'anulado')
      .range(0, 999),
    db
      .from('v_pendientes_legales')
      .select('third_party_id, motivo')
      .range(0, 2999),
  ]);

  const paidByTp = new Map<string, number>();
  for (const p of purchasesRes.data || []) {
    const tpId = p.third_party_id || p.supplier_id;
    if (tpId) {
      paidByTp.set(tpId, (paidByTp.get(tpId) || 0) + (Number(p.total) || 0));
    }
  }
  for (const e of pettyRes.data || []) {
    if (e.entry_type !== 'ingreso' && e.third_party_id) {
      paidByTp.set(
        e.third_party_id,
        (paidByTp.get(e.third_party_id) || 0) + (Number(e.total_amount) || 0)
      );
    }
  }

  const pendByTp = new Map<string, number>();
  for (const pend of pendientesRes.data || []) {
    if (pend.third_party_id) {
      pendByTp.set(pend.third_party_id, (pendByTp.get(pend.third_party_id) || 0) + 1);
    }
  }

  const suppliers: SupplierListItem[] = (thirdPartiesRes.data || []).map((tp) => ({
    id: tp.id,
    name: tp.name,
    document_number: tp.document_number,
    nit_normalized: tp.nit_normalized,
    dv: tp.dv,
    email: tp.email,
    phone: tp.phone,
    address: tp.address,
    is_active: tp.is_active,
    total_paid_2026: paidByTp.get(tp.id) || 0,
    pending_count: pendByTp.get(tp.id) || 0,
  }));

  return <SupplierClientPage suppliers={suppliers} />;
}
