import type { Settings } from './commands';
export interface Actor {
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'student';
  name: string;
}
export interface Student {
  id: string;
  name: string;
  contact: string;
  birth_date: string;
  state: 'active' | 'paused' | 'archived';
  version: number;
}
export interface Location {
  id: string;
  name: string;
  address: string;
  state: 'active' | 'paused' | 'archived';
  version: number;
}
export interface ServiceVersion {
  id: string;
  service_id: string;
  version: number;
  name: string;
  discipline: string;
  modality: 'group' | 'personal' | 'hybrid';
  location_id: string;
  location_name: string;
  days: number[];
  time: string;
  duration: number;
  capacity: number;
  amount: number;
  currency: string;
  effective_on: string;
}
export interface Service {
  id: string;
  state: 'active' | 'paused' | 'archived';
  revision: number;
}
export interface Enrollment {
  id: string;
  student_id: string;
  service_id: string;
  service_version_id: string;
  state: 'active' | 'ended';
  created_at: string;
}
export interface Charge {
  id: string;
  student_id: string;
  enrollment_id: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string;
  period: string;
  paid: number;
  created_at: string;
}
export interface Payment {
  id: string;
  charge_id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  created_at: string;
}
export interface Audit {
  id: string;
  action: string;
  summary: string;
  created_at: string;
  actor_name: string;
}
export interface Workspace {
  actor: Actor;
  settings: Settings;
  settingsVersion: number;
  today: string;
  students: Student[];
  locations: Location[];
  services: Service[];
  serviceVersions: ServiceVersion[];
  enrollments: Enrollment[];
  charges: Charge[];
  payments: Payment[];
  audit: Audit[];
}
