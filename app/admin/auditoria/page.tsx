import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { AuditoriaClientView } from '@/components/admin/auditoria/AuditoriaClientView';

export default async function AuditoriaPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching audit logs:', error);
  }

  return (
    <div className="main">
      <AuditoriaClientView logs={logs || []} />
    </div>
  );
}
