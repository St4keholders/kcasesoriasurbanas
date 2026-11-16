'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloudIcon } from 'lucide-react';
import { MasivoModal } from '@/components/admin/compras/MasivoModal';
import { createClient } from '@/lib/supabase/client';

export function BulkUploadButton({ boxId }: { boxId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen || categories.length) return;
    createClient()
      .from('expense_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, [isOpen, categories.length]);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-secondary">
        <UploadCloudIcon className="w-4 h-4 mr-2" />
        Cargar facturas
      </button>
      {isOpen && categories.length > 0 && (
        <MasivoModal target="caja" boxId={boxId} categories={categories} costCenters={[]} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
