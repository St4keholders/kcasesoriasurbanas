import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { ServiceClientPage } from './ServiceClientPage';

export default async function ServiciosPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from('service_types')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching services:', error);
  }

  return <ServiceClientPage services={services || []} />;
}
