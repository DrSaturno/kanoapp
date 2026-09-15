import type { PGlite } from '@electric-sql/pglite';
import type {
  Actor,
  Workspace,
  Student,
  Location,
  Service,
  ServiceVersion,
  Enrollment,
  Charge,
  Payment,
  Audit,
} from '../../contracts/workspace';
import { tenantTransaction } from '../../infrastructure/database';
import { settings } from '../shared';
import { localDate } from '../../domain/finance';
import { check } from '../../domain/errors';
export async function getWorkspace(db: PGlite, actor: Actor): Promise<Workspace> {
  check(
    actor.role === 'owner' || actor.role === 'admin',
    'Panel disponible sólo para administración.',
    403,
  );
  return tenantTransaction(db, actor, async (tx) => {
    const config = await settings(tx);
    const students = await tx.query<Student>(
      'SELECT id,name,contact,birth_date,state,version FROM students ORDER BY name',
    );
    const locations = await tx.query<Location>(
      'SELECT id,name,address,state,version FROM locations ORDER BY name',
    );
    const services = await tx.query<Service>('SELECT id,state,revision FROM services');
    const serviceVersions = await tx.query<ServiceVersion>(
      'SELECT id,service_id,version,name,discipline,modality,location_id,location_name,days,time,duration,capacity,amount,currency,effective_on FROM service_versions ORDER BY effective_on DESC,version DESC',
    );
    const enrollments = await tx.query<Enrollment>(
      'SELECT id,student_id,service_id,service_version_id,state,created_at::text FROM enrollments ORDER BY created_at DESC',
    );
    const charges = await tx.query<Charge>(
      `SELECT c.id,c.student_id,c.enrollment_id,c.description,c.amount,c.currency,c.due_date,cp.period,c.created_at::text,coalesce(sum(p.amount),0)::int AS paid FROM charges c JOIN charge_periods cp ON cp.charge_id=c.id LEFT JOIN payments p ON p.charge_id=c.id GROUP BY c.id,cp.period ORDER BY c.due_date`,
    );
    const payments = await tx.query<Payment>(
      'SELECT id,charge_id,amount,currency,method,reference,created_at::text FROM payments ORDER BY created_at DESC',
    );
    const events = await tx.query<Audit>(
      'SELECT id,action,summary,created_at::text,actor_name FROM audit_events ORDER BY created_at DESC LIMIT 100',
    );
    return {
      actor,
      settings: config.value,
      settingsVersion: config.version,
      today: localDate(config.value.timeZone),
      students: students.rows,
      locations: locations.rows,
      services: services.rows,
      serviceVersions: serviceVersions.rows,
      enrollments: enrollments.rows,
      charges: charges.rows,
      payments: payments.rows,
      audit: events.rows,
    };
  });
}
