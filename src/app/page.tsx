import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { database } from '@/infrastructure/database';
import { authenticate, SESSION_COOKIE } from '@/modules/identity/auth';
import { getWorkspace } from '@/modules/reporting/workspace';
import { WorkspaceApp } from '@/ui/workspace-app';
import { AppError } from '@/domain/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; student?: string }>;
}) {
  const h = await headers();
  const host = h.get('host') ?? '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))
    return (
      <main className="standalone">
        <h1>Entorno local</h1>
        <p>Esta entrega todavía no admite acceso público.</p>
      </main>
    );
  const db = await database();
  let actor;
  try {
    actor = await authenticate(db, (await cookies()).get(SESSION_COOKIE)?.value);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login');
    throw error;
  }
  if (actor.role !== 'owner' && actor.role !== 'admin')
    return (
      <main className="standalone">
        <h1>Acceso restringido</h1>
        <p>El portal de alumnos llegará en una próxima entrega.</p>
      </main>
    );
  return <WorkspaceApp initialData={await getWorkspace(db, actor)} route={await searchParams} />;
}
