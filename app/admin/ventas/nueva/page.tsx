import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { NuevaVentaForm } from './NuevaVentaForm';

export default async function NuevaVentaPage({ searchParams }: { searchParams: { leadId?: string } }) {
  await requireRole(['admin', 'asesor']);
  const supabase = await createClient();

  // Fetch data
  const { data: services } = await supabase.from('service_types').select('*').eq('is_active', true);

  let defaultLead = null;
  if (searchParams.leadId) {
    const { data } = await supabase.from('leads').select('id, full_name').eq('id', searchParams.leadId).single();
    if (data) defaultLead = data;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/ventas" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Nueva Cotización / Venta</h1>
          <p className="text-[#7a99b5] text-sm">Crea una propuesta comercial o registra un ingreso directo.</p>
        </div>
      </div>

      <NuevaVentaForm 
        services={services || []} 
        defaultLeadId={searchParams.leadId}
        defaultLead={defaultLead}
      />
    </div>
  );
}
