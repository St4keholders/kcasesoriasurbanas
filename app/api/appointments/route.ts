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

  // 1) Find or create lead by phone
  let leadId;
  const { data: existingLead } = await admin
    .from('leads')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existingLead) {
    leadId = existingLead.id;
    // Update name just in case it's different
    await admin.from('leads').update({ full_name: fullName }).eq('id', leadId);
  } else {
    const { data: newLead, error: leadErr } = await admin
      .from('leads')
      .insert({ full_name: fullName, phone, source: 'Web' })
      .select('id')
      .single();

    if (leadErr) {
      console.error('leadErr:', leadErr);
      return Response.json({ error: leadErr.message }, { status: 500 });
    }
    leadId = newLead.id;
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
      lead_id: leadId,
      service_type_id: service?.id ?? null,
      scheduled_at: scheduledAt,
      status: 'agendada',
      notes: notes ?? 'Solicitud desde sitio web',
    })
    .select()
    .single();

  if (apptErr) {
    console.error('apptErr:', apptErr);
    return Response.json({ error: apptErr.message }, { status: 500 });
  }

  return Response.json({ ok: true, appointmentId: appt.id });
}
