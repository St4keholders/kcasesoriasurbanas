import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { CitasClientView } from '@/components/admin/citas/CitasClientView';

export default async function CitasPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      leads ( full_name, phone ),
      profiles!appointments_assigned_advisor_id_fkey ( full_name ),
      service_types ( name )
    `)
    .order('scheduled_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching appointments:', error);
  }

  return (
    <div className="main">
      <CitasClientView appointments={appointments || []} />
    </div>
  );
}
