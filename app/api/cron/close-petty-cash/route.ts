import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isLastDayOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    // 1. Verify cron secret to ensure it's called by Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Since cron runs 28-31, check if today is ACTUALLY the last day of the month
    const today = new Date();
    if (!isLastDayOfMonth(today)) {
      return NextResponse.json({ message: 'Not the last day of the month, skipping execution.' });
    }

    // 3. Initialize Supabase Admin Client (so it bypasses RLS and can update)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to run as cron
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Update all open petty cash boxes to closed
    const { data, error } = await supabase
      .from('petty_cash_boxes')
      .update({ status: 'cerrada', closed_at: new Date().toISOString() })
      .eq('status', 'abierta');

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Todas las cajas menores abiertas han sido cerradas exitosamente.',
      data
    });
  } catch (error: any) {
    console.error('Error closing petty cash boxes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
