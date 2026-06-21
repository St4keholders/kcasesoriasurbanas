import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { SupplierClientPage } from './SupplierClientPage';

export default async function ProveedoresPage() {
  await requireRole(['admin', 'tesoreria']);
  
  const supabase = await createClient();
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers:', error);
  }

  return <SupplierClientPage suppliers={suppliers || []} />;
}
