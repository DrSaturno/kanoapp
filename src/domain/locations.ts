import type { Workspace } from '../contracts/workspace';

/** Current use is distinct from immutable names printed in old service versions. */
export function locationUsage(data: Workspace, locationId: string) {
  const currentServices = data.services.filter((s) => {
    const current = data.serviceVersions.find(
      (v) => v.service_id === s.id && v.effective_on <= data.today,
    );
    return s.state === 'active' && current?.location_id === locationId;
  });
  const versionIds = new Set(
    data.serviceVersions.filter((v) => v.location_id === locationId).map((v) => v.id),
  );
  const activeEnrollments = data.enrollments.filter(
    (e) => e.state === 'active' && versionIds.has(e.service_version_id),
  ).length;
  return { currentServices: currentServices.length, activeEnrollments };
}
