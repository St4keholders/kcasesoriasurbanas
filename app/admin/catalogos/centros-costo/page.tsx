import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { CostCenterClientPage } from './CostCenterClientPage';

export default async function CentrosCostoPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: costCenters, error } = await supabase
    .from('cost_centers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cost centers:', error);
  }

  return <CostCenterClientPage costCenters={costCenters || []} />;
}
