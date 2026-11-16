import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { ZodType } from 'zod';

export type UserRole = Database['public']['Enums']['user_role'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

export class RoleError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 403, code = 'FORBIDDEN') {
    super(message);
    this.name = 'RoleError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Para Server Components: verifica sesión activa, perfil activo y rol permitido.
 * Si el usuario está inactivo, cierra la sesión y redirige a `/login`.
 */
export async function requireRole(allowed: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, full_name, email, phone, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login?inactive=1');
  }

  if (!allowed.includes(profile.role)) {
    redirect('/admin');
  }

  return { user, profile };
}

/**
 * Para Route Handlers y Server Actions tipadas: lanza RoleError en vez de redirect().
 */
export async function requireRoleApi(allowed: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new RoleError('No autenticado', 401, 'UNAUTHORIZED');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, full_name, email, phone, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    throw new RoleError('Cuenta inactiva. Contacta al administrador.', 403, 'USER_INACTIVE');
  }

  if (!allowed.includes(profile.role)) {
    throw new RoleError('No tienes permisos para realizar esta acción.', 403, 'FORBIDDEN');
  }

  return { user, profile };
}

/**
 * Ejecuta una mutación estándar pasando por:
 * requireRoleApi -> validación Zod -> función de servicio -> { ok, data } | { ok: false, error, code }
 */
export async function executeMutation<TInput, TOutput>(
  allowedRoles: UserRole[],
  schema: ZodType<TInput>,
  rawInput: unknown,
  handler: (ctx: { userId: string; profile: ProfileRow; input: TInput }) => Promise<TOutput>
): Promise<MutationResult<TOutput>> {
  try {
    const { user, profile } = await requireRoleApi(allowedRoles);
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
      };
    }

    const data = await handler({
      userId: user.id,
      profile,
      input: parsed.data,
    });

    return { ok: true, data };
  } catch (err: unknown) {
    if (err instanceof RoleError) {
      return { ok: false, error: err.message, code: err.code };
    }
    const message = err instanceof Error ? err.message : 'Error inesperado en el servidor';
    return { ok: false, error: message, code: 'INTERNAL_ERROR' };
  }
}
