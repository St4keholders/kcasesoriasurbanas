import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  // Redireccionar según el rol a la vista principal correspondiente
  if (role === 'admin') {
    redirect('/admin/kpis');
  } else if (role === 'asesor') {
    redirect('/admin/citas');
  } else if (role === 'tesoreria') {
    redirect('/admin/compras');
  }

  // Fallback
  return (
    <div className="flex justify-center items-center h-full">
      <p className="text-gray-500">No se determinó un rol válido para tu usuario.</p>
    </div>
  );
}
