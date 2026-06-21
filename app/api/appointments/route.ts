import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, phone, scheduledAt, serviceName, notes } = body;

  if (!fullName || !phone || !scheduledAt || !serviceName) {
    return Response.json({ error: 'Faltan datos' }, { status: 400 });
  }

  // Use SERVICE_ROLE_KEY server-side to bypass RLS for leads/appointments
  // NEVER expose this key to the client.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) Upsert lead by phone
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .upsert(
      { full_name: fullName, phone, source: 'Web' },
      { onConflict: 'phone' }
    )
    .select()
    .single();

  if (leadErr) {
    return Response.json({ error: leadErr.message }, { status: 500 });
  }

  // 2) Find the service_type by name
  const { data: service } = await admin
    .from('service_types')
    .select('id')
    .eq('name', serviceName)
    .single();

  // 3) Create the appointment
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .insert({
      lead_id: lead.id,
      service_type_id: service?.id ?? null,
      scheduled_at: scheduledAt,
      status: 'agendada',
      notes: notes ?? 'Solicitud desde sitio web',
    })
    .select()
    .single();

  if (apptErr) {
    return Response.json({ error: apptErr.message }, { status: 500 });
  }

  return Response.json({ ok: true, appointmentId: appt.id });
}
