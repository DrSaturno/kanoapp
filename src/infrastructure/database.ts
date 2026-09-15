import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { Actor } from '../contracts/workspace';
export type Tx = Transaction;
const migrations = ['001-initial', '002-monthly-charges'] as const;
export async function createDatabase(path?: string) {
  if (path) await mkdir(dirname(path), { recursive: true });
  const db = new PGlite(path);
  await db.waitReady;
  await db.exec('CREATE TABLE IF NOT EXISTS kano_migrations (name text PRIMARY KEY)');
  const applied = await db.query<{ name: string }>('SELECT name FROM kano_migrations');
  const names = new Set(applied.rows.map((row) => row.name));
  for (const name of migrations) {
    if (names.has(name)) continue;
    const sql = await readFile(
      resolve(process.cwd(), `src/infrastructure/migrations/${name}.sql`),
      'utf8',
    );
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO kano_migrations(name) VALUES ($1)', [name]);
    });
  }
  return db;
}
const globalDb = globalThis as unknown as { kanoDb?: Promise<PGlite> };
export function database() {
  globalDb.kanoDb ??= createDatabase(
    resolve(/* turbopackIgnore: true */ process.cwd(), process.env.KANO_DATA_DIR || '.kano/db'),
  );
  return globalDb.kanoDb;
}
export async function tenantTransaction<T>(
  db: PGlite,
  actor: Actor,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Stable lock held before entering restricted role; all write/read projections serialize
    // per organization. PGlite is one-process local; use same lock convention in PG adapter.
    await tx.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [actor.organizationId]);
    await tx.exec('SET LOCAL ROLE kano_app');
    await tx.query("SELECT set_config('app.tenant',$1,true)", [actor.organizationId]);
    return fn(tx);
  });
}
