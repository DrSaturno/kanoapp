import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/infrastructure/database';
import { failure, jsonBody, localRequest } from '@/infrastructure/http';
import { authenticate, SESSION_COOKIE } from '@/modules/identity/auth';
import { execute } from '@/modules/dispatch';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    localRequest(request, true);
    const db = await database();
    const actor = await authenticate(db, request.cookies.get(SESSION_COOKIE)?.value);
    const result = await execute(db, actor, await jsonBody(request));
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
