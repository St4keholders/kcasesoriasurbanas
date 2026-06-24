'use client';

import React, { useState } from 'react';
import { UploadCloudIcon } from 'lucide-react';
import { BulkUploadModal } from './BulkUploadModal';

export function BulkUploadButton({ boxId }: { boxId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="neu-btn"
      >
        <UploadCloudIcon className="w-4 h-4 mr-2" />
        Carga Masiva
      </button>

      {isOpen && (
        <BulkUploadModal 
          boxId={boxId}
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
