'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { XIcon, Loader2 } from 'lucide-react';

export function AddIncomeModal({ boxId, onClose }: { boxId: string; onClose: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const entry_date = formData.get('entry_date') as string;
      const concept = formData.get('concept') as string;
      const total_amount = parseFloat(formData.get('total_amount') as string);
      
      const supabase = createClient();
      
      const { error: insertError } = await (supabase as any)
        .from('petty_cash_entries')
        .insert({
          box_id: boxId,
          entry_type: 'ingreso',
          entry_date,
          supplier_name: 'Consignación',
          concept,
          tax_amount: 0,
          total_amount,
          receipt_url: null
        });
        
      if (insertError) throw insertError;
      
      router.refresh();
      onClose();
      
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Error al registrar el ingreso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-lg bg-[var(--admin-bg)] relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--dim)] hover:text-[var(--danger)] rounded-full transition-colors hover:bg-[var(--admin-bg-hover)]"
        >
          <XIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-[var(--fg)] mb-1">Registrar Ingreso</h2>
        <p className="text-sm text-[var(--dim)] mb-6">Consignación o entrada de dinero a la caja menor.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-group">
            <label className="label">Fecha</label>
            <input name="entry_date" type="date" required className="input" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          
          <div className="form-group">
            <label className="label">Concepto</label>
            <input name="concept" type="text" required className="input" placeholder="Ej. Consignación para gastos del mes" />
          </div>
          
          <div className="form-group">
            <label className="label">Monto (COP)</label>
            <input name="total_amount" type="number" step="0.01" required className="input" placeholder="0.00" />
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-[var(--shadow-dark)]">
            <button type="button" onClick={onClose} className="neu-btn flex-1 text-center justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="neu-btn-primary flex-1 justify-center flex items-center" style={{ background: 'var(--success)' }}>
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</>
              ) : (
                'Registrar Ingreso'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
