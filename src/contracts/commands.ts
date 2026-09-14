import { z } from 'zod';
const id = z.string().uuid();
const text = z.string().trim().min(2, 'Ingresá al menos 2 caracteres.').max(120);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Fecha inválida.',
  );
const currency = z.enum(['ARS', 'USD', 'EUR', 'UYU', 'CLP', 'MXN', 'BRL']);
const amount = z.number().int().positive().max(2_000_000_000);
const state = z.enum(['active', 'paused', 'archived']);
const expectedVersion = z.number().int().positive();
const methods = z
  .array(z.enum(['cash', 'transfer']))
  .min(1)
  .max(2)
  .refine((v) => new Set(v).size === v.length);
export const settingsSchema = z
  .object({
    name: text,
    timeZone: z
      .string()
      .max(80)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat('es', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Zona horaria inválida.'),
    currency,
    noticeDays: z.number().int().min(0).max(60),
    paymentMethods: methods,
  })
  .strict();
export const studentSchema = z
  .object({
    type: z.literal('student.save'),
    id: id.optional(),
    expectedVersion: expectedVersion.optional(),
    name: text,
    contact: z.string().trim().min(5).max(160),
    birthDate: date,
    state,
  })
  .strict();
export const serviceSchema = z
  .object({
    type: z.literal('service.save'),
    id: id.optional(),
    expectedVersion: expectedVersion.optional(),
    name: text,
    discipline: text,
    modality: z.enum(['group', 'personal', 'hybrid']),
    locationId: id,
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    duration: z.number().int().min(15).max(240),
    capacity: z.number().int().min(1).max(500),
    amount,
    currency,
    effectiveOn: date,
  })
  .strict();
export const commandSchema = z.discriminatedUnion('type', [
  studentSchema,
  serviceSchema,
  z.object({ type: z.literal('service.state'), id, expectedVersion, state }).strict(),
  z
    .object({ type: z.literal('enrollment.create'), studentId: id, serviceId: id, dueDate: date })
    .strict(),
  z.object({ type: z.literal('enrollment.end'), id }).strict(),
  z
    .object({
      type: z.literal('payment.record'),
      chargeId: id,
      amount,
      method: z.enum(['cash', 'transfer']),
      reference: z.string().trim().max(160),
      idempotencyKey: id,
    })
    .strict(),
  z
    .object({ type: z.literal('settings.save'), expectedVersion, settings: settingsSchema })
    .strict(),
  z
    .object({
      type: z.literal('location.save'),
      id: id.optional(),
      expectedVersion: expectedVersion.optional(),
      name: text,
      address: z.string().trim().max(180),
      state,
    })
    .strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const authSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('login'),
      email: z
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      action: z.literal('register'),
      email: z
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(12, 'Usá al menos 12 caracteres.').max(128),
      name: text,
      organization: text,
    })
    .strict(),
  z.object({ action: z.literal('logout') }).strict(),
]);
