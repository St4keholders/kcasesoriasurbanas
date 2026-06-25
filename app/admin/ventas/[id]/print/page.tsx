import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PrintPOSClient } from './PrintPOSClient';

export default async function PrintPOSPage({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'asesor']);
  
  const supabase = await createClient();
  const { data: sale } = await supabase
    .from('sales')
    .select(`
      *,
      leads ( full_name, document_number, phone, email, address ),
      profiles!sales_closed_by_fkey ( full_name ),
      sale_items (
        id,
        quantity,
        unit_price,
        total_price,
        products ( name, description )
      )
    `)
    .eq('id', params.id)
    .single();

  if (!sale) notFound();

  return <PrintPOSClient sale={sale} />;
}
