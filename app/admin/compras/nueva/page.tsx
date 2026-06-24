import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
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
    <div className="main">
      <AdminTopbar 
        eyebrow="— REGISTRO"
        title={<span>Nueva <em>compra</em></span>}
        subtitle="Ingresa la factura del proveedor o el recibo de gasto."
        action={
          <Link href="/admin/compras" className="btn btn-secondary">
            <ArrowLeftIcon className="w-4 h-4" /> Volver
          </Link>
        }
      />

      <NuevaCompraForm 
        costCenters={costCentersRes.data || []} 
        suppliers={suppliersRes.data || []}
      />
    </div>
  );
}
