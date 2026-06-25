import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { LeadsClientView } from '@/components/admin/leads/LeadsClientView';

export default async function LeadsPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      appointments ( count ),
      sales ( count )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
  }

  // Calculate totals
  const leadsWithCounts = (leads || []).map(lead => ({
    ...lead,
    appointments_count: lead.appointments[0]?.count || 0,
    sales_count: lead.sales[0]?.count || 0
  }));

  return (
    <div className="main">
      <LeadsClientView leadsWithCounts={leadsWithCounts} />
    </div>
  );
}
