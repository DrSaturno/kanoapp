import { randomUUID } from 'node:crypto';
import type { Tx } from '../../infrastructure/database';
import type { Actor, Student } from '../../contracts/workspace';
import type { Command } from '../../contracts/commands';
import { check } from '../../domain/errors';
import { audit, settings } from '../shared';
import { localDate } from '../../domain/finance';
export async function saveStudent(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'student.save' }>,
) {
  const current = await settings(tx);
  const today = localDate(current.value.timeZone);
  const ageDate = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  check(
    c.birthDate <= ageDate && c.birthDate > `${Number(today.slice(0, 4)) - 110}-01-01`,
    'Esta primera entrega admite alumnos adultos. Revisá la fecha de nacimiento.',
  );
  const id = c.id ?? randomUUID();
  if (c.id) {
    const { rows } = await tx.query<Student>('SELECT * FROM students WHERE id=$1', [id]);
    check(rows[0], 'Alumno no encontrado.', 404);
    check(
      rows[0].version === c.expectedVersion,
      'El alumno cambió. Actualizá la pantalla antes de guardar.',
      409,
    );
    await tx.query(
      'UPDATE students SET name=$1,contact=$2,birth_date=$3,state=$4,version=version+1 WHERE id=$5',
      [c.name, c.contact, c.birthDate, c.state, id],
    );
    await audit(tx, actor, 'student.updated', `Ficha actualizada: ${c.name}`, {
      id,
      before: rows[0].state,
      after: c.state,
    });
  } else {
    await tx.query(
      'INSERT INTO students(id,organization_id,name,contact,birth_date,state) VALUES($1,$2,$3,$4,$5,$6)',
      [id, actor.organizationId, c.name, c.contact, c.birthDate, c.state],
    );
    await audit(tx, actor, 'student.created', `Nuevo alumno: ${c.name}`, { id });
  }
  return { id };
}
