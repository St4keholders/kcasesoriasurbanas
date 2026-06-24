import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { NuevaCitaForm } from './NuevaCitaForm';

export default async function NuevaCitaPage({ searchParams }: { searchParams: { leadId?: string } }) {
  await requireRole(['admin', 'asesor']);
  const supabase = await createClient();

  // Fetch data
  const [servicesRes, advisorsRes] = await Promise.all([
    supabase.from('service_types').select('*').eq('is_active', true),
    supabase.from('profiles').select('id, full_name').in('role', ['admin', 'asesor']).eq('is_active', true)
  ]);

  let defaultLead = null;
  if (searchParams.leadId) {
    const { data } = await supabase.from('leads').select('id, full_name').eq('id', searchParams.leadId).single();
    if (data) defaultLead = data;
  }

  return (
    <div className="main">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/citas" className="neu-icon" style={{ width: 40, height: 40 }}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[var(--fg)]">Agendar Nueva Cita</h1>
          <p className="text-[var(--dim)] text-sm">Programa una reunión o trámite con un cliente.</p>
        </div>
      </div>

      <NuevaCitaForm 
        services={servicesRes.data || []} 
        advisors={advisorsRes.data || []}
        defaultLeadId={searchParams.leadId}
        defaultLead={defaultLead}
      />
    </div>
  );
}
