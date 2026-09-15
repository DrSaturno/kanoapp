'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resetSessionNavigation } from './session-navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  Wallet,
  Settings,
  History,
  LogOut,
  Plus,
  CheckCircle2,
  X,
  Menu,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';
import type { Workspace } from '@/contracts/workspace';
import type { Command } from '@/contracts/commands';
import { Dialog } from './primitives';
import { LocationsScreen } from './locations-screen';
import {
  StudentForm,
  ServiceForm,
  EnrollmentForm,
  PaymentForm,
  MonthlyBillingForm,
  LocationForm,
} from './forms';
import {
  Dashboard,
  Students,
  StudentDetail,
  Services,
  Payments,
  SettingsScreen,
  AuditScreen,
  type OpenDialog,
} from './screens';
const navigation = [
  { key: 'home', label: 'Inicio', icon: LayoutDashboard },
  { key: 'students', label: 'Alumnos', icon: Users },
  { key: 'services', label: 'Servicios', icon: Layers },
  { key: 'locations', label: 'Sedes', icon: MapPin },
  { key: 'payments', label: 'Cobros', icon: Wallet },
  { key: 'settings', label: 'Configuración', icon: Settings },
  { key: 'audit', label: 'Historial', icon: History },
];
const headings: Record<string, [string, string]> = {
  home: ['Tu espacio, en movimiento.', 'Todo lo que necesitás para organizar el día.'],
  students: ['Tu equipo.', 'Cada alumno, sus servicios y su cuenta corriente.'],
  services: ['Tu forma de entrenar.', 'Una oferta que evoluciona con vos.'],
  locations: [
    'Tus lugares de entrenamiento.',
    'Creá, modificá y organizá las sedes de tu espacio.',
  ],
  payments: ['Cuentas claras.', 'Lo recibido, lo pendiente y el próximo paso.'],
  settings: ['Siempre a tu medida.', 'Adaptá tu espacio, tus sedes y tu operación.'],
  audit: ['Un historial confiable.', 'Consultá quién cambió qué y cuándo.'],
};
export function WorkspaceApp({
  initialData: data,
  route,
}: {
  initialData: Workspace;
  route: { view?: string; student?: string };
}) {
  const view = navigation.some((n) => n.key === route.view) ? route.view! : 'home';
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [modal, setModal] = useState<{ type: Parameters<OpenDialog>[0]; id?: string } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const open: OpenDialog = (type, id) => {
    setToast('');
    setModal({ type, id });
  };
  async function run(command: Command, keepDialog = false) {
    setSaving(true);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      const result = await res.json();
      if (res.status === 401) {
        resetSessionNavigation('/login');
        throw new Error('Iniciá sesión nuevamente para continuar.');
      }
      if (!res.ok) throw new Error(result.error);
      setToast('Cambios guardados. Tu espacio está actualizado.');
      if (!keepDialog) setModal(null);
      startRefresh(() => router.refresh());
      return { id: String(result.id), count: result.count as number | undefined };
    } finally {
      setSaving(false);
    }
  }
  async function signOut() {
    setSaving(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (!res.ok) throw new Error();
      resetSessionNavigation('/login');
    } catch {
      setToast('No pudimos cerrar la sesión. Volvé a intentar.');
      setSaving(false);
    }
  }
  const selectedStudent = data.students.find((s) => s.id === route.student);
  const modalStudent = data.students.find((s) => s.id === modal?.id);
  const modalService = data.services.find((s) => s.id === modal?.id);
  const modalCharge = data.charges.find((c) => c.id === modal?.id);
  const [title, subtitle] = headings[view];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <aside id="workspace-navigation" className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <Link href="/" className="brand-word" aria-label="Kano, inicio">
          KANO<span>.</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">{data.settings.name.slice(0, 1)}</span>
          <div>
            <strong>{data.settings.name}</strong>
            <small>Espacio del entrenador</small>
          </div>
        </div>
        <p className="nav-label">TU ESPACIO</p>
        <nav aria-label="Navegación principal">
          {navigation.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/?view=${key}`}
              className={key === view ? 'active' : ''}
              aria-current={key === view ? 'page' : undefined}
              onClick={() => setMobileNav(false)}
            >
              <Icon size={19} />
              {label}
              {key === 'payments' && data.charges.some((c) => c.paid < c.amount) && (
                <span className="nav-count">
                  {data.charges.filter((c) => c.paid < c.amount).length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>ESPACIO FLEXIBLE</span>
            <p>
              Tu entrenamiento cambia.
              <br />
              Tu gestión también.
            </p>
            <Link href="/?view=settings">
              Personalizar <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="profile-line">
            <span className="profile-avatar">{data.actor.name.slice(0, 1)}</span>
            <div>
              <strong>{data.actor.name}</strong>
              <small>{data.actor.role === 'owner' ? 'Dueño del espacio' : 'Administración'}</small>
            </div>
            <button
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={signOut}
              disabled={saving}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button menu-toggle"
              aria-label={mobileNav ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileNav}
              aria-controls="workspace-navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="breadcrumb">
              Mi espacio <span>/</span>{' '}
              <strong>{navigation.find((n) => n.key === view)?.label}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="environment-tag">LOCAL · V0.1</span>
            <time>
              {new Intl.DateTimeFormat('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(data.today + 'T12:00:00Z'))}
            </time>
          </div>
        </header>
        <main id="main" aria-busy={refreshing} className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {view === 'home' ? 'PANEL DEL ENTRENADOR' : data.settings.name.toUpperCase()}
              </p>
              <h1>{selectedStudent && view === 'students' ? 'Ficha del alumno' : title}</h1>
              <p>{subtitle}</p>
            </div>
            {['home', 'students'].includes(view) && !selectedStudent && (
              <button className="button primary" onClick={() => open('student')}>
                <Plus size={18} /> Nuevo alumno
              </button>
            )}
            {view === 'services' && (
              <button className="button primary" onClick={() => open('service')}>
                <Plus size={18} /> Nuevo servicio
              </button>
            )}
            {view === 'locations' && (
              <button className="button primary" onClick={() => open('location')}>
                <Plus size={18} /> Nueva sede
              </button>
            )}
            {view === 'payments' && (
              <button className="button primary" onClick={() => open('billing')}>
                <Plus size={18} /> Generar cuotas
              </button>
            )}
          </div>
          {toast && (
            <div className="toast" role="status">
              <CheckCircle2 size={18} />
              {toast}
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => setToast('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === 'home' && <Dashboard data={data} open={open} />}
          {view === 'students' &&
            (selectedStudent ? (
              <StudentDetail data={data} student={selectedStudent} open={open} run={run} />
            ) : (
              <Students data={data} open={open} />
            ))}
          {view === 'services' && <Services data={data} open={open} run={run} />}
          {view === 'locations' && <LocationsScreen data={data} open={open} />}
          {view === 'payments' && <Payments data={data} open={open} />}
          {view === 'settings' && <SettingsScreen data={data} open={open} run={run} />}
          {view === 'audit' && <AuditScreen data={data} />}
        </main>
        <footer className="app-footer">
          <span>KANO · GESTIÓN DE ENTRENAMIENTO</span>
          <span>Primera entrega / Datos guardados en este equipo</span>
        </footer>
      </div>
      {modal && (
        <Dialog
          title={
            modal.type === 'student'
              ? modal.id
                ? 'Editar alumno'
                : 'Nuevo alumno'
              : modal.type === 'service'
                ? modal.id
                  ? 'Modificar servicio'
                  : 'Nuevo servicio'
                : modal.type === 'enrollment'
                  ? 'Inscribir a un servicio'
                  : modal.type === 'payment'
                    ? 'Registrar pago'
                    : modal.type === 'billing'
                      ? 'Generar cuotas mensuales'
                      : modal.id
                        ? 'Editar sede'
                        : 'Nueva sede'
          }
          onClose={() => setModal(null)}
          busy={saving}
        >
          {modal.type === 'student' && <StudentForm student={modalStudent} run={run} />}
          {modal.type === 'service' && (
            <ServiceForm
              data={data}
              service={modalService}
              version={data.serviceVersions.find((v) => v.service_id === modal?.id)}
              run={run}
              createLocation={(command) => run(command, true)}
            />
          )}
          {modal.type === 'enrollment' && modalStudent && (
            <EnrollmentForm data={data} student={modalStudent} run={run} />
          )}
          {modal.type === 'payment' && modalCharge && (
            <PaymentForm data={data} charge={modalCharge} run={run} />
          )}
          {modal.type === 'billing' && <MonthlyBillingForm data={data} run={run} />}
          {modal.type === 'location' && (
            <LocationForm
              data={data}
              location={data.locations.find((l) => l.id === modal.id)}
              run={run}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
