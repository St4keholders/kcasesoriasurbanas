import { NextResponse } from 'next/server';
import { executeMutation } from '@/lib/server/auth';
import { SignedUploadRequestSchema } from '@/lib/validation';
import { createSupportSignedUploadUrl } from '@/lib/server/storage';

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Cuerpo JSON inválido', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const result = await executeMutation(
    ['admin', 'tesoreria', 'asesor'],
    SignedUploadRequestSchema,
    body,
    async ({ input }) => {
      return createSupportSignedUploadUrl({
        module: input.module,
        filename: input.filename,
        sha256: input.sha256,
      });
    }
  );

  if (!result.ok) {
    const status =
      result.code === 'UNAUTHORIZED'
        ? 401
        : result.code === 'FORBIDDEN' || result.code === 'USER_INACTIVE'
        ? 403
        : result.code === 'VALIDATION_ERROR'
        ? 400
        : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
