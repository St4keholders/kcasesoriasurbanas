'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { XIcon, Loader2 } from 'lucide-react';

interface EditEntryModalProps {
  entry: any;
  onClose: () => void;
}

export function EditEntryModal({ entry, onClose }: EditEntryModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIngreso = entry.entry_type === 'ingreso';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const entry_date = formData.get('entry_date') as string;
      const concept = formData.get('concept') as string;
      const total_amount = parseFloat(formData.get('total_amount') as string);
      
      const updateData: any = { entry_date, concept, total_amount };

      if (!isIngreso) {
        updateData.supplier_name = formData.get('supplier_name') as string;
        updateData.supplier_document = formData.get('supplier_document') as string;
        updateData.tax_amount = parseFloat(formData.get('tax_amount') as string) || 0;
      }
      
      const supabase = createClient();
      
      const { error: updateError } = await (supabase as any)
        .from('petty_cash_entries')
        .update(updateData)
        .eq('id', entry.id);
        
      if (updateError) throw updateError;
      
      router.refresh();
      onClose();
      
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Error al actualizar el registro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-2xl bg-[var(--admin-bg)] relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--dim)] hover:text-[var(--danger)] rounded-full transition-colors hover:bg-[var(--admin-bg-hover)]"
        >
          <XIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-[var(--fg)] mb-1">
          Editar {isIngreso ? 'Ingreso' : 'Gasto'}
        </h2>
        <p className="text-sm text-[var(--dim)] mb-6">Modifica los datos del registro.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-group">
              <label className="label">Fecha</label>
              <input name="entry_date" type="date" required className="input" defaultValue={entry.entry_date} />
            </div>
            
            <div className="form-group">
              <label className="label">Concepto</label>
              <input name="concept" type="text" required className="input" defaultValue={entry.concept} />
            </div>
            
            {!isIngreso && (
              <>
                <div className="form-group">
                  <label className="label">Proveedor</label>
                  <input name="supplier_name" type="text" className="input" defaultValue={entry.supplier_name} />
                </div>
                
                <div className="form-group">
                  <label className="label">NIT / Documento</label>
                  <input name="supplier_document" type="text" className="input" defaultValue={entry.supplier_document || ''} />
                </div>
                
                <div className="form-group">
                  <label className="label">Valor IVA (COP)</label>
                  <input name="tax_amount" type="number" step="0.01" className="input" defaultValue={entry.tax_amount || 0} />
                </div>
              </>
            )}
            
            <div className="form-group">
              <label className="label">Valor Total (COP)</label>
              <input name="total_amount" type="number" step="0.01" required className="input" defaultValue={entry.total_amount} />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-[var(--shadow-dark)]">
            <button type="button" onClick={onClose} className="neu-btn flex-1 text-center justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="neu-btn-primary flex-1 justify-center flex items-center">
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
