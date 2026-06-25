'use client';

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PrintPOSClient({ sale }: { sale: any }) {
  useEffect(() => {
    // Automatically trigger print dialog once component mounts
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => format(new Date(iso), "dd MMM yyyy - hh:mm a", { locale: es });

  return (
    <div className="bg-white min-h-screen text-black font-mono p-4 flex justify-center">
      <div className="w-[80mm] bg-white border border-gray-200 p-4 print:border-none print:p-0">
        <div className="text-center mb-6">
          <h1 className="font-bold text-xl uppercase mb-1">KC ASESORÍAS URBANAS S.A.S</h1>
          <p className="text-sm">NIT: 902012620-0</p>
          <p className="text-sm">kcasesoriasurbanas@gmail.com</p>
          <div className="border-b border-dashed border-gray-400 my-4" />
          <h2 className="font-bold text-lg uppercase">
            {sale.status === 'cotizacion' ? 'COTIZACIÓN' : 'COMPROBANTE'} POS
          </h2>
          <p className="text-sm font-semibold mt-1">Nº {sale.sale_number || 'Borrador'}</p>
          <p className="text-xs mt-1">{formatDate(sale.created_at)}</p>
        </div>

        <div className="mb-4 text-sm">
          <p><strong>Cliente:</strong> {sale.leads?.full_name}</p>
          {sale.leads?.document_number && <p><strong>CC/NIT:</strong> {sale.leads.document_number}</p>}
          {sale.leads?.phone && <p><strong>Tel:</strong> {sale.leads.phone}</p>}
          <p><strong>Asesor:</strong> {sale.profiles?.full_name}</p>
        </div>

        <div className="border-b border-dashed border-gray-400 my-2" />
        
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 w-1/2">Cant x Artículo</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.sale_items?.map((item: any) => (
              <tr key={item.id}>
                <td className="py-2 pr-2 align-top">
                  <div>{item.quantity} x {item.products?.name}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(item.unit_price)} c/u</div>
                </td>
                <td className="py-2 text-right align-top font-medium">
                  {formatCurrency(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-b border-dashed border-gray-400 my-2" />

        <div className="flex justify-between items-center mb-1 text-sm">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-2 text-sm">
          <span>IVA:</span>
          <span>{formatCurrency(sale.tax_amount)}</span>
        </div>
        <div className="flex justify-between items-center font-bold text-lg border-t border-gray-300 pt-2 mb-6">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>

        <div className="text-center text-xs text-gray-600 mt-8 space-y-2">
          {sale.notes && (
            <div className="mb-4 text-left p-2 bg-gray-50 border border-gray-200">
              <strong>Notas:</strong> {sale.notes}
            </div>
          )}
          <p>Esta cotización no corresponde a factura.</p>
          <p>Gracias por confiar en nosotros.</p>
        </div>
        
        {/* Helper text for the browser view (hidden in print) */}
        <div className="print:hidden mt-8 text-center text-xs text-gray-400">
          <p>Presiona Ctrl+P o Cmd+P si no se abre el diálogo de impresión.</p>
          <p>Cierra esta pestaña al terminar.</p>
        </div>
      </div>
    </div>
  );
}
