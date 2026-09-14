import { randomUUID } from 'node:crypto';
import { database } from '../src/infrastructure/database';
import { register } from '../src/modules/identity/auth';
import { execute } from '../src/modules/dispatch';
import { localDate, addDays } from '../src/domain/finance';
const db = await database();
const email = 'entrenador@kano.test';
try {
  const exists = await db.query('SELECT id FROM accounts WHERE email=$1', [email]);
  if (exists.rows.length) {
    console.log('El espacio de ejemplo ya existe. No se modificaron sus datos.');
  } else {
    const actor = await register(db, {
      email,
      password: 'KanoDemo-Local-2026!',
      name: 'Alex · Demo',
      organization: 'Dojo Norte · Demo',
    });
    const today = localDate('America/Argentina/Buenos_Aires');
    const location = await execute(db, actor, {
      type: 'location.save',
      name: 'Sede Palermo · Demo',
      address: 'Dirección de ejemplo',
      state: 'active',
    });
    const services = [];
    for (const [name, discipline, modality, amount, time, days] of [
      ['Muay Thai · Tarde', 'Muay Thai', 'group', 4500000, '18:00', [1, 3, 5]],
      ['Fuerza & movilidad', 'Preparación física', 'group', 3800000, '19:30', [2, 4]],
      ['Entrenamiento 1 a 1', 'Preparación física', 'personal', 8500000, '08:00', [1, 3]],
    ] as const) {
      services.push(
        await execute(db, actor, {
          type: 'service.save',
          name,
          discipline,
          modality,
          amount,
          time,
          days: [...days],
          duration: 60,
          capacity: modality === 'personal' ? 6 : 12,
          currency: 'ARS',
          locationId: location.id,
          effectiveOn: today,
        }),
      );
    }
    const names = [
      'Valentina Torres',
      'Mateo Acosta',
      'Lucía Fernández',
      'Joaquín Molina',
      'Camila Méndez',
      'Santiago Ruiz',
      'Martina Costa',
      'Nicolás Vega',
    ];
    for (let i = 0; i < names.length; i++) {
      const student = await execute(db, actor, {
        type: 'student.save',
        name: names[i],
        contact: `alumno${i + 1}@ejemplo.test`,
        birthDate: '1994-05-12',
        state: i === 7 ? 'paused' : 'active',
      });
      if (i === 7) continue;
      const enrollment = await execute(db, actor, {
        type: 'enrollment.create',
        studentId: student.id,
        serviceId: services[i % 3].id,
        dueDate: addDays(today, i < 2 ? -5 : i < 4 ? 4 : 14),
      });
      const amount = [4500000, 3800000, 8500000][i % 3];
      if (i === 1 || i === 2 || i >= 4)
        await execute(db, actor, {
          type: 'payment.record',
          chargeId: enrollment.chargeId,
          amount: i >= 4 ? amount : Math.floor(amount / 2),
          method: 'transfer',
          reference: 'Movimiento ficticio de demostración',
          idempotencyKey: randomUUID(),
        });
    }
    console.log('Espacio de demostración creado. Todos los alumnos y movimientos son ficticios.');
  }
  console.log('Acceso local: entrenador@kano.test / KanoDemo-Local-2026!');
} finally {
  await db.close();
}
