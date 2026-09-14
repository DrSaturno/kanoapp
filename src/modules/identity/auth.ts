import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { Actor } from '../../contracts/workspace';
import { check, AppError } from '../../domain/errors';

export const SESSION_COOKIE = 'kano_session';
export const defaultSettings = {
  name: 'Mi espacio',
  currency: 'ARS' as const,
  timeZone: 'America/Argentina/Buenos_Aires',
  noticeDays: 7,
  paymentMethods: ['cash', 'transfer'] as ('cash' | 'transfer')[],
};
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}
async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(':');
  const derived = await derive(password, salt);
  const target = Buffer.from(key, 'hex');
  return target.length === derived.length && timingSafeEqual(derived, target);
}
export async function register(
  db: PGlite,
  input: { email: string; password: string; name: string; organization: string },
) {
  const passwordHash = await hashPassword(input.password);
  const actor: Actor = {
    userId: randomUUID(),
    organizationId: randomUUID(),
    role: 'owner',
    name: input.name,
  };
  try {
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO organizations(id) VALUES($1)', [actor.organizationId]);
      await tx.query(
        'INSERT INTO accounts(id,organization_id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5,$6)',
        [
          actor.userId,
          actor.organizationId,
          input.email.toLowerCase(),
          input.name,
          passwordHash,
          'owner',
        ],
      );
      await tx.query(
        'INSERT INTO settings_versions(id,organization_id,version,value) VALUES($1,$2,1,$3)',
        [
          randomUUID(),
          actor.organizationId,
          JSON.stringify({ ...defaultSettings, name: input.organization }),
        ],
      );
      await tx.query(
        'INSERT INTO audit_events(id,organization_id,actor_id,actor_name,action,summary,details) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          randomUUID(),
          actor.organizationId,
          actor.userId,
          actor.name,
          'organization.created',
          'Espacio de entrenamiento creado',
          '{}',
        ],
      );
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505')
      throw new AppError('No se pudo crear la cuenta con esos datos.', 409);
    throw error;
  }
  return actor;
}
export async function consumeAttempt(db: PGlite, identifier: string, limit = 15) {
  const result = await db.query<{ attempts: number }>(
    `INSERT INTO auth_attempts(bucket,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes')
    ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.expires_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,
    expires_at=CASE WHEN auth_attempts.expires_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING attempts`,
    [digest(identifier)],
  );
  check(
    result.rows[0].attempts <= limit,
    'Demasiados intentos. Volvé a intentar en 15 minutos.',
    429,
  );
}
export async function login(db: PGlite, email: string, password: string): Promise<Actor> {
  await consumeAttempt(db, `login:${email.toLowerCase()}`);
  const { rows } = await db.query<{
    id: string;
    organization_id: string;
    role: Actor['role'];
    name: string;
    password_hash: string;
  }>('SELECT id,organization_id,role,name,password_hash FROM accounts WHERE email=$1', [
    email.toLowerCase(),
  ]);
  const account = rows[0];
  // Same expensive operation for unknown users; no email enumeration by timing.
  const valid = await verifyPassword(
    password,
    account?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
  );
  check(account && valid, 'Email o contraseña incorrectos.', 401);
  return {
    userId: account.id,
    organizationId: account.organization_id,
    role: account.role,
    name: account.name,
  };
}
export async function createSession(db: PGlite, actor: Actor) {
  const token = randomBytes(32).toString('hex');
  await db.query(
    "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
    [digest(token), actor.userId],
  );
  return token;
}
export async function authenticate(db: PGlite, token?: string): Promise<Actor> {
  check(token && /^[a-f0-9]{64}$/.test(token), 'Iniciá sesión para continuar.', 401);
  const { rows } = await db.query<{
    id: string;
    organization_id: string;
    role: Actor['role'];
    name: string;
  }>(
    `SELECT a.id,a.organization_id,a.role,a.name FROM auth_sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [digest(token)],
  );
  const a = rows[0];
  check(a, 'Tu sesión venció. Volvé a ingresar.', 401);
  return { userId: a.id, organizationId: a.organization_id, role: a.role, name: a.name };
}
export async function logout(db: PGlite, token: string) {
  await db.query('DELETE FROM auth_sessions WHERE token_hash=$1', [digest(token)]);
}
