'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deactivateUser(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error al desactivar usuario:', error);
    throw new Error('No se pudo desactivar el usuario.');
  }

  revalidatePath('/admin/usuarios');
}

export async function activateUser(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', id);

  if (error) {
    console.error('Error al activar usuario:', error);
    throw new Error('No se pudo activar el usuario.');
  }

  revalidatePath('/admin/usuarios');
}

import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function updateUserData(id: string, data: { full_name: string; phone?: string; role: string; is_active: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Acceso denegado');

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', id);

  if (error) throw new Error('Error al actualizar datos en profiles');

  // Sync role and full_name in auth.users metadata if we had admin client
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  await admin.auth.admin.updateUserById(id, {
    user_metadata: { full_name: data.full_name, role: data.role }
  });

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function updateUserPassword(id: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Acceso denegado');

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword });
  
  if (error) throw new Error('Error al cambiar la contraseña: ' + error.message);
}
