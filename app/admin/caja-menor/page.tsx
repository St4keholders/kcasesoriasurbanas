import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { CajaMenorClientView } from '@/components/admin/caja-menor/CajaMenorClientView';

export default async function CajaMenorPage() {
  await requireRole(['admin', 'asesor', 'tesoreria']);
  
  const supabase = await createClient();
  
  const { data: boxes, error } = await (supabase as any)
    .from('petty_cash_box_summary')
    .select('*')
    .order('box_number', { ascending: false });

  if (error) {
    console.error('Error fetching petty cash boxes:', error);
  }

  return (
    <div className="main">
      <CajaMenorClientView boxes={boxes || []} />
    </div>
  );
}
