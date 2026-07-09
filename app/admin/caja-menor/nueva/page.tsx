import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function NuevaCajaPage() {
  await requireRole(['admin', 'asesor']);
  
  const supabaseAdmin = createAdminClient();

  // Fetch cost centers for the dropdown using admin client to bypass RLS for asesores
  const { data: costCenters } = await supabaseAdmin
    .from('cost_centers')
    .select('id, name')
    .order('name');
  
  async function createCaja(formData: FormData) {
    'use server';
    
    const name = formData.get('name') as string;
    const notes = formData.get('notes') as string;
    const cost_center_id = formData.get('cost_center_id') as string;
    
    const supabase = await createClient();
    
    const { data, error } = await (supabase as any)
      .from('petty_cash_boxes')
      .insert({ 
        name, 
        notes, 
        cost_center_id: cost_center_id || null 
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating box:', error);
      // Fallback redirection or error handling
      redirect('/admin/caja-menor?error=true');
    }
    
    redirect(`/admin/caja-menor/${data.id}`);
  }

  return (
    <div className="main">
      <AdminTopbar 
        title="Nueva Caja Menor" 
        subtitle="Abre una nueva caja menor para empezar a registrar facturas."
      />
      
      <div className="card max-w-2xl mt-6">
        <form action={createCaja} className="space-y-6">
          <div className="form-group">
            <label className="label">Nombre de la Caja</label>
            <input 
              name="name"
              type="text" 
              className="input" 
              placeholder="Ej. Caja Menor Junio Paola" 
            />
          </div>

          <div className="form-group">
            <label className="label">Centro de Costos</label>
            <select name="cost_center_id" className="input" required>
              <option value="">— Selecciona un centro de costos —</option>
              {(costCenters || []).map((cc: any) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="label">Notas Adicionales (Opcional)</label>
            <textarea 
              name="notes"
              className="input min-h-[100px]" 
              placeholder="Cualquier información relevante para esta caja..." 
            />
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-[var(--shadow-dark)]">
            <Link href="/admin/caja-menor" className="neu-btn flex-1 text-center justify-center">
              Cancelar
            </Link>
            <button type="submit" className="neu-btn-primary flex-1">
              Abrir Caja Menor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
