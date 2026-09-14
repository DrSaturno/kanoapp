import { randomUUID } from 'node:crypto';
import type { Tx } from '../../infrastructure/database';
import type { Actor, Charge, Payment } from '../../contracts/workspace';
import type { Command } from '../../contracts/commands';
import { check } from '../../domain/errors';
import { audit, settings } from '../shared';
export async function recordPayment(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'payment.record' }>,
) {
  const { rows: previous } = await tx.query<Payment>(
    'SELECT * FROM payments WHERE idempotency_key=$1',
    [c.idempotencyKey],
  );
  if (previous[0]) {
    const p = previous[0];
    check(
      p.charge_id === c.chargeId &&
        p.amount === c.amount &&
        p.method === c.method &&
        p.reference === c.reference,
      'Esta operación ya se usó para otro pago. Actualizá la pantalla.',
      409,
    );
    return { id: p.id };
  }
  const config = await settings(tx);
  check(
    config.value.paymentMethods.includes(c.method),
    'Este medio de pago no está habilitado.',
    409,
  );
  const { rows } = await tx.query<Charge>('SELECT * FROM charges WHERE id=$1', [c.chargeId]);
  const charge = rows[0];
  check(charge, 'Cargo no encontrado.', 404);
  const { rows: sum } = await tx.query<{ paid: number }>(
    'SELECT coalesce(sum(amount),0)::int AS paid FROM payments WHERE charge_id=$1',
    [c.chargeId],
  );
  check(
    c.amount <= charge.amount - sum[0].paid,
    'El importe supera el saldo pendiente. Actualizá la cuenta.',
    409,
  );
  const id = randomUUID();
  await tx.query(
    'INSERT INTO payments(id,organization_id,charge_id,amount,currency,method,reference,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      id,
      actor.organizationId,
      c.chargeId,
      c.amount,
      charge.currency,
      c.method,
      c.reference,
      c.idempotencyKey,
    ],
  );
  await audit(tx, actor, 'payment.recorded', `Pago registrado · ${charge.description}`, {
    id,
    chargeId: c.chargeId,
    amount: c.amount,
    currency: charge.currency,
  });
  return { id };
}
