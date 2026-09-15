import { describe, it, expect } from 'vitest';
import { parseMoney, financialStatus, nextMonth, localDate } from '../src/domain/finance';
import { commandSchema } from '../src/contracts/commands';
import { dueDateForPeriod, nextPeriod } from '../src/domain/monthly-billing';
describe('Dinero y estado financiero', () => {
  it('convierte a unidades menores sin errores binarios', () => {
    expect(parseMoney('0,29')).toBe(29);
    expect(parseMoney('1234.5')).toBe(123450);
  });
  it.each(['0', '-1', '1.001', '1,000.00', 'NaN', 'Infinity', '1e5', ''])(
    'rechaza importe inválido %s',
    (v) => expect(() => parseMoney(v)).toThrow(),
  );
  it('distingue parcial de próximo a vencer', () => {
    expect(
      financialStatus([{ amount: 100, paid: 20, dueDate: '2026-09-20' }], true, '2026-09-14', 7),
    ).toBe('partial');
    expect(
      financialStatus([{ amount: 100, paid: 0, dueDate: '2026-09-20' }], true, '2026-09-14', 7),
    ).toBe('upcoming');
  });
  it('deuda vencida prevalece sobre pausa y parcial', () =>
    expect(
      financialStatus([{ amount: 100, paid: 20, dueDate: '2026-09-01' }], false, '2026-09-14', 7),
    ).toBe('overdue'));
  it('vence al terminar la fecha local y usa ventana configurable', () => {
    expect(
      financialStatus([{ amount: 100, paid: 0, dueDate: '2026-09-14' }], true, '2026-09-14', 0),
    ).toBe('upcoming');
    expect(
      financialStatus([{ amount: 100, paid: 0, dueDate: '2026-09-20' }], true, '2026-09-14', 2),
    ).toBe('paid');
  });
  it('distingue cuenta inactiva de activa y no usa deuda pagada', () => {
    expect(
      financialStatus([{ amount: 100, paid: 100, dueDate: '2026-08-01' }], true, '2026-09-14', 7),
    ).toBe('paid');
    expect(financialStatus([], false, '2026-09-14', 7)).toBe('inactive');
  });
  it('calcula ancla mensual sin desbordar febrero', () => {
    expect(nextMonth('2026-01-31')).toBe('2026-02-28');
    expect(nextMonth('2028-01-31')).toBe('2028-02-29');
    expect(nextMonth('2026-12-31')).toBe('2027-01-31');
  });
  it('calcula períodos y vencimientos mensuales sin desbordar el mes', () => {
    expect(nextPeriod('2026-12')).toBe('2027-01');
    expect(dueDateForPeriod('2026-01-31', '2026-02')).toBe('2026-02-28');
    expect(dueDateForPeriod('2028-01-31', '2028-02')).toBe('2028-02-29');
  });
  it('usa zona horaria de negocio, no UTC del servidor', () =>
    expect(localDate('America/Argentina/Buenos_Aires', new Date('2026-09-14T01:00:00Z'))).toBe(
      '2026-09-13',
    ));
  it('no admite campos de tenant/rol ni fechas inexistentes', () => {
    expect(() =>
      commandSchema.parse({
        type: 'student.save',
        name: 'Ana Ruiz',
        contact: 'ana@test.com',
        birthDate: '2000-02-31',
        state: 'active',
      }),
    ).toThrow();
    expect(() =>
      commandSchema.parse({
        type: 'student.save',
        name: 'Ana Ruiz',
        contact: 'ana@test.com',
        birthDate: '2000-02-02',
        state: 'active',
        organizationId: crypto.randomUUID(),
      }),
    ).toThrow();
  });
});
