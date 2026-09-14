import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/infrastructure/database';
import { failure, jsonBody, localRequest } from '@/infrastructure/http';
import { authSchema } from '@/contracts/commands';
import {
  SESSION_COOKIE,
  register,
  login,
  logout,
  createSession,
  consumeAttempt,
} from '@/modules/identity/auth';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    localRequest(request, true);
    const input = authSchema.parse(await jsonBody(request));
    const db = await database();
    const existing = request.cookies.get(SESSION_COOKIE)?.value;
    if (input.action === 'logout') {
      if (existing) await logout(db, existing);
      const res = NextResponse.json({ ok: true });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    await consumeAttempt(db, 'auth:global', 120);
    if (input.action === 'register') await consumeAttempt(db, 'register:global', 15);
    const actor =
      input.action === 'register'
        ? await register(db, input)
        : await login(db, input.email, input.password);
    if (existing) await logout(db, existing);
    const token = await createSession(db, actor);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    return failure(error);
  }
}
