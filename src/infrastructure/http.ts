import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, check } from '../domain/errors';
export function localRequest(request: Request, mutation = false) {
  const url = new URL(request.url);
  // Next may normalize request.url to localhost; preserve the browser-facing Host.
  const host = request.headers.get('host') ?? url.host;
  check(
    /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host),
    'Esta entrega funciona únicamente en un entorno local.',
    403,
  );
  if (mutation) {
    check(
      request.headers.get('origin') === (process.env.KANO_ORIGIN ?? `${url.protocol}//${host}`),
      'Origen de solicitud no permitido.',
      403,
    );
    check(
      request.headers.get('content-type')?.split(';')[0] === 'application/json',
      'Enviá contenido JSON.',
      415,
    );
  }
}
export async function jsonBody(request: Request) {
  check(
    Number(request.headers.get('content-length') ?? 0) <= 32768,
    'La solicitud supera el tamaño permitido.',
    413,
  );
  const reader = request.body?.getReader();
  check(reader, 'Solicitud vacía.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new AppError('La solicitud supera el tamaño permitido.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new AppError('El contenido no es JSON válido.');
  }
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues.map((i) => i.message).join(' '), fields: error.flatten() },
      { status: 422 },
    );
  if ((error as { code?: string }).code === '23505')
    return NextResponse.json(
      { error: 'Ya existe un registro con esas condiciones. Actualizá la pantalla.' },
      { status: 409 },
    );
  const requestId = crypto.randomUUID();
  console.error('kano_request_failed', {
    requestId,
    error: error instanceof Error ? error.name : 'unknown',
  });
  return NextResponse.json(
    { error: `No pudimos completar la operación. Referencia: ${requestId}` },
    { status: 500 },
  );
}
