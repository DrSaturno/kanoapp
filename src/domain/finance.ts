export type FinancialStatus = 'paid' | 'upcoming' | 'partial' | 'overdue' | 'inactive';
export const statusLabels: Record<FinancialStatus, string> = {
  paid: 'Al día',
  upcoming: 'Próximo a vencer',
  partial: 'Pago parcial',
  overdue: 'Vencido',
  inactive: 'Sin plan activo',
};
export interface Balance {
  amount: number;
  paid: number;
  dueDate: string;
}
export function financialStatus(
  charges: Balance[],
  active: boolean,
  today: string,
  noticeDays: number,
): FinancialStatus {
  const open = charges.filter((c) => c.amount > c.paid);
  // Activity must never hide a debt.
  if (open.some((c) => c.dueDate < today)) return 'overdue';
  if (open.some((c) => c.paid > 0)) return 'partial';
  if (open.some((c) => c.dueDate <= addDays(today, noticeDays))) return 'upcoming';
  return active ? 'paid' : 'inactive';
}
export function parseMoney(value: string): number {
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(value.trim()))
    throw new Error('Ingresá un importe positivo con hasta dos decimales, sin separador de miles.');
  const [units, cents = ''] = value.trim().replace(',', '.').split('.');
  const minor = Number(units) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 2_000_000_000)
    throw new Error('El importe debe ser mayor a cero y menor a 20 millones.');
  return minor;
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 100 ? 2 : 0,
  }).format(amount / 100);
}
export function localDate(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function nextMonth(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date, last), 12)).toISOString().slice(0, 10);
}
export function shortDate(date: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(date.slice(0, 10) + 'T12:00:00Z'));
}
