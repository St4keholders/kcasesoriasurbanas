import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // 1) Verificar que quien llama es admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
    
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado: Solo administradores' }, { status: 403 });
  }

  // 2) Crear usuario con admin API
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const body = await req.json();
  const { email, password, fullName, phone, role } = body;

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirmar el correo
    user_metadata: { full_name: fullName, role }, // Role y full_name para que los triggers de supabase lo sincronicen si existen
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 3) Actualizar teléfono u otros datos extra si se proveen
  const updates: any = {};
  if (phone) updates.phone = phone;
  // La migración de supabase podría requerir role explícito si el trigger no lo hace
  updates.role = role;
  updates.full_name = fullName;

  await admin.from('profiles').update(updates).eq('id', data.user.id);

  return NextResponse.json({ ok: true, userId: data.user.id });
}
