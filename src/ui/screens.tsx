'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  MapPin,
  Clock,
  SlidersHorizontal,
  Users,
  History,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import type { Workspace, Student, Charge } from '@/contracts/workspace';
import { financialStatus, money, shortDate, statusLabels } from '@/domain/finance';
import { Badge, Avatar, Metric, Empty, FormError, FormActions } from './primitives';
import { weekdays, modalityLabels, useFormCommand, type RunCommand } from './forms';
import { LocationsSummary } from './locations-screen';

export type OpenDialog = (
  type: 'student' | 'service' | 'enrollment' | 'payment' | 'location' | 'billing',
  id?: string,
) => void;
export function studentStatus(data: Workspace, s: Student) {
  return financialStatus(
    data.charges
      .filter((c) => c.student_id === s.id)
      .map((c) => ({ amount: c.amount, paid: c.paid, dueDate: c.due_date })),
    s.state === 'active' &&
      data.enrollments.some((e) => e.student_id === s.id && e.state === 'active'),
    data.today,
    data.settings.noticeDays,
  );
}
function totals(charges: Charge[], currency: string) {
  return charges
    .filter((c) => c.currency === currency)
    .reduce((a, c) => ({ amount: a.amount + c.amount, paid: a.paid + c.paid }), {
      amount: 0,
      paid: 0,
    });
}
export function Dashboard({ data, open }: { data: Workspace; open: OpenDialog }) {
  const currency = data.settings.currency;
  const current = data.charges.filter((c) => c.due_date.slice(0, 7) === data.today.slice(0, 7));
  const balance = totals(current, currency);
  const debt = totals(
    data.charges.filter((c) => c.due_date < data.today),
    currency,
  );
  const pending = data.charges.filter((c) => c.paid < c.amount);
  const active = data.students.filter((s) => s.state === 'active').length;
  const services = data.services
    .filter((s) => s.state === 'active')
    .map((s) => ({
      service: s,
      version: data.serviceVersions.find(
        (v) => v.service_id === s.id && v.effective_on <= data.today,
      ),
    }))
    .filter((s) => !!s.version);
  const currencies = [...new Set(data.charges.map((c) => c.currency))];
  const rate = balance.amount ? Math.round((balance.paid / balance.amount) * 100) : 0;
  return (
    <>
      <div className="metrics-grid">
        <Metric
          label={`Cobrado del período · ${currency}`}
          value={money(balance.paid, currency)}
          caption="Sobre cargos que vencen este mes"
          accent
        />
        <Metric
          label="Pendiente del período"
          value={money(balance.amount - balance.paid, currency)}
          caption={`${pending.length} cargos abiertos en total`}
        />
        <Metric
          label="Alumnos activos"
          value={active}
          caption={`${data.enrollments.filter((e) => e.state === 'active').length} inscripciones activas`}
        />
        <Metric
          label="Saldo vencido"
          value={money(debt.amount - debt.paid, currency)}
          caption="Incluye alumnos pausados o archivados"
        />
      </div>
      {currencies.length > 1 && (
        <p className="info-note">
          El resumen muestra {currency}. Los movimientos de otras monedas se consultan en Cobros,
          sin conversión.
        </p>
      )}
      <div className="dashboard-grid">
        <section className="panel collection-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">CUENTA CORRIENTE</p>
              <h2>Pagos para seguir de cerca</h2>
            </div>
            <Link className="text-button" href="/?view=payments">
              Ver cobros <ArrowRight size={16} />
            </Link>
          </div>
          {pending.length ? (
            <div className="collection-list">
              {pending.slice(0, 5).map((c) => {
                const student = data.students.find((s) => s.id === c.student_id)!;
                return (
                  <div className="collection-row" key={c.id}>
                    <Avatar name={student.name} />
                    <div className="person">
                      <Link href={`/?view=students&student=${student.id}`}>{student.name}</Link>
                      <small>
                        {c.description} · Período {c.period}
                      </small>
                    </div>
                    <div className="collection-status">
                      <Badge
                        status={financialStatus(
                          [{ amount: c.amount, paid: c.paid, dueDate: c.due_date }],
                          true,
                          data.today,
                          data.settings.noticeDays,
                        )}
                      />
                      <small>Vence {shortDate(c.due_date)}</small>
                      {c.paid > 0 && c.due_date < data.today && (
                        <small>Pago parcial recibido</small>
                      )}
                    </div>
                    <div className="collection-money">
                      <strong>{money(c.amount - c.paid, c.currency)}</strong>
                      <button className="text-button" onClick={() => open('payment', c.id)}>
                        Registrar pago <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="Las cuentas, en orden">
              No hay cargos pendientes. Las nuevas inscripciones aparecen acá.
            </Empty>
          )}
        </section>
        <aside className="period-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">PULSO DEL MES</p>
              <h2>Cobranza del período</h2>
            </div>
            <span className="mini-mark">K</span>
          </div>
          <div
            className="progress-ring"
            style={{ '--progress': `${rate}%` } as React.CSSProperties}
          >
            <div>
              <strong>
                {rate}
                <span>%</span>
              </strong>
              <small>del total a cobrar</small>
            </div>
          </div>
          <div className="period-footer">
            <span>Cargos del período</span>
            <strong>{money(balance.amount, currency)}</strong>
          </div>
          <p>Basado en los cargos con vencimiento este mes.</p>
        </aside>
      </div>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">TU PROPUESTA DE ENTRENAMIENTO</p>
            <h2>Servicios en movimiento</h2>
          </div>
          <Link className="text-button" href="/?view=services">
            Administrar <ArrowRight size={16} />
          </Link>
        </div>
        {services.length ? (
          <div className="service-strip">
            {services.slice(0, 3).map(({ service, version: v }) => {
              if (!v) return null;
              const count = data.enrollments.filter(
                (e) => e.service_id === service.id && e.state === 'active',
              ).length;
              return (
                <div className="compact-service" key={service.id}>
                  <span className="service-category">{v.discipline}</span>
                  <h3>{v.name}</h3>
                  <p>
                    <Clock size={14} />
                    {v.days.map((d) => weekdays[d]).join(' / ')} · {v.time}
                  </p>
                  <div className="capacity-label">
                    <span>
                      {count} / {v.capacity} alumnos
                    </span>
                    <span>{modalityLabels[v.modality]}</span>
                  </div>
                  <progress value={count} max={v.capacity} aria-label={`Ocupación de ${v.name}`} />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Dale forma a tu oferta"
            action={
              <button className="button secondary" onClick={() => open('service')}>
                Crear servicio
              </button>
            }
          >
            Creá una sede y publicá tus primeros servicios.
          </Empty>
        )}
      </section>
      <div className="footnote">
        <CheckCircle2 size={15} /> Últimos cambios guardados en tu espacio local{' '}
        <span>Historial financiero conservado</span>
      </div>
    </>
  );
}
export function Students({ data, open }: { data: Workspace; open: OpenDialog }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const students = data.students.filter(
    (s) =>
      (s.name + ' ' + s.contact).toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' || studentStatus(data, s) === filter),
  );
  return (
    <section className="panel">
      <div className="table-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Buscar alumnos"
            placeholder="Buscar por nombre, email o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter-select">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Estado de pago"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(statusLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {students.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Servicios</th>
                <th>Actividad</th>
                <th>Cuenta corriente</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const es = data.enrollments.filter(
                  (e) => e.student_id === s.id && e.state === 'active',
                );
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="identity-cell">
                        <Avatar name={s.name} />
                        <div>
                          <Link className="person-link" href={`/?view=students&student=${s.id}`}>
                            {s.name}
                          </Link>
                          <small>{s.contact}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {es.length ? (
                        <span>
                          {es.length} {es.length === 1 ? 'servicio' : 'servicios'}
                        </span>
                      ) : (
                        <span className="muted">Sin inscripción</span>
                      )}
                    </td>
                    <td>
                      <span className="activity-tag">
                        {s.state === 'active'
                          ? 'Activo'
                          : s.state === 'paused'
                            ? 'Pausado'
                            : 'Archivado'}
                      </span>
                    </td>
                    <td>
                      <Badge status={studentStatus(data, s)} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => open('student', s.id)}
                        aria-label={`Editar ${s.name}`}
                      >
                        <Pencil size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={data.students.length ? 'No hay coincidencias' : 'Tu equipo empieza acá'}
          action={
            !data.students.length ? (
              <button className="button primary" onClick={() => open('student')}>
                Crear primer alumno
              </button>
            ) : undefined
          }
        >
          {data.students.length
            ? 'Probá con otro nombre o estado.'
            : 'Sumá un alumno y después asignale sus servicios.'}
        </Empty>
      )}
    </section>
  );
}
export function StudentDetail({
  data,
  student,
  open,
  run,
}: {
  data: Workspace;
  student: Student;
  open: OpenDialog;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const charges = data.charges.filter((c) => c.student_id === student.id);
  return (
    <>
      <Link className="text-button back-link" href="/?view=students">
        <ArrowLeft size={16} /> Volver a alumnos
      </Link>
      <section className="panel student-profile">
        <Avatar name={student.name} />
        <div>
          <h2>{student.name}</h2>
          <p>{student.contact}</p>
        </div>
        <Badge status={studentStatus(data, student)} />
        <button className="button secondary" onClick={() => open('student', student.id)}>
          Editar ficha
        </button>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Sus servicios</h2>
            <button
              className="text-button"
              disabled={student.state !== 'active'}
              onClick={() => open('enrollment', student.id)}
            >
              <Plus size={16} /> Inscribir
            </button>
          </div>
          {data.enrollments
            .filter((e) => e.student_id === student.id)
            .map((e) => {
              const v = data.serviceVersions.find((v) => v.id === e.service_version_id)!;
              return (
                <div className="enrollment-card" key={e.id}>
                  <span className="service-category">
                    {modalityLabels[v.modality]} / {e.state === 'active' ? 'Activo' : 'Finalizado'}
                  </span>
                  <h3>{v.name}</h3>
                  <p>
                    {v.days.map((d) => weekdays[d]).join(' · ')} / {v.time}
                  </p>
                  <small>
                    {v.location_name} · Condiciones v{v.version}
                  </small>
                  <strong>{money(v.amount, v.currency)}</strong>
                  {e.state === 'active' && (
                    <details>
                      <summary className="text-button danger">Finalizar inscripción</summary>
                      <p className="info-note">
                        Libera el cupo y conserva los cargos y pagos. Para volver a sumarse se
                        necesitará una nueva inscripción, que generará un nuevo cargo.
                      </p>
                      <form
                        onSubmit={(event) =>
                          f.submit(event, () => ({ type: 'enrollment.end', id: e.id }))
                        }
                      >
                        <button className="button secondary" disabled={f.pending}>
                          Confirmar finalización
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
          {!data.enrollments.some((e) => e.student_id === student.id) && (
            <Empty title="Todavía sin servicios">
              Asignale un plan para crear su primer cargo.
            </Empty>
          )}
          <FormError error={f.error} />
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Cuenta corriente</h2>
            <History size={18} />
          </div>
          {charges.map((c) => (
            <div className="charge-card" key={c.id}>
              <div>
                <h3>{c.description}</h3>
                <small>Vence {shortDate(c.due_date)}</small>
                <Badge
                  status={financialStatus(
                    [{ amount: c.amount, paid: c.paid, dueDate: c.due_date }],
                    true,
                    data.today,
                    data.settings.noticeDays,
                  )}
                />
              </div>
              <div>
                <strong>{money(c.amount - c.paid, c.currency)}</strong>
                <small>
                  Recibido {money(c.paid, c.currency)} de {money(c.amount, c.currency)}
                </small>
                {c.amount > c.paid && (
                  <button className="button secondary small" onClick={() => open('payment', c.id)}>
                    Registrar pago
                  </button>
                )}
              </div>
            </div>
          ))}
          {!charges.length && (
            <Empty title="Cuenta sin movimientos">
              Los cargos se generan al inscribir al alumno.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
export function Services({
  data,
  open,
  run,
}: {
  data: Workspace;
  open: OpenDialog;
  run: RunCommand;
}) {
  const [filter, setFilter] = useState('active');
  const f = useFormCommand(run);
  return (
    <>
      <div className="service-toolbar">
        <div className="tab-bar">
          {[
            ['active', 'Activos'],
            ['paused', 'Pausados'],
            ['archived', 'Archivados'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'selected' : ''}
              onClick={() => setFilter(key)}
            >
              {label} <span>{data.services.filter((s) => s.state === key).length}</span>
            </button>
          ))}
        </div>
        <Link className="text-button" href="/?view=locations">
          <MapPin size={16} /> Administrar sedes
        </Link>
      </div>
      <FormError error={f.error} />
      <div className="services-grid">
        {data.services
          .filter((s) => s.state === filter)
          .map((service) => {
            const versions = data.serviceVersions.filter((v) => v.service_id === service.id);
            const latest = versions[0];
            const current = versions.find((v) => v.effective_on <= data.today);
            const v = current ?? latest;
            const count = data.enrollments.filter(
              (e) => e.service_id === service.id && e.state === 'active',
            ).length;
            return (
              <section className="panel service-card" key={service.id}>
                <div className="service-card-top">
                  <span className="service-category">{v.discipline}</span>
                  <span className="activity-tag">{modalityLabels[v.modality]}</span>
                </div>
                <h2>{v.name}</h2>
                <p className="service-price">
                  {money(v.amount, v.currency)}
                  <small> / período</small>
                </p>
                <div className="service-facts">
                  <span>
                    <Clock size={16} />
                    {v.days.map((d) => weekdays[d]).join(' · ')} / {v.time}
                  </span>
                  <span>
                    <MapPin size={16} />
                    {v.location_name}
                  </span>
                  <span>
                    <Users size={16} />
                    {v.duration} min · {count} de {v.capacity} lugares
                  </span>
                </div>
                <progress max={v.capacity} value={count} aria-label={`Cupo ocupado de ${v.name}`} />
                {latest.id !== v.id && (
                  <p className="scheduled-note">
                    Cambio programado: {shortDate(latest.effective_on)} ·{' '}
                    {money(latest.amount, latest.currency)}
                  </p>
                )}
                {!current && (
                  <p className="scheduled-note">Disponible desde {shortDate(v.effective_on)}</p>
                )}
                <div className="service-actions">
                  <button className="button secondary" onClick={() => open('service', service.id)}>
                    Modificar condiciones
                  </button>
                  <form
                    onSubmit={(e) =>
                      f.submit(e, () => ({
                        type: 'service.state',
                        id: service.id,
                        expectedVersion: service.revision,
                        state: service.state === 'active' ? 'paused' : 'active',
                      }))
                    }
                  >
                    <button className="text-button" disabled={f.pending}>
                      {service.state === 'active' ? 'Pausar' : 'Reactivar'}
                    </button>
                  </form>
                </div>
                <details>
                  <summary>Ver historial de condiciones ({versions.length})</summary>
                  {versions.map((v) => (
                    <p key={v.id}>
                      <strong>v{v.version}</strong> · Desde {shortDate(v.effective_on)} ·{' '}
                      {money(v.amount, v.currency)}
                      <br />
                      <small>
                        {v.name} · {v.location_name} · {v.time}
                      </small>
                    </p>
                  ))}
                  {service.state !== 'archived' && (
                    <form
                      onSubmit={(e) =>
                        f.submit(e, () => ({
                          type: 'service.state',
                          id: service.id,
                          expectedVersion: service.revision,
                          state: 'archived',
                        }))
                      }
                    >
                      <button className="text-button danger" disabled={f.pending}>
                        Archivar y conservar historial
                      </button>
                    </form>
                  )}
                </details>
              </section>
            );
          })}
      </div>
      {!data.services.some((s) => s.state === filter) && (
        <section className="panel">
          <Empty
            title="Sin servicios en este estado"
            action={
              <button className="button secondary" onClick={() => open('service')}>
                Crear servicio
              </button>
            }
          >
            Armá una oferta que se adapte a tu forma de entrenar.
          </Empty>
        </section>
      )}
    </>
  );
}
export function Payments({ data, open }: { data: Workspace; open: OpenDialog }) {
  const [filter, setFilter] = useState('open');
  const [currency, setCurrency] = useState('all');
  const charges = data.charges.filter(
    (c) =>
      (filter === 'all' || (filter === 'open' ? c.paid < c.amount : c.paid === c.amount)) &&
      (currency === 'all' || currency === c.currency),
  );
  return (
    <>
      <section className="panel">
        <div className="table-toolbar">
          <div className="tab-bar">
            {[
              ['open', 'Pendientes'],
              ['paid', 'Pagados'],
              ['all', 'Todos'],
            ].map(([key, label]) => (
              <button
                className={filter === key ? 'selected' : ''}
                key={key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar moneda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="all">Todas las monedas</option>
            {[...new Set(data.charges.map((c) => c.currency))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {charges.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Alumno / concepto</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Recibido</th>
                  <th>Saldo</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="person-link"
                        href={`/?view=students&student=${c.student_id}`}
                      >
                        {data.students.find((s) => s.id === c.student_id)?.name}
                      </Link>
                      <small>{c.description}</small>
                    </td>
                    <td>{shortDate(c.due_date)}</td>
                    <td>
                      <Badge
                        status={financialStatus(
                          [{ amount: c.amount, paid: c.paid, dueDate: c.due_date }],
                          true,
                          data.today,
                          data.settings.noticeDays,
                        )}
                      />
                      {c.paid > 0 && c.paid < c.amount && c.due_date < data.today && (
                        <small>Pago parcial recibido</small>
                      )}
                    </td>
                    <td>{money(c.paid, c.currency)}</td>
                    <td>
                      <strong>{money(c.amount - c.paid, c.currency)}</strong>
                    </td>
                    <td>
                      {c.amount > c.paid ? (
                        <button
                          className="button secondary small"
                          onClick={() => open('payment', c.id)}
                        >
                          Registrar pago
                        </button>
                      ) : (
                        <CheckCircle2 size={18} className="positive" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No hay cargos en esta vista">
            Las inscripciones y los pagos actualizan esta cuenta automáticamente.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Últimos pagos recibidos</h2>
          <span className="muted">Efectivo y transferencias verificadas</span>
        </div>
        {data.payments.slice(0, 8).map((p) => (
          <div className="payment-line" key={p.id}>
            <span className="payment-icon">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <strong>
                {
                  data.students.find(
                    (s) => s.id === data.charges.find((c) => c.id === p.charge_id)?.student_id,
                  )?.name
                }
              </strong>
              <small>
                {p.method === 'cash' ? 'Efectivo' : 'Transferencia'}
                {p.reference ? ` · ${p.reference}` : ''}
              </small>
            </div>
            <time>{shortDate(p.created_at)}</time>
            <strong>{money(p.amount, p.currency)}</strong>
          </div>
        ))}
        {!data.payments.length && <p className="panel-note">Todavía no registraste pagos.</p>}
      </section>
    </>
  );
}
export function SettingsScreen({
  data,
  open,
  run,
}: {
  data: Workspace;
  open: OpenDialog;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">CONFIGURACIÓN GLOBAL</p>
            <h2>Un espacio a tu medida</h2>
          </div>
          <span className="activity-tag">Versión {data.settingsVersion}</span>
        </div>
        <form
          key={data.settingsVersion}
          onSubmit={(e) =>
            f.submit(e, (d) => ({
              type: 'settings.save',
              expectedVersion: data.settingsVersion,
              settings: {
                name: String(d.get('name')),
                timeZone: String(d.get('timeZone')),
                currency: String(d.get('currency')) as 'ARS',
                noticeDays: Number(d.get('noticeDays')),
                paymentMethods: d.getAll('methods') as ('cash' | 'transfer')[],
              },
            }))
          }
        >
          <label>
            Nombre del espacio
            <input name="name" defaultValue={data.settings.name} required maxLength={120} />
          </label>
          <label>
            Zona horaria
            <input
              name="timeZone"
              defaultValue={data.settings.timeZone}
              required
              list="timezones"
            />
            <datalist id="timezones">
              {[
                'America/Argentina/Buenos_Aires',
                'America/Montevideo',
                'America/Santiago',
                'America/Mexico_City',
                'Europe/Madrid',
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </datalist>
            <small>Identificador IANA. Define qué significa hoy y cuándo vence un cargo.</small>
          </label>
          <div className="form-grid">
            <label>
              Moneda inicial
              <select name="currency" defaultValue={data.settings.currency}>
                {['ARS', 'USD', 'EUR', 'UYU', 'CLP', 'MXN', 'BRL'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Próximo a vencer (días)
              <input
                name="noticeDays"
                type="number"
                min={0}
                max={60}
                required
                defaultValue={data.settings.noticeDays}
              />
            </label>
          </div>
          <fieldset className="checkbox-field">
            <legend>Medios de cobro manual habilitados</legend>
            <label>
              <input
                type="checkbox"
                name="methods"
                value="cash"
                defaultChecked={data.settings.paymentMethods.includes('cash')}
              />{' '}
              Efectivo
            </label>
            <label>
              <input
                type="checkbox"
                name="methods"
                value="transfer"
                defaultChecked={data.settings.paymentMethods.includes('transfer')}
              />{' '}
              Transferencia verificada
            </label>
          </fieldset>
          <div className="info-note">
            Cada cambio crea una nueva versión. La moneda inicial se aplica a servicios nuevos; los
            cargos y pagos existentes conservan sus importes y monedas.
          </div>
          <FormError error={f.error} />
          <FormActions pending={f.pending} label="Guardar nueva configuración" />
        </form>
      </section>
      <LocationsSummary data={data} open={open} />
    </div>
  );
}
export function AuditScreen({ data }: { data: Workspace }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">TRAZABILIDAD</p>
          <h2>Cada cambio tiene su historia</h2>
        </div>
        <span className="muted">Últimos 100 movimientos</span>
      </div>
      <div className="audit-list">
        {data.audit.map((a) => (
          <div className="audit-row" key={a.id}>
            <span className="audit-dot" />
            <div>
              <h3>{a.summary}</h3>
              <p>{a.actor_name}</p>
            </div>
            <time>
              {new Intl.DateTimeFormat('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: data.settings.timeZone,
              }).format(new Date(a.created_at))}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}
