import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { LeadDetailClient } from './LeadDetailClient';

export default async function DetalleLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  
  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      appointments ( id, scheduled_at, status, service_types(name) ),
      sales ( id, sale_number, total, status, created_at )
    `)
    .eq('id', id)
    .single();

  if (error || !lead) {
    notFound();
  }

  return <LeadDetailClient lead={lead} id={id} />;
}
