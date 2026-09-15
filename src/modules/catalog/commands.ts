import { randomUUID } from 'node:crypto';
import type { Tx } from '../../infrastructure/database';
import type { Actor, Location, Service } from '../../contracts/workspace';
import type { Command } from '../../contracts/commands';
import { check } from '../../domain/errors';
import { audit, settings } from '../shared';
import { localDate } from '../../domain/finance';
export async function saveService(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'service.save' }>,
) {
  const currentSettings = await settings(tx);
  const today = localDate(currentSettings.value.timeZone);
  check(c.effectiveOn >= today, 'La vigencia debe comenzar hoy o en una fecha futura.');
  const { rows: locations } = await tx.query<Location>(
    'SELECT * FROM locations WHERE id=$1 AND state=$2',
    [c.locationId, 'active'],
  );
  check(locations[0], 'Elegí una sede activa.', 404);
  const id = c.id ?? randomUUID();
  let version = 1;
  if (c.id) {
    const { rows } = await tx.query<Service>('SELECT * FROM services WHERE id=$1', [id]);
    check(rows[0], 'Servicio no encontrado.', 404);
    check(
      rows[0].revision === c.expectedVersion,
      'El servicio cambió. Actualizá la pantalla.',
      409,
    );
    const { rows: versions } = await tx.query<{ version: number; effective_on: string }>(
      'SELECT version,effective_on FROM service_versions WHERE service_id=$1 ORDER BY version DESC LIMIT 1',
      [id],
    );
    check(
      c.effectiveOn > versions[0].effective_on,
      'Elegí una vigencia posterior a la última versión. Las condiciones anteriores se conservan.',
      409,
    );
    version = versions[0].version + 1;
    await tx.query('UPDATE services SET revision=revision+1 WHERE id=$1', [id]);
  } else
    await tx.query("INSERT INTO services(id,organization_id,state) VALUES($1,$2,'active')", [
      id,
      actor.organizationId,
    ]);
  await tx.query(
    `INSERT INTO service_versions(id,organization_id,service_id,version,name,discipline,modality,location_id,location_name,days,time,duration,capacity,amount,currency,effective_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      randomUUID(),
      actor.organizationId,
      id,
      version,
      c.name,
      c.discipline,
      c.modality,
      c.locationId,
      locations[0].name,
      JSON.stringify(c.days),
      c.time,
      c.duration,
      c.capacity,
      c.amount,
      c.currency,
      c.effectiveOn,
    ],
  );
  await audit(
    tx,
    actor,
    c.id ? 'service.versioned' : 'service.created',
    `${c.id ? 'Nueva versión' : 'Nuevo servicio'}: ${c.name}`,
    { id, version, effectiveOn: c.effectiveOn, scope: 'new-enrollments' },
  );
  return { id };
}
export async function serviceState(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'service.state' }>,
) {
  const { rows } = await tx.query<Service>('SELECT * FROM services WHERE id=$1', [c.id]);
  check(rows[0], 'Servicio no encontrado.', 404);
  check(rows[0].revision === c.expectedVersion, 'El servicio cambió. Actualizá la pantalla.', 409);
  await tx.query('UPDATE services SET state=$1,revision=revision+1 WHERE id=$2', [c.state, c.id]);
  await audit(tx, actor, 'service.state', 'Estado de servicio actualizado', {
    id: c.id,
    before: rows[0].state,
    after: c.state,
  });
  return { id: c.id };
}
export async function saveLocation(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'location.save' }>,
) {
  const id = c.id ?? randomUUID();
  if (c.id) {
    const { rows } = await tx.query<Location>('SELECT * FROM locations WHERE id=$1', [id]);
    check(rows[0], 'Sede no encontrada.', 404);
    check(rows[0].version === c.expectedVersion, 'La sede cambió. Actualizá la pantalla.', 409);
    await tx.query(
      'UPDATE locations SET name=$1,address=$2,state=$3,version=version+1 WHERE id=$4',
      [c.name, c.address, c.state, id],
    );
  } else
    await tx.query(
      'INSERT INTO locations(id,organization_id,name,address,state) VALUES($1,$2,$3,$4,$5)',
      [id, actor.organizationId, c.name, c.address, c.state],
    );
  await audit(tx, actor, 'location.saved', `Sede guardada: ${c.name}`, { id, state: c.state });
  return { id };
}
