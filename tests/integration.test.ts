import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import type { Actor } from '../src/contracts/workspace';
import { createDatabase, tenantTransaction } from '../src/infrastructure/database';
import {
  register,
  login,
  createSession,
  authenticate,
  logout,
  consumeAttempt,
} from '../src/modules/identity/auth';
import { execute } from '../src/modules/dispatch';
import { getWorkspace } from '../src/modules/reporting/workspace';
import { localDate, addDays, financialStatus } from '../src/domain/finance';
import { nextPeriod } from '../src/domain/monthly-billing';
let db: PGlite, actor: Actor, other: Actor, locationId: string;
const today = localDate('America/Argentina/Buenos_Aires');
beforeAll(async () => {
  db = await createDatabase();
  actor = await register(db, {
    email: 'a@kano.test',
    password: 'correct horse battery staple',
    name: 'Owner A',
    organization: 'Espacio A',
  });
  other = await register(db, {
    email: 'b@kano.test',
    password: 'another long test password',
    name: 'Owner B',
    organization: 'Espacio B',
  });
  locationId = (
    await execute(db, actor, {
      type: 'location.save',
      name: 'Sede A',
      address: 'Domicilio de prueba',
      state: 'active',
    })
  ).id;
});
afterAll(async () => {
  await db?.close();
});
async function student() {
  return execute(db, actor, {
    type: 'student.save',
    name: 'Ana de Prueba',
    contact: 'ana@kano.test',
    birthDate: '1990-01-01',
    state: 'active',
  });
}
async function service(capacity = 10) {
  return execute(db, actor, {
    type: 'service.save',
    name: 'Muay Thai',
    discipline: 'Muay Thai',
    modality: 'group',
    locationId,
    days: [1, 3],
    time: '18:00',
    duration: 60,
    capacity,
    amount: 4500000,
    currency: 'ARS',
    effectiveOn: today,
  });
}
async function enrolled() {
  const s = await student();
  const v = await service();
  const e = await execute(db, actor, {
    type: 'enrollment.create',
    studentId: s.id,
    serviceId: v.id,
    dueDate: addDays(today, 4),
  });
  return { s, v, e };
}
describe('Identidad y límites de acceso', () => {
  it('autentica sin exponer hashes, revoca sesión inmediatamente', async () => {
    const a = await login(db, 'a@kano.test', 'correct horse battery staple');
    expect(a.organizationId).toBe(actor.organizationId);
    expect(a).not.toHaveProperty('password_hash');
    const token = await createSession(db, a);
    expect(await authenticate(db, token)).toEqual(a);
    await logout(db, token);
    await expect(authenticate(db, token)).rejects.toMatchObject({ status: 401 });
  });
  it('rechaza contraseñas incorrectas y usuarios inexistentes de igual forma', async () => {
    await expect(login(db, 'a@kano.test', 'incorrect')).rejects.toMatchObject({ status: 401 });
    await expect(login(db, 'unknown@kano.test', 'incorrect')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('limita intentos persistentemente', async () => {
    await consumeAttempt(db, 'test-bucket', 2);
    await consumeAttempt(db, 'test-bucket', 2);
    await expect(consumeAttempt(db, 'test-bucket', 2)).rejects.toMatchObject({ status: 429 });
  });
  it('rechaza rol alumno en lectura administrativa y mutación', async () => {
    await expect(getWorkspace(db, { ...actor, role: 'student' })).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      execute(db, { ...actor, role: 'student' }, { type: 'student.save' }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('RLS bloquea lectura cruzada y tablas de identidad', async () => {
    const s = await student();
    const result = await tenantTransaction(db, other, (tx) =>
      tx.query('SELECT * FROM students WHERE id=$1', [s.id]),
    );
    expect(result.rows).toHaveLength(0);
    await expect(
      tenantTransaction(db, other, (tx) => tx.query('SELECT * FROM accounts')),
    ).rejects.toThrow();
  });
  it('RLS bloquea escribir otra organización incluso con SQL directo', async () => {
    await expect(
      tenantTransaction(db, other, (tx) =>
        tx.query(
          "INSERT INTO students(id,organization_id,name,contact,birth_date,state) VALUES($1,$2,'Cross','other@x.test','1990-01-01','active')",
          [randomUUID(), actor.organizationId],
        ),
      ),
    ).rejects.toThrow();
  });
  it('rechaza referencias de otro tenant y no deja cargos parciales', async () => {
    const { s, v } = await enrolled();
    const before = (await getWorkspace(db, other)).charges.length;
    await expect(
      execute(db, other, {
        type: 'enrollment.create',
        studentId: s.id,
        serviceId: v.id,
        dueDate: today,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect((await getWorkspace(db, other)).charges.length).toBe(before);
  });
  it('no admite menores en la primera entrega', async () => {
    await expect(
      execute(db, actor, {
        type: 'student.save',
        name: 'Menor Test',
        contact: 'tutor@test.com',
        birthDate: addDays(today, -365),
        state: 'active',
      }),
    ).rejects.toThrow('adultos');
  });
});
describe('Cuenta corriente, concurrencia y auditoría', () => {
  it('genera cuotas mensuales con contrato congelado, sin duplicar reintentos', async () => {
    const { e } = await enrolled();
    const workspace = await getWorkspace(db, actor);
    const first = workspace.charges.find((charge) => charge.id === e.chargeId)!;
    const enrollment = workspace.enrollments.find((item) => item.id === e.id)!;
    const period = nextPeriod(first.period);
    const command = {
      type: 'billing.generate',
      period,
      idempotencyKey: randomUUID(),
      items: [
        {
          enrollmentId: enrollment.id,
          expectedServiceVersionId: enrollment.service_version_id,
          expectedAmount: first.amount,
          expectedCurrency: first.currency as 'ARS',
          dueDate: `${period}-10`,
        },
      ],
    } as const;
    const batch = await execute(db, actor, command);
    expect(batch.count).toBe(1);
    expect(await execute(db, actor, command)).toEqual(batch);
    const after = await getWorkspace(db, actor);
    expect(after.charges.filter((charge) => charge.enrollment_id === e.id)).toHaveLength(2);
    expect(after.charges.find((charge) => charge.period === period)).toMatchObject({
      amount: first.amount,
      currency: first.currency,
      due_date: `${period}-10`,
    });
    await expect(
      execute(db, actor, { ...command, idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('si una vista previa quedó vieja no crea cargos parciales', async () => {
    const { e } = await enrolled();
    const workspace = await getWorkspace(db, actor);
    const first = workspace.charges.find((charge) => charge.id === e.chargeId)!;
    const enrollment = workspace.enrollments.find((item) => item.id === e.id)!;
    const period = nextPeriod(first.period);
    const before = workspace.charges.length;
    await expect(
      execute(db, actor, {
        type: 'billing.generate',
        period,
        idempotencyKey: randomUUID(),
        items: [
          {
            enrollmentId: e.id,
            expectedServiceVersionId: enrollment.service_version_id,
            expectedAmount: first.amount + 1,
            expectedCurrency: first.currency,
            dueDate: `${period}-10`,
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getWorkspace(db, actor)).charges).toHaveLength(before);
  });
  it('dos lotes concurrentes no duplican la cuota del período', async () => {
    const { e } = await enrolled();
    const workspace = await getWorkspace(db, actor);
    const first = workspace.charges.find((charge) => charge.id === e.chargeId)!;
    const enrollment = workspace.enrollments.find((item) => item.id === e.id)!;
    const period = nextPeriod(first.period);
    const base = {
      type: 'billing.generate',
      period,
      items: [
        {
          enrollmentId: e.id,
          expectedServiceVersionId: enrollment.service_version_id,
          expectedAmount: first.amount,
          expectedCurrency: first.currency,
          dueDate: `${period}-12`,
        },
      ],
    } as const;
    const results = await Promise.allSettled([
      execute(db, actor, { ...base, idempotencyKey: randomUUID() }),
      execute(db, actor, { ...base, idempotencyKey: randomUUID() }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await getWorkspace(db, actor)).charges.filter(
        (charge) => charge.enrollment_id === e.id && charge.period === period,
      ),
    ).toHaveLength(1);
  });
  it('finalizar una inscripción libera el cupo sin borrar su cargo ni pago', async () => {
    const { e } = await enrolled();
    const payment = await execute(db, actor, {
      type: 'payment.record',
      chargeId: e.chargeId,
      amount: 1000000,
      method: 'cash',
      reference: 'Baja con saldo',
      idempotencyKey: randomUUID(),
    });
    await execute(db, actor, { type: 'enrollment.end', id: e.id });
    const data = await getWorkspace(db, actor);
    expect(data.enrollments.find((v) => v.id === e.id)?.state).toBe('ended');
    expect(data.charges.find((v) => v.id === e.chargeId)).toMatchObject({
      amount: 4500000,
      paid: 1000000,
    });
    expect(data.payments.some((v) => v.id === payment.id)).toBe(true);
    expect(data.audit.some((v) => v.action === 'enrollment.ended')).toBe(true);
  });
  it('flujo vertical completo conserva saldo y evita duplicar un reintento', async () => {
    const { s, e } = await enrolled();
    const key = randomUUID();
    const c = {
      type: 'payment.record',
      chargeId: e.chargeId,
      amount: 2000000,
      method: 'cash',
      reference: 'test',
      idempotencyKey: key,
    };
    const p = await execute(db, actor, c);
    expect(await execute(db, actor, c)).toEqual(p);
    const w = await getWorkspace(db, actor);
    const charge = w.charges.find((c) => c.id === e.chargeId)!;
    expect(charge.paid).toBe(2000000);
    expect(
      financialStatus(
        [{ amount: charge.amount, paid: charge.paid, dueDate: charge.due_date }],
        true,
        today,
        7,
      ),
    ).toBe('partial');
    expect(w.students.find((st) => st.id === s.id)).toBeTruthy();
    expect(w.audit.some((a) => a.action === 'payment.recorded')).toBe(true);
    expect(w.payments.filter((v) => v.id === p.id)).toHaveLength(1);
  });
  it('rechaza reutilizar una clave con diferente contenido', async () => {
    const { e } = await enrolled();
    const c = {
      type: 'payment.record',
      chargeId: e.chargeId,
      amount: 10,
      method: 'cash',
      reference: 'test',
      idempotencyKey: randomUUID(),
    };
    await execute(db, actor, c);
    await expect(execute(db, actor, { ...c, amount: 20 })).rejects.toMatchObject({ status: 409 });
  });
  it('no sobrepaga con solicitudes concurrentes', async () => {
    const { e } = await enrolled();
    const c = {
      type: 'payment.record',
      chargeId: e.chargeId,
      amount: 3000000,
      method: 'cash',
      reference: '',
    };
    const result = await Promise.allSettled([
      execute(db, actor, { ...c, idempotencyKey: randomUUID() }),
      execute(db, actor, { ...c, idempotencyKey: randomUUID() }),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await getWorkspace(db, actor)).charges.find((c) => c.id === e.chargeId)?.paid).toBe(
      3000000,
    );
  });
  it('un fallo no escribe pago ni auditoría', async () => {
    const { e } = await enrolled();
    const before = await getWorkspace(db, actor);
    await expect(
      execute(db, actor, {
        type: 'payment.record',
        chargeId: e.chargeId,
        amount: 5000000,
        method: 'cash',
        reference: '',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    const after = await getWorkspace(db, actor);
    expect(after.payments.length).toBe(before.payments.length);
    expect(after.audit.length).toBe(before.audit.length);
  });
  it('pago no puede actualizarse ni borrarse, tampoco por error del módulo', async () => {
    const { e } = await enrolled();
    const p = await execute(db, actor, {
      type: 'payment.record',
      chargeId: e.chargeId,
      amount: 100,
      method: 'cash',
      reference: '',
      idempotencyKey: randomUUID(),
    });
    await expect(db.query('UPDATE payments SET amount=200 WHERE id=$1', [p.id])).rejects.toThrow(
      'immutable',
    );
    await expect(db.query('DELETE FROM payments WHERE id=$1', [p.id])).rejects.toThrow('immutable');
  });
  it('archivo mantiene deuda y prohíbe nueva inscripción', async () => {
    const { s, e } = await enrolled();
    await execute(db, actor, {
      type: 'student.save',
      id: s.id,
      expectedVersion: 1,
      name: 'Ana de Prueba',
      contact: 'ana@kano.test',
      birthDate: '1990-01-01',
      state: 'archived',
    });
    expect((await getWorkspace(db, actor)).charges.find((c) => c.id === e.chargeId)?.amount).toBe(
      4500000,
    );
    const v = await service();
    await expect(
      execute(db, actor, {
        type: 'enrollment.create',
        studentId: s.id,
        serviceId: v.id,
        dueDate: today,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
describe('Configuración y oferta adaptable', () => {
  it('no vuelve a condiciones antiguas si la sede de la versión vigente se pausa', async () => {
    const s = await student();
    const v = await service();
    const newLocation = await execute(db, actor, {
      type: 'location.save',
      name: 'Sede nueva',
      address: '',
      state: 'active',
    });
    await execute(db, actor, {
      type: 'service.save',
      id: v.id,
      expectedVersion: 1,
      name: 'Servicio trasladado',
      discipline: 'Muay Thai',
      modality: 'group',
      locationId: newLocation.id,
      days: [1, 3],
      time: '20:00',
      duration: 60,
      capacity: 10,
      amount: 6000000,
      currency: 'ARS',
      effectiveOn: addDays(today, 1),
    });
    await execute(db, actor, {
      type: 'location.save',
      id: newLocation.id,
      expectedVersion: 1,
      name: 'Sede nueva',
      address: '',
      state: 'paused',
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${addDays(today, 1)}T15:00:00Z`));
    try {
      await expect(
        execute(db, actor, {
          type: 'enrollment.create',
          studentId: s.id,
          serviceId: v.id,
          dueDate: addDays(today, 5),
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect((await getWorkspace(db, actor)).enrollments.some((e) => e.student_id === s.id)).toBe(
        false,
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it('dos alumnos compitiendo por un lugar no generan sobrecupo', async () => {
    const v = await service(1);
    const a = await student(),
      b = await student();
    const result = await Promise.allSettled(
      [a, b].map((s) =>
        execute(db, actor, {
          type: 'enrollment.create',
          studentId: s.id,
          serviceId: v.id,
          dueDate: today,
        }),
      ),
    );
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await getWorkspace(db, actor)).enrollments.filter((e) => e.service_id === v.id),
    ).toHaveLength(1);
  });
  it('cambia precio futuro sin alterar cargo ni inscripción anterior', async () => {
    const { v, e } = await enrolled();
    await execute(db, actor, {
      type: 'service.save',
      id: v.id,
      expectedVersion: 1,
      name: 'Muay Thai nuevo',
      discipline: 'Muay Thai',
      modality: 'group',
      locationId,
      days: [2, 4],
      time: '20:00',
      duration: 90,
      capacity: 12,
      amount: 8000000,
      currency: 'USD',
      effectiveOn: addDays(today, 1),
    });
    const w = await getWorkspace(db, actor);
    expect(w.serviceVersions.filter((x) => x.service_id === v.id)).toHaveLength(2);
    expect(w.charges.find((c) => c.id === e.chargeId)).toMatchObject({
      amount: 4500000,
      currency: 'ARS',
    });
    const versionId = w.enrollments.find((x) => x.id === e.id)?.service_version_id;
    expect(w.serviceVersions.find((x) => x.id === versionId)?.time).toBe('18:00');
  });
  it('rechaza edición con versión vieja', async () => {
    const s = await student();
    const c = {
      type: 'student.save',
      id: s.id,
      expectedVersion: 1,
      name: 'Otro nombre',
      contact: 'a@test.com',
      birthDate: '1990-01-01',
      state: 'active',
    };
    await execute(db, actor, c);
    await expect(execute(db, actor, c)).rejects.toMatchObject({ status: 409 });
  });
  it('cambia configuración y conserva versiones, no moneda histórica', async () => {
    const before = await getWorkspace(db, actor);
    await execute(db, actor, {
      type: 'settings.save',
      expectedVersion: before.settingsVersion,
      settings: { ...before.settings, currency: 'USD', noticeDays: 3, paymentMethods: ['cash'] },
    });
    const after = await getWorkspace(db, actor);
    expect(after.settingsVersion).toBe(before.settingsVersion + 1);
    expect(after.settings.noticeDays).toBe(3);
    expect(after.charges[0].currency).toBe(before.charges[0].currency);
    await expect(
      execute(db, actor, {
        type: 'settings.save',
        expectedVersion: before.settingsVersion,
        settings: before.settings,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
