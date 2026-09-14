import { randomUUID } from 'node:crypto';
import type { Tx } from '../infrastructure/database';
import type { Actor } from '../contracts/workspace';
import type { Settings } from '../contracts/commands';
import { check } from '../domain/errors';
export async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  summary: string,
  details: unknown,
) {
  await tx.query(
    'INSERT INTO audit_events(id,organization_id,actor_id,actor_name,action,summary,details) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      randomUUID(),
      actor.organizationId,
      actor.userId,
      actor.name,
      action,
      summary,
      JSON.stringify(details),
    ],
  );
}
export async function settings(tx: Tx) {
  const { rows } = await tx.query<{ value: Settings; version: number }>(
    'SELECT value,version FROM settings_versions ORDER BY version DESC LIMIT 1',
  );
  check(rows[0], 'Configuración no encontrada.', 404);
  return rows[0];
}
