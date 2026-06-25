import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { VentasClientView } from '@/components/admin/ventas/VentasClientView';

export default async function VentasPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      *,
      leads ( full_name, document_number ),
      profiles!sales_closed_by_fkey ( full_name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
  }

  return (
    <div className="main">
      <VentasClientView sales={sales || []} />
    </div>
  );
}
