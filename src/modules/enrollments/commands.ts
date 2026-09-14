import { randomUUID } from 'node:crypto';
import type { Tx } from '../../infrastructure/database';
import type { Actor, Student, ServiceVersion } from '../../contracts/workspace';
import type { Command } from '../../contracts/commands';
import { check } from '../../domain/errors';
import { audit, settings } from '../shared';
import { localDate } from '../../domain/finance';
export async function enroll(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'enrollment.create' }>,
) {
  const config = await settings(tx);
  const today = localDate(config.value.timeZone);
  const { rows: students } = await tx.query<Student>(
    "SELECT * FROM students WHERE id=$1 AND state='active'",
    [c.studentId],
  );
  check(students[0], 'El alumno debe estar activo.', 404);
  const { rows: versions } = await tx.query<ServiceVersion>(
    `SELECT v.* FROM service_versions v JOIN services s ON s.id=v.service_id WHERE s.id=$1 AND s.state='active' AND v.effective_on<=$2 ORDER BY v.effective_on DESC LIMIT 1`,
    [c.serviceId, today],
  );
  const version = versions[0];
  check(version, 'El servicio no tiene condiciones vigentes o su sede está inactiva.', 409);
  const { rows: locations } = await tx.query(
    "SELECT id FROM locations WHERE id=$1 AND state='active'",
    [version.location_id],
  );
  check(
    locations[0],
    'La sede actual está inactiva. Actualizá el servicio antes de inscribir.',
    409,
  );
  const { rows: existing } = await tx.query<{ student_id: string }>(
    "SELECT student_id FROM enrollments WHERE service_id=$1 AND state='active'",
    [c.serviceId],
  );
  check(
    !existing.some((e) => e.student_id === c.studentId),
    'El alumno ya está inscripto en este servicio.',
    409,
  );
  check(existing.length < version.capacity, 'El servicio no tiene cupos disponibles.', 409);
  const id = randomUUID();
  const chargeId = randomUUID();
  await tx.query(
    "INSERT INTO enrollments(id,organization_id,student_id,service_id,service_version_id,settings_version,state) VALUES($1,$2,$3,$4,$5,$6,'active')",
    [id, actor.organizationId, c.studentId, c.serviceId, version.id, config.version],
  );
  await tx.query(
    'INSERT INTO charges(id,organization_id,student_id,enrollment_id,description,amount,currency,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      chargeId,
      actor.organizationId,
      c.studentId,
      id,
      version.name,
      version.amount,
      version.currency,
      c.dueDate,
    ],
  );
  await audit(tx, actor, 'enrollment.created', `${students[0].name} se sumó a ${version.name}`, {
    id,
    chargeId,
    serviceVersion: version.version,
  });
  return { id, chargeId };
}
export async function endEnrollment(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'enrollment.end' }>,
) {
  const { rows } = await tx.query<{ id: string }>('SELECT id FROM enrollments WHERE id=$1', [c.id]);
  check(rows[0], 'Inscripción no encontrada.', 404);
  await tx.query("UPDATE enrollments SET state='ended' WHERE id=$1", [c.id]);
  await audit(
    tx,
    actor,
    'enrollment.ended',
    'Inscripción finalizada; cuenta corriente conservada',
    { id: c.id },
  );
  return { id: c.id };
}
