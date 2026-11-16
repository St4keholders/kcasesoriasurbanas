import Link from 'next/link';
import { requireRole } from '@/lib/server/auth';
import { getServerDb } from '@/lib/server/db';
import { AuditoriaClientView } from '@/components/admin/auditoria/AuditoriaClientView';

export const dynamic = 'force-dynamic';

export default async function HistorialCambiosPage() {
  await requireRole(['admin']);
  const db = await getServerDb();
  const { data: logs } = await db
    .from('audit_log')
    .select('*, profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(300);
  return (
    <div className="erp">
      <div><Link className="erp-btn sm" href="/admin/contabilidad/auditoria">← Volver a la revisión</Link></div>
      <AuditoriaClientView logs={logs || []} />
    </div>
  );
}
