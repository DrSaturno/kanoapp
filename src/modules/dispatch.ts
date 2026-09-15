import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { Actor } from '../contracts/workspace';
import { commandSchema } from '../contracts/commands';
import { check } from '../domain/errors';
import { tenantTransaction } from '../infrastructure/database';
import { saveStudent } from './students/commands';
import { saveService, serviceState, saveLocation } from './catalog/commands';
import { enroll, endEnrollment } from './enrollments/commands';
import { generateMonthlyCharges, recordPayment } from './billing/commands';
import { audit, settings } from './shared';
export async function execute(
  db: PGlite,
  actor: Actor,
  input: unknown,
): Promise<{ id: string; chargeId?: string; count?: number }> {
  check(
    actor.role === 'owner' || actor.role === 'admin',
    'No tenés permiso para esta operación.',
    403,
  );
  const c = commandSchema.parse(input);
  return tenantTransaction(db, actor, async (tx) => {
    switch (c.type) {
      case 'student.save':
        return saveStudent(tx, actor, c);
      case 'service.save':
        return saveService(tx, actor, c);
      case 'service.state':
        return serviceState(tx, actor, c);
      case 'location.save':
        return saveLocation(tx, actor, c);
      case 'enrollment.create':
        return enroll(tx, actor, c);
      case 'enrollment.end':
        return endEnrollment(tx, actor, c);
      case 'payment.record':
        return recordPayment(tx, actor, c);
      case 'billing.generate':
        return generateMonthlyCharges(tx, actor, c);
      case 'settings.save': {
        check(actor.role === 'owner', 'Sólo el dueño puede cambiar la configuración global.', 403);
        const current = await settings(tx);
        check(
          current.version === c.expectedVersion,
          'La configuración cambió. Actualizá la pantalla.',
          409,
        );
        const id = randomUUID();
        await tx.query(
          'INSERT INTO settings_versions(id,organization_id,version,value) VALUES($1,$2,$3,$4)',
          [id, actor.organizationId, current.version + 1, JSON.stringify(c.settings)],
        );
        await audit(
          tx,
          actor,
          'settings.versioned',
          `Configuración actualizada · versión ${current.version + 1}`,
          { before: current.value, after: c.settings },
        );
        return { id };
      }
    }
  });
}
