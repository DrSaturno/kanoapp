import { createHash, randomUUID } from 'node:crypto';
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

type BillingContract = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  service_version_id: string;
  description: string;
  amount: number;
  currency: string;
  first_period: string;
};

export async function generateMonthlyCharges(
  tx: Tx,
  actor: Actor,
  c: Extract<Command, { type: 'billing.generate' }>,
) {
  const canonicalItems = [...c.items].sort((a, b) => a.enrollmentId.localeCompare(b.enrollmentId));
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ period: c.period, items: canonicalItems }))
    .digest('hex');
  const { rows: previous } = await tx.query<{
    id: string;
    request_hash: string;
    item_count: number;
  }>('SELECT id,request_hash,item_count FROM billing_batches WHERE idempotency_key=$1', [
    c.idempotencyKey,
  ]);
  if (previous[0]) {
    check(
      previous[0].request_hash === requestHash,
      'Esta operación ya se usó con otros datos. Actualizá la pantalla.',
      409,
    );
    return { id: previous[0].id, count: previous[0].item_count };
  }

  const batchId = randomUUID();
  const totals: Record<string, number> = {};
  for (const item of canonicalItems) {
    const { rows } = await tx.query<BillingContract>(
      `SELECT e.id AS enrollment_id,e.student_id,st.name AS student_name,
        e.service_version_id,v.name AS description,v.amount,v.currency,
        min(cp.period) AS first_period
       FROM enrollments e
       JOIN students st ON st.id=e.student_id AND st.state='active'
       JOIN services s ON s.id=e.service_id AND s.state='active'
       JOIN service_versions v ON v.id=e.service_version_id
       JOIN charge_periods cp ON cp.enrollment_id=e.id
       WHERE e.id=$1 AND e.state='active'
       GROUP BY e.id,st.name,v.id`,
      [item.enrollmentId],
    );
    const contract = rows[0];
    check(contract, 'La inscripción ya no está disponible para generar la cuota.', 409);
    check(
      contract.service_version_id === item.expectedServiceVersionId &&
        contract.amount === item.expectedAmount &&
        contract.currency === item.expectedCurrency,
      'Las condiciones de una inscripción cambiaron. Actualizá la vista previa.',
      409,
    );
    check(c.period >= contract.first_period, 'El período es anterior al primer cargo.', 409);
    const { rows: existing } = await tx.query<{ id: string }>(
      'SELECT id FROM charge_periods WHERE enrollment_id=$1 AND period=$2',
      [item.enrollmentId, c.period],
    );
    check(!existing[0], `Ya existe una cuota de ${c.period} para ${contract.student_name}.`, 409);
    const chargeId = randomUUID();
    await tx.query(
      'INSERT INTO charges(id,organization_id,student_id,enrollment_id,description,amount,currency,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        chargeId,
        actor.organizationId,
        contract.student_id,
        item.enrollmentId,
        contract.description,
        contract.amount,
        contract.currency,
        item.dueDate,
      ],
    );
    await tx.query(
      'INSERT INTO charge_periods(id,organization_id,enrollment_id,period,charge_id) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), actor.organizationId, item.enrollmentId, c.period, chargeId],
    );
    totals[contract.currency] = (totals[contract.currency] ?? 0) + contract.amount;
  }
  await tx.query(
    'INSERT INTO billing_batches(id,organization_id,idempotency_key,request_hash,period,item_count) VALUES($1,$2,$3,$4,$5,$6)',
    [batchId, actor.organizationId, c.idempotencyKey, requestHash, c.period, canonicalItems.length],
  );
  await audit(
    tx,
    actor,
    'billing.generated',
    `${canonicalItems.length} cuota${canonicalItems.length === 1 ? '' : 's'} generada${canonicalItems.length === 1 ? '' : 's'} · ${c.period}`,
    {
      batchId,
      period: c.period,
      totals,
      enrollmentIds: canonicalItems.map((item) => item.enrollmentId),
    },
  );
  return { id: batchId, count: canonicalItems.length };
}
