import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Role = 'admin' | 'asesor' | 'tesoreria';

export async function requireRole(allowed: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/admin/login');
  }

  const { data } = await supabase
    .from('profiles')
    .select('role, is_active, full_name, email')
    .eq('id', user.id)
    .single();

  const profile = data as any;

  if (!profile?.is_active || !allowed.includes(profile.role)) {
    redirect('/admin'); // Redirect to dashboard if no access to specific route
  }

  return { user, profile };
}
