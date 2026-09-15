import type { ServiceVersion, Workspace } from '../contracts/workspace';
import { addDays } from './finance';

export interface SessionCandidate {
  serviceId: string;
  serviceVersionId: string;
  title: string;
  discipline: string;
  modality: ServiceVersion['modality'];
  locationId: string;
  locationName: string;
  sessionDate: string;
  startTime: string;
  duration: number;
  capacity: number;
}

export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function datesBetween(fromDate: string, toDate: string) {
  const result: string[] = [];
  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) result.push(date);
  return result;
}

export function effectiveVersion(versions: ServiceVersion[], serviceId: string, date: string) {
  return versions
    .filter((version) => version.service_id === serviceId && version.effective_on <= date)
    .sort((a, b) => b.effective_on.localeCompare(a.effective_on))[0];
}

export function sessionCandidates(
  data: Workspace,
  fromDate: string,
  toDate: string,
  serviceIds: string[],
): SessionCandidate[] {
  const active = new Set(
    data.services
      .filter((service) => service.state === 'active' && serviceIds.includes(service.id))
      .map((service) => service.id),
  );
  const activeLocations = new Set(
    data.locations.filter((location) => location.state === 'active').map((location) => location.id),
  );
  const existing = new Set(
    data.sessions.map((session) => `${session.service_id}:${session.session_date}`),
  );
  return datesBetween(fromDate, toDate)
    .flatMap((sessionDate) =>
      [...active].flatMap((serviceId) => {
        const version = effectiveVersion(data.serviceVersions, serviceId, sessionDate);
        if (
          !version ||
          !activeLocations.has(version.location_id) ||
          !version.days.includes(weekday(sessionDate))
        )
          return [];
        if (existing.has(`${serviceId}:${sessionDate}`)) return [];
        return [
          {
            serviceId,
            serviceVersionId: version.id,
            title: version.name,
            discipline: version.discipline,
            modality: version.modality,
            locationId: version.location_id,
            locationName: version.location_name,
            sessionDate,
            startTime: version.time,
            duration: version.duration,
            capacity: version.capacity,
          },
        ];
      }),
    )
    .sort((a, b) =>
      `${a.sessionDate}:${a.startTime}:${a.title}`.localeCompare(
        `${b.sessionDate}:${b.startTime}:${b.title}`,
        'es',
      ),
    );
}
