import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CajaMenorDetailClientView } from '@/components/admin/caja-menor/CajaMenorDetailClientView';

export default async function CajaMenorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin', 'asesor', 'tesoreria']);
  
  const supabase = await createClient();
  
  const { data: box, error: boxError } = await (supabase as any)
    .from('petty_cash_boxes')
    .select('*, profiles!petty_cash_boxes_opened_by_fkey(full_name)')
    .eq('id', id)
    .single();

  if (boxError || !box) {
    redirect('/admin/caja-menor');
  }

  const { data: entries, error: entriesError } = await (supabase as any)
    .from('petty_cash_entries_full')
    .select('*')
    .eq('box_id', id)
    .order('entry_date', { ascending: false });

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
  }

  return (
    <div className="main">
      <CajaMenorDetailClientView box={box} entries={entries || []} />
    </div>
  );
}
