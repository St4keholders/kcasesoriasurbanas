import { NextResponse, type NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import {
  loadVoucherFullData,
  renderVoucherToPdfDoc,
} from '@/lib/server/services/contabilidad/pdf';
import {
  ensureDraftEntriesForPurchase,
  ensureDraftEntriesForPettyCash,
} from '@/lib/server/services/contabilidad';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleApi(['admin', 'tesoreria', 'asesor']);
    const { id } = await context.params;
    const source = request.nextUrl.searchParams.get('source');

    let { vouchers, company } = await loadVoucherFullData(id, source);

    if (vouchers.length === 0 && source === 'purchase') {
      await ensureDraftEntriesForPurchase({ purchaseId: id });
      ({ vouchers, company } = await loadVoucherFullData(id, source));
    } else if (vouchers.length === 0 && source === 'petty_cash_entry') {
      await ensureDraftEntriesForPettyCash(id);
      ({ vouchers, company } = await loadVoucherFullData(id, source));
    }

    if (vouchers.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Comprobante no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < vouchers.length; i++) {
      await renderVoucherToPdfDoc(pdfDoc, vouchers[i], company, i + 1);
    }

    const pdfBytes = await pdfDoc.save();
    const filename =
      vouchers.length === 1
        ? `${vouchers[0].entry_number}.pdf`
        : `Comprobantes-${id.slice(0, 8)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof RoleError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const msg = err instanceof Error ? err.message : 'Error generando PDF del comprobante';
    return NextResponse.json({ ok: false, error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
