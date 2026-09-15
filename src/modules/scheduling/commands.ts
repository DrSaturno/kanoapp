import { createHash, randomUUID } from 'node:crypto';
import type { Command } from '../../contracts/commands';
import type {
  Actor,
  ClassBooking,
  ClassSession,
  ServiceVersion,
  Student,
} from '../../contracts/workspace';
import { check } from '../../domain/errors';
import { datesBetween, effectiveVersion, weekday } from '../../domain/scheduling';
import type { Tx } from '../../infrastructure/database';
import { audit, settings } from '../shared';
import { localDate } from '../../domain/finance';

export async function generateSchedule(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'schedule.generate' }>,
) {
  const serviceIds = [...c.serviceIds].sort();
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ fromDate: c.fromDate, toDate: c.toDate, serviceIds }))
    .digest('hex');
  const { rows: previous } = await tx.query<{
    id: string;
    request_hash: string;
    created_count: number;
  }>('SELECT id,request_hash,created_count FROM schedule_batches WHERE idempotency_key=$1', [
    c.idempotencyKey,
  ]);
  if (previous[0]) {
    check(
      previous[0].request_hash === requestHash,
      'Esta operación ya se usó con otro rango o servicios. Actualizá la pantalla.',
      409,
    );
    return { id: previous[0].id, count: previous[0].created_count };
  }

  const config = await settings(tx);
  const today = localDate(config.value.timeZone);
  check(c.fromDate >= today, 'La agenda sólo puede generarse desde hoy en adelante.', 409);
  const candidates: Array<{
    serviceId: string;
    version: ServiceVersion;
    sessionDate: string;
  }> = [];
  const versionsByService = new Map<string, ServiceVersion[]>();
  for (const serviceId of serviceIds) {
    const { rows } = await tx.query<ServiceVersion>(
      `SELECT v.* FROM service_versions v
       JOIN services s ON s.id=v.service_id AND s.state='active'
       WHERE s.id=$1 ORDER BY v.effective_on DESC`,
      [serviceId],
    );
    check(rows[0], 'Uno de los servicios ya no está activo.', 409);
    versionsByService.set(serviceId, rows);
  }
  const { rows: locations } = await tx.query<{ id: string }>(
    "SELECT id FROM locations WHERE state='active'",
  );
  const activeLocations = new Set(locations.map((location) => location.id));
  for (const sessionDate of datesBetween(c.fromDate, c.toDate)) {
    for (const serviceId of serviceIds) {
      const version = effectiveVersion(versionsByService.get(serviceId)!, serviceId, sessionDate);
      if (!version) continue;
      if (version.days.includes(weekday(sessionDate))) {
        check(
          activeLocations.has(version.location_id),
          'Una clase usa una sede inactiva. Actualizá el servicio.',
          409,
        );
        candidates.push({ serviceId, version, sessionDate });
      }
    }
  }
  check(candidates.length <= 200, 'El rango genera más de 200 clases. Dividilo en dos.', 422);

  let created = 0;
  for (const candidate of candidates) {
    const { rows: existing } = await tx.query<{ id: string }>(
      'SELECT id FROM class_sessions WHERE service_id=$1 AND session_date=$2',
      [candidate.serviceId, candidate.sessionDate],
    );
    if (existing[0]) continue;
    const version = candidate.version;
    await tx.query(
      `INSERT INTO class_sessions(
        id,organization_id,service_id,service_version_id,title,discipline,modality,
        location_id,location_name,session_date,start_time,duration,capacity
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        randomUUID(),
        actor.organizationId,
        candidate.serviceId,
        version.id,
        version.name,
        version.discipline,
        version.modality,
        version.location_id,
        version.location_name,
        candidate.sessionDate,
        version.time,
        version.duration,
        version.capacity,
      ],
    );
    created += 1;
  }
  const id = randomUUID();
  await tx.query(
    'INSERT INTO schedule_batches(id,organization_id,idempotency_key,request_hash,from_date,to_date,created_count) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [id, actor.organizationId, c.idempotencyKey, requestHash, c.fromDate, c.toDate, created],
  );
  await audit(
    tx,
    actor,
    'schedule.generated',
    `${created} clase${created === 1 ? '' : 's'} generada${created === 1 ? '' : 's'}`,
    { id, fromDate: c.fromDate, toDate: c.toDate, serviceIds, created },
  );
  return { id, count: created };
}

export async function createBooking(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'booking.create' }>,
) {
  const config = await settings(tx);
  const today = localDate(config.value.timeZone);
  const { rows: sessions } = await tx.query<ClassSession>(
    "SELECT * FROM class_sessions WHERE id=$1 AND state='scheduled'",
    [c.sessionId],
  );
  const session = sessions[0];
  check(session, 'Clase no encontrada o ya cerrada.', 404);
  check(session.session_date >= today, 'No podés reservar una clase pasada.', 409);
  const { rows: students } = await tx.query<Student>(
    "SELECT * FROM students WHERE id=$1 AND state='active'",
    [c.studentId],
  );
  check(students[0], 'El alumno debe estar activo.', 404);
  const { rows: enrollments } = await tx.query<{ id: string }>(
    "SELECT id FROM enrollments WHERE student_id=$1 AND service_id=$2 AND state='active'",
    [c.studentId, session.service_id],
  );
  check(enrollments[0], 'El alumno necesita una inscripción activa a este servicio.', 409);
  const { rows: existing } = await tx.query<{ id: string }>(
    "SELECT id FROM class_bookings WHERE session_id=$1 AND student_id=$2 AND status<>'cancelled'",
    [c.sessionId, c.studentId],
  );
  check(!existing[0], 'El alumno ya está en esta clase.', 409);
  const { rows: occupancy } = await tx.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM class_bookings WHERE session_id=$1 AND status='confirmed'",
    [c.sessionId],
  );
  const confirmed = occupancy[0].count < session.capacity;
  let waitlistPosition: number | null = null;
  if (!confirmed) {
    const { rows } = await tx.query<{ next: number }>(
      "SELECT coalesce(max(waitlist_position),0)::int+1 AS next FROM class_bookings WHERE session_id=$1 AND status='waitlist'",
      [c.sessionId],
    );
    waitlistPosition = rows[0].next;
  }
  const id = randomUUID();
  const status = confirmed ? 'confirmed' : 'waitlist';
  await tx.query(
    'INSERT INTO class_bookings(id,organization_id,session_id,student_id,enrollment_id,status,waitlist_position) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      id,
      actor.organizationId,
      session.id,
      c.studentId,
      enrollments[0].id,
      status,
      waitlistPosition,
    ],
  );
  await audit(
    tx,
    actor,
    'booking.created',
    `${students[0].name} · ${status === 'confirmed' ? 'lugar confirmado' : 'lista de espera'}`,
    { id, sessionId: session.id, studentId: c.studentId, status, waitlistPosition },
  );
  return { id };
}

export async function cancelBooking(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'booking.cancel' }>,
) {
  const { rows } = await tx.query<ClassBooking>('SELECT * FROM class_bookings WHERE id=$1', [c.id]);
  const booking = rows[0];
  check(booking, 'Reserva no encontrada.', 404);
  check(booking.version === c.expectedVersion, 'La nómina cambió. Actualizá la pantalla.', 409);
  check(
    booking.status === 'confirmed' || booking.status === 'waitlist',
    'Esta reserva ya no puede cancelarse.',
    409,
  );
  const { rows: sessions } = await tx.query<ClassSession>(
    "SELECT * FROM class_sessions WHERE id=$1 AND state='scheduled'",
    [booking.session_id],
  );
  check(sessions[0], 'La clase ya está cerrada.', 409);
  await tx.query(
    "UPDATE class_bookings SET status='cancelled',waitlist_position=null,version=version+1,updated_at=now() WHERE id=$1",
    [booking.id],
  );
  let promotedId: string | undefined;
  if (booking.status === 'confirmed') {
    const { rows: waitlist } = await tx.query<ClassBooking>(
      "SELECT * FROM class_bookings WHERE session_id=$1 AND status='waitlist' ORDER BY waitlist_position,created_at,id LIMIT 1",
      [booking.session_id],
    );
    if (waitlist[0]) {
      promotedId = waitlist[0].id;
      await tx.query(
        "UPDATE class_bookings SET status='confirmed',waitlist_position=null,version=version+1,updated_at=now() WHERE id=$1",
        [promotedId],
      );
    }
  }
  await audit(tx, actor, 'booking.cancelled', 'Reserva cancelada', {
    id: booking.id,
    sessionId: booking.session_id,
    previousStatus: booking.status,
    promotedId,
  });
  return { id: booking.id };
}

export async function cancelSession(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'session.cancel' }>,
) {
  const { rows } = await tx.query<ClassSession>('SELECT * FROM class_sessions WHERE id=$1', [c.id]);
  const session = rows[0];
  check(session, 'Clase no encontrada.', 404);
  check(session.version === c.expectedVersion, 'La clase cambió. Actualizá la pantalla.', 409);
  check(session.state === 'scheduled', 'La clase ya está cerrada.', 409);
  await tx.query("UPDATE class_sessions SET state='cancelled',version=version+1 WHERE id=$1", [
    c.id,
  ]);
  const { rows: changed } = await tx.query<{ id: string }>(
    "UPDATE class_bookings SET status='cancelled',waitlist_position=null,version=version+1,updated_at=now() WHERE session_id=$1 AND status IN ('confirmed','waitlist') RETURNING id",
    [c.id],
  );
  await audit(tx, actor, 'session.cancelled', `Clase cancelada: ${session.title}`, {
    id: c.id,
    affectedBookings: changed.map((booking) => booking.id),
  });
  return { id: c.id, count: changed.length };
}

export async function saveAttendance(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'attendance.save' }>,
) {
  const config = await settings(tx);
  const today = localDate(config.value.timeZone);
  const { rows: sessions } = await tx.query<ClassSession>(
    'SELECT * FROM class_sessions WHERE id=$1',
    [c.sessionId],
  );
  const session = sessions[0];
  check(session, 'Clase no encontrada.', 404);
  check(session.version === c.expectedVersion, 'La clase cambió. Actualizá la pantalla.', 409);
  check(session.state !== 'cancelled', 'La clase está cancelada.', 409);
  check(session.session_date <= today, 'La asistencia se habilita el día de la clase.', 409);
  const { rows: roster } = await tx.query<ClassBooking>(
    "SELECT * FROM class_bookings WHERE session_id=$1 AND status IN ('confirmed','present','absent','no_show') ORDER BY created_at,id",
    [session.id],
  );
  check(roster.length > 0, 'La clase no tiene alumnos confirmados.', 409);
  const items = new Map(c.items.map((item) => [item.bookingId, item]));
  check(
    items.size === roster.length && roster.every((booking) => items.has(booking.id)),
    'La nómina cambió. Actualizá la pantalla.',
    409,
  );
  for (const booking of roster) {
    const item = items.get(booking.id)!;
    check(
      item.expectedVersion === booking.version,
      'La asistencia cambió. Actualizá la pantalla.',
      409,
    );
  }
  for (const booking of roster) {
    const item = items.get(booking.id)!;
    await tx.query(
      'UPDATE class_bookings SET status=$1,version=version+1,updated_at=now() WHERE id=$2',
      [item.status, booking.id],
    );
  }
  await tx.query("UPDATE class_sessions SET state='completed',version=version+1 WHERE id=$1", [
    session.id,
  ]);
  await audit(tx, actor, 'attendance.saved', `Asistencia registrada: ${session.title}`, {
    sessionId: session.id,
    before: roster.map((booking) => ({ id: booking.id, status: booking.status })),
    after: c.items.map((item) => ({ id: item.bookingId, status: item.status })),
  });
  return { id: session.id, count: roster.length };
}
