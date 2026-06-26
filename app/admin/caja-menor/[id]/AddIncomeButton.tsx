'use client';

import { useState } from 'react';
import { BanknoteIcon } from 'lucide-react';
import { AddIncomeModal } from './AddIncomeModal';

export function AddIncomeButton({ boxId }: { boxId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="neu-btn"
        style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
      >
        <BanknoteIcon className="w-4 h-4" /> + Ingreso
      </button>
      
      {isOpen && (
        <AddIncomeModal boxId={boxId} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
