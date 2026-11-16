import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi, RoleError } from '@/lib/server/auth';
import { createSupportSignedViewUrl } from '@/lib/server/storage';

export async function GET(request: NextRequest) {
  try {
    await requireRoleApi(['admin', 'tesoreria', 'asesor']);
    const pathParam = request.nextUrl.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json(
        { ok: false, error: 'Falta el parámetro path', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const signedUrl = await createSupportSignedViewUrl(pathParam, 3600);
    if (!signedUrl) {
      return NextResponse.json(
        { ok: false, error: 'No se encontró el soporte solicitado', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (request.nextUrl.searchParams.get('json') === '1') {
      return NextResponse.json({ ok: true, data: { signedUrl } });
    }

    return NextResponse.redirect(signedUrl);
  } catch (err: unknown) {
    if (err instanceof RoleError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Error obteniendo soporte', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
