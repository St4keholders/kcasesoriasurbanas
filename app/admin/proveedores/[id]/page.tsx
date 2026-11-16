import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { notFound } from 'next/navigation';
import { ProveedorDetailClientView } from '@/components/admin/proveedores/ProveedorDetailClientView';

export const dynamic = 'force-dynamic';

export default async function ProveedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin', 'tesoreria', 'asesor']);
  const { id } = await params;
  const db = await getServerDb();

  const { data: thirdParty } = await db
    .from('third_parties')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const { data: fallbackSupplier } = !thirdParty
    ? await db.from('suppliers').select('*').eq('id', id).maybeSingle()
    : { data: null };

  const entity = thirdParty || fallbackSupplier;
  if (!entity) notFound();

  const [purchasesRes, pettyRes, ceRes, pendientesRes] = await Promise.all([
    db
      .from('purchases')
      .select('*, cost_centers(name)')
      .or(`third_party_id.eq.${id},supplier_id.eq.${id}`)
      .neq('status', 'anulado')
      .order('transaction_date', { ascending: false }),
    db
      .from('petty_cash_entries')
      .select('*, petty_cash_boxes(box_number, name, cost_centers(name))')
      .eq('third_party_id', id)
      .neq('status', 'anulado')
      .order('entry_date', { ascending: false }),
    db
      .from('journal_entries')
      .select('*, cost_centers(name)')
      .eq('third_party_id', id)
      .eq('entry_type', 'CE')
      .neq('status', 'anulado')
      .order('entry_date', { ascending: false }),
    db
      .from('v_pendientes_legales')
      .select('*')
      .eq('third_party_id', id)
      .limit(100),
  ]);

  return (
    <div className="main">
      <ProveedorDetailClientView
        supplier={{
          id: entity.id,
          name: entity.name,
          document_number: entity.document_number,
          nit_normalized: entity.nit_normalized,
          dv: entity.dv,
          email: entity.email,
          phone: entity.phone,
          address: entity.address,
          is_active: entity.is_active,
          has_rut: entity.has_rut ?? false,
          is_billing_obligated: entity.is_billing_obligated ?? true,
        }}
        purchases={purchasesRes.data || []}
        pettyCashEntries={pettyRes.data || []}
        ceEntries={ceRes.data || []}
        pendientes={pendientesRes.data || []}
      />
    </div>
  );
}
