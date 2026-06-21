import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { NuevaCompraForm } from './NuevaCompraForm';

export default async function NuevaCompraPage() {
  await requireRole(['admin', 'tesoreria']);
  const supabase = await createClient();

  const [costCentersRes, suppliersRes] = await Promise.all([
    supabase.from('cost_centers').select('*').eq('is_active', true).order('name'),
    supabase.from('suppliers').select('*').eq('is_active', true).order('name')
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/compras" className="p-2 bg-white text-[#7a99b5] hover:text-[#1a2d3d] rounded-full shadow-sm border border-[#a8c4d9]/40 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d]">Registrar Compra / Gasto</h1>
          <p className="text-[#7a99b5] text-sm">Ingresa la factura del proveedor o el recibo de gasto.</p>
        </div>
      </div>

      <NuevaCompraForm 
        costCenters={costCentersRes.data || []} 
        suppliers={suppliersRes.data || []}
      />
    </div>
  );
}
