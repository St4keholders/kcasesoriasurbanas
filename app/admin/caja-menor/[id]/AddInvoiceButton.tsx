'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { AddInvoiceModal } from './AddInvoiceModal';

export function AddInvoiceButton({ boxId }: { boxId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="neu-btn-primary"
      >
        <PlusIcon className="w-4 h-4" /> Añadir Factura
      </button>
      
      {isOpen && (
        <AddInvoiceModal boxId={boxId} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
