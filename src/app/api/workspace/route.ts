import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/infrastructure/database';
import { failure, localRequest } from '@/infrastructure/http';
import { authenticate, SESSION_COOKIE } from '@/modules/identity/auth';
import { getWorkspace } from '@/modules/reporting/workspace';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    localRequest(request);
    const db = await database();
    const actor = await authenticate(db, request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json(await getWorkspace(db, actor), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return failure(error);
  }
}
