import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Role = 'admin' | 'asesor' | 'tesoreria';

/**
 * Error thrown when a user lacks the required role.
 * Used by requireRoleApi to distinguish auth errors from other errors.
 */
export class RoleError extends Error {
  status: number;
  constructor(message: string, status: number = 403) {
    super(message);
    this.name = 'RoleError';
    this.status = status;
  }
}

/**
 * For Server Components and Server Actions — uses redirect().
 */
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

/**
 * For Route Handlers (API routes) — throws RoleError instead of redirect().
 * This prevents the NEXT_REDIRECT error from being caught by the route's
 * try/catch, which would generate a non-JSON response.
 */
export async function requireRoleApi(allowed: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new RoleError('No autenticado', 401);
  }

  const { data } = await supabase
    .from('profiles')
    .select('role, is_active, full_name, email')
    .eq('id', user.id)
    .single();

  const profile = data as any;

  if (!profile?.is_active || !allowed.includes(profile.role)) {
    throw new RoleError('No tienes permisos para esta acción', 403);
  }

  return { user, profile };
}
