import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, expect } from 'vitest';
import { createDatabase } from '../src/infrastructure/database';
import { register, login } from '../src/modules/identity/auth';
import { execute } from '../src/modules/dispatch';
import { getWorkspace } from '../src/modules/reporting/workspace';

it('conserva identidad, alumno y auditoría al cerrar y reabrir la base en disco', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kano-persistence-'));
  let db = await createDatabase(join(directory, 'db'));
  try {
    const actor = await register(db, {
      email: 'persistencia@kano.test',
      password: 'test-only-persistence-password',
      name: 'Prueba Persistencia',
      organization: 'Espacio Persistente',
    });
    const student = await execute(db, actor, {
      type: 'student.save',
      name: 'Alumno Persistente',
      contact: 'fixture@kano.test',
      birthDate: '1990-01-01',
      state: 'active',
    });
    await db.close();
    db = await createDatabase(join(directory, 'db'));
    const restoredActor = await login(
      db,
      'persistencia@kano.test',
      'test-only-persistence-password',
    );
    const data = await getWorkspace(db, restoredActor);
    expect(restoredActor.organizationId).toBe(actor.organizationId);
    expect(data.students.find((s) => s.id === student.id)?.name).toBe('Alumno Persistente');
    expect(data.audit.some((e) => e.action === 'student.created')).toBe(true);
    const migrations = await db.query('SELECT name FROM kano_migrations');
    expect(migrations.rows).toEqual([
      { name: '001-initial' },
      { name: '002-monthly-charges' },
      { name: '003-scheduling' },
    ]);
  } finally {
    await db.close();
    // Only the private directory created above belongs to this test.
    await rm(directory, { recursive: true, force: true });
  }
});
