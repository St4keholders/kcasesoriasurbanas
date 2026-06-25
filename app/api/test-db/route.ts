import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
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

    if (error) return NextResponse.json({ error });
    return NextResponse.json({ count: appointments?.length, first: appointments?.[0] });
  } catch (err: any) {
    return NextResponse.json({ exception: err.message, stack: err.stack });
  }
}
