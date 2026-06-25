import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditUserForm } from './EditUserForm';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin']);
  
  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/usuarios" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Editar Usuario</h1>
          <p className="text-[#7a99b5] text-sm">Actualiza los datos o la contraseña del usuario.</p>
        </div>
      </div>
      <EditUserForm user={user} id={id} />
    </div>
  );
}
