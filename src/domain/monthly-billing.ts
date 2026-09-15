import type { Workspace } from '../contracts/workspace';

export interface BillingCandidate {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  serviceVersionId: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
}

export function nextPeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return date.toISOString().slice(0, 7);
}

export function dueDateForPeriod(anchor: string, period: string) {
  const day = Number(anchor.slice(8, 10));
  const [year, month] = period.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

export function billingCandidates(data: Workspace, period: string): BillingCandidate[] {
  return data.enrollments
    .filter((enrollment) => enrollment.state === 'active')
    .flatMap((enrollment) => {
      const student = data.students.find(
        (item) => item.id === enrollment.student_id && item.state === 'active',
      );
      const service = data.services.find(
        (item) => item.id === enrollment.service_id && item.state === 'active',
      );
      const version = data.serviceVersions.find(
        (item) => item.id === enrollment.service_version_id,
      );
      const charges = data.charges
        .filter((charge) => charge.enrollment_id === enrollment.id)
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
      if (!student || !service || !version || !charges[0]) return [];
      if (charges.some((charge) => charge.period === period) || period < charges[0].period)
        return [];
      return [
        {
          enrollmentId: enrollment.id,
          studentId: student.id,
          studentName: student.name,
          serviceVersionId: version.id,
          description: version.name,
          amount: version.amount,
          currency: version.currency,
          dueDate: dueDateForPeriod(charges[0].due_date, period),
        },
      ];
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'es'));
}
