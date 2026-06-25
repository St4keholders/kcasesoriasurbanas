'use client';

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PrintPOSClient({ sale }: { sale: any }) {
  useEffect(() => {
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string) => format(new Date(iso), "dd MMM yyyy - hh:mm a", { locale: es });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-container { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      
      <div style={{ background: '#f0f4f8', minHeight: '100vh', padding: '32px 16px', display: 'flex', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div 
          className="print-container"
          style={{
            width: '380px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(26,45,61,0.12)',
            border: '1px solid #e0ecf5',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1a2d3d 0%, #2d4a63 100%)', padding: '28px 24px', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>KC ASESORÍAS URBANAS S.A.S</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>NIT: 902012620-0</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>kcasesoriasurbanas@gmail.com</div>
            
            <div style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(91,163,217,0.25)', borderRadius: '8px', display: 'inline-block' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>
                {sale.status === 'cotizacion' ? 'Cotización' : 'Comprobante'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>Nº {sale.sale_number || 'Borrador'}</div>
            </div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>{formatDate(sale.created_at)}</div>
          </div>

          {/* Client Info */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8f0f8' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#7a99b5', marginBottom: '8px', fontWeight: 600 }}>Datos del Cliente</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2d3d' }}>{sale.leads?.full_name}</div>
            {sale.leads?.document_number && <div style={{ fontSize: '12px', color: '#7a99b5', marginTop: '2px' }}>CC/NIT: {sale.leads.document_number}</div>}
            {sale.leads?.phone && <div style={{ fontSize: '12px', color: '#7a99b5', marginTop: '2px' }}>Tel: {sale.leads.phone}</div>}
            <div style={{ fontSize: '12px', color: '#5ba3d9', marginTop: '4px' }}>Asesor: {sale.profiles?.full_name}</div>
          </div>

          {/* Items */}
          <div style={{ padding: '16px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7a99b5', borderBottom: '2px solid #e8f0f8', fontWeight: 600 }}>Artículo</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7a99b5', borderBottom: '2px solid #e8f0f8', fontWeight: 600 }}>Cant</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7a99b5', borderBottom: '2px solid #e8f0f8', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_items?.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #f0f5fa', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a2d3d' }}>{item.description}</div>
                      <div style={{ fontSize: '11px', color: '#a8c4d9', marginTop: '2px' }}>{formatCurrency(item.unit_price)} c/u</div>
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #f0f5fa', textAlign: 'center', fontSize: '13px', color: '#3d5a73' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #f0f5fa', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#1a2d3d' }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#7a99b5' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#7a99b5' }}>
              <span>IVA</span>
              <span>{formatCurrency(sale.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 700, color: '#1a2d3d', borderTop: '2px solid #5ba3d9', marginTop: '8px' }}>
              <span>TOTAL</span>
              <span style={{ color: '#5ba3d9' }}>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div style={{ margin: '0 24px 16px', padding: '12px 16px', background: '#f7fbff', borderRadius: '8px', border: '1px solid #e0ecf5', fontSize: '12px', color: '#3d5a73' }}>
              <strong>Notas:</strong> {sale.notes}
            </div>
          )}

          {/* Footer */}
          <div style={{ background: '#f7fbff', padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #e8f0f8' }}>
            <div style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 600, marginBottom: '6px' }}>
              ⚠ Esta cotización no corresponde a factura.
            </div>
            <div style={{ fontSize: '11px', color: '#a8c4d9' }}>
              Gracias por confiar en KC Asesorías Urbanas S.A.S
            </div>
          </div>

          {/* Print helper (hidden in print) */}
          <div className="no-print" style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', color: '#a8c4d9' }}>
            <p>Presiona Ctrl+P para guardar como PDF.</p>
            <p>Cierra esta pestaña al terminar.</p>
          </div>
        </div>
      </div>
    </>
  );
}
