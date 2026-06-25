import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { UsuariosClientView } from '@/components/admin/usuarios/UsuariosClientView';

export default async function UsuariosPage() {
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
  }

  const users = profiles || [];

  return (
    <div className="main">
      <UsuariosClientView users={users} />
    </div>
  );
}
