import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify session server-side
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service role to cascade delete
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) Delete appointments linked to this lead
  await admin.from('appointments').delete().eq('lead_id', id);

  // 2) Delete sales linked to this lead
  await admin.from('sales').delete().eq('lead_id', id);

  // 3) Now delete the lead itself
  const { error } = await admin.from('leads').delete().eq('id', id);

  if (error) {
    console.error('Delete lead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
