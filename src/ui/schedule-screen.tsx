'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { ClassSession, Workspace } from '@/contracts/workspace';
import { addDays, shortDate } from '@/domain/finance';
import { sessionCandidates } from '@/domain/scheduling';
import { Empty, FormActions, FormError } from './primitives';
import { modalityLabels, type RunCommand, useFormCommand, weekdays } from './forms';
import type { OpenDialog } from './screens';

const sessionStates = {
  scheduled: 'Programada',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
};

const bookingStates = {
  confirmed: 'Confirmado',
  waitlist: 'En espera',
  cancelled: 'Cancelado',
  present: 'Presente',
  absent: 'Ausente',
  no_show: 'Sin aviso',
};

function longDate(date: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function bookedCount(data: Workspace, sessionId: string) {
  return data.bookings.filter(
    (booking) =>
      booking.session_id === sessionId &&
      ['confirmed', 'present', 'absent', 'no_show'].includes(booking.status),
  ).length;
}

export function ScheduleScreen({ data, open }: { data: Workspace; open: OpenDialog }) {
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [serviceId, setServiceId] = useState('all');
  const sessions = data.sessions.filter((session) => {
    const stateMatches =
      filter === 'upcoming'
        ? session.state === 'scheduled'
        : filter === 'completed'
          ? session.state === 'completed'
          : session.state === 'cancelled';
    return stateMatches && (serviceId === 'all' || session.service_id === serviceId);
  });
  const dates = [...new Set(sessions.map((session) => session.session_date))];
  const activeServices = data.services.filter((service) => service.state === 'active');
  const todaySessions = data.sessions.filter(
    (session) => session.session_date === data.today && session.state !== 'cancelled',
  );

  return (
    <>
      <section className="schedule-overview" aria-label="Resumen de agenda">
        <div>
          <CalendarDays size={20} />
          <span>Hoy</span>
          <strong>
            {todaySessions.length} {todaySessions.length === 1 ? 'clase' : 'clases'}
          </strong>
        </div>
        <div>
          <Users size={20} />
          <span>Lugares confirmados hoy</span>
          <strong>
            {todaySessions.reduce((total, session) => total + bookedCount(data, session.id), 0)}
          </strong>
        </div>
        <div>
          <Clock3 size={20} />
          <span>En espera</span>
          <strong>{data.bookings.filter((booking) => booking.status === 'waitlist').length}</strong>
        </div>
      </section>

      <div className="schedule-toolbar">
        <div className="tab-bar" aria-label="Estado de las clases">
          {[
            ['upcoming', 'Próximas'],
            ['completed', 'Finalizadas'],
            ['cancelled', 'Canceladas'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'selected' : ''}
              onClick={() => setFilter(key as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          aria-label="Filtrar por servicio"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
        >
          <option value="all">Todos los servicios</option>
          {activeServices.map((service) => {
            const version = data.serviceVersions.find(
              (item) => item.service_id === service.id && item.effective_on <= data.today,
            );
            return version ? (
              <option value={service.id} key={service.id}>
                {version.name}
              </option>
            ) : null;
          })}
        </select>
      </div>

      {dates.length ? (
        <div className="round-timeline">
          {dates.map((date) => (
            <section className="round-day" key={date}>
              <header>
                <span>
                  {date === data.today
                    ? 'HOY'
                    : weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()]}
                </span>
                <h2>{longDate(date)}</h2>
              </header>
              <div className="round-sessions">
                {sessions
                  .filter((session) => session.session_date === date)
                  .map((session) => {
                    const confirmed = bookedCount(data, session.id);
                    const waiting = data.bookings.filter(
                      (booking) =>
                        booking.session_id === session.id && booking.status === 'waitlist',
                    ).length;
                    const fill = Math.min(100, Math.round((confirmed / session.capacity) * 100));
                    return (
                      <article className={`session-card ${session.state}`} key={session.id}>
                        <div className="session-time">
                          <strong>{session.start_time}</strong>
                          <small>{session.duration} min</small>
                        </div>
                        <div className="session-main">
                          <div className="session-title-line">
                            <div>
                              <span className="service-category">{session.discipline}</span>
                              <h3>{session.title}</h3>
                            </div>
                            <span className={`session-state ${session.state}`}>
                              {sessionStates[session.state]}
                            </span>
                          </div>
                          <div className="session-meta">
                            <span>
                              <MapPin size={15} /> {session.location_name}
                            </span>
                            <span>
                              <Users size={15} /> {modalityLabels[session.modality]}
                            </span>
                          </div>
                          <div className="occupancy-line">
                            <div>
                              <strong>
                                {confirmed} / {session.capacity}
                              </strong>
                              <span> lugares confirmados</span>
                              {waiting > 0 && <small>{waiting} en lista de espera</small>}
                            </div>
                            <span className="occupancy-percent">{fill}%</span>
                          </div>
                          <progress
                            max={session.capacity}
                            value={confirmed}
                            aria-label={`Ocupación de ${session.title}`}
                          />
                          {session.state !== 'cancelled' && (
                            <div className="session-actions">
                              <button
                                className="button secondary"
                                onClick={() => open('roster', session.id)}
                              >
                                <Users size={17} /> Gestionar alumnos
                              </button>
                              {session.session_date <= data.today && (
                                <button
                                  className="button primary"
                                  onClick={() => open('attendance', session.id)}
                                >
                                  <CheckCircle2 size={17} />{' '}
                                  {session.state === 'completed'
                                    ? 'Corregir asistencia'
                                    : 'Tomar asistencia'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel schedule-empty">
          <Empty
            title={
              filter === 'upcoming'
                ? 'Tu agenda está lista para armarse'
                : 'No hay clases en esta vista'
            }
            action={
              filter === 'upcoming' ? (
                <button className="button primary" onClick={() => open('schedule')}>
                  Generar clases
                </button>
              ) : undefined
            }
          >
            {filter === 'upcoming'
              ? 'Elegí un rango y convertí los horarios de tus servicios en clases concretas.'
              : 'Probá otro estado o servicio.'}
          </Empty>
        </section>
      )}
    </>
  );
}

export function ScheduleGenerateForm({ data, run }: { data: Workspace; run: RunCommand }) {
  const [fromDate, setFromDate] = useState(data.today);
  const [toDate, setToDate] = useState(addDays(data.today, 13));
  const [serviceIds, setServiceIds] = useState(
    data.services
      .filter(
        (service) =>
          service.state === 'active' &&
          data.serviceVersions.some(
            (version) =>
              version.service_id === service.id && version.effective_on <= addDays(data.today, 13),
          ),
      )
      .slice(0, 20)
      .map((service) => service.id),
  );
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const candidates = useMemo(
    () => sessionCandidates(data, fromDate, toDate, serviceIds),
    [data, fromDate, toDate, serviceIds],
  );
  const services = data.services.filter((service) => service.state === 'active');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!review) {
      if (!serviceIds.length) return setError('Seleccioná al menos un servicio.');
      if (serviceIds.length > 20) return setError('Podés generar hasta 20 servicios por lote.');
      const span = Math.round(
        (Date.parse(`${toDate}T12:00:00Z`) - Date.parse(`${fromDate}T12:00:00Z`)) / 86_400_000,
      );
      if (span < 0 || span > 30) return setError('Elegí un rango de hasta 31 días.');
      if (candidates.length > 200) return setError('El rango supera las 200 clases. Dividilo.');
      setReview(true);
      return;
    }
    setPending(true);
    try {
      await run({
        type: 'schedule.generate',
        fromDate,
        toDate,
        serviceIds,
        idempotencyKey,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos generar la agenda.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="form-intro">
        Convertí los horarios vigentes en clases concretas. Nada se crea hasta que confirmes la
        vista previa.
      </p>
      {!review ? (
        <>
          <div className="form-grid">
            <label>
              Desde
              <input
                type="date"
                min={data.today}
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                required
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                min={fromDate}
                max={addDays(fromDate, 30)}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                required
              />
            </label>
          </div>
          <fieldset className="service-checklist">
            <legend>Servicios a incluir ({serviceIds.length}/20)</legend>
            {services.map((service) => {
              const version =
                data.serviceVersions.find(
                  (item) => item.service_id === service.id && item.effective_on <= toDate,
                ) ?? data.serviceVersions.find((item) => item.service_id === service.id);
              if (!version) return null;
              return (
                <label key={service.id}>
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(service.id)}
                    disabled={!serviceIds.includes(service.id) && serviceIds.length >= 20}
                    onChange={(event) =>
                      setServiceIds((current) =>
                        event.target.checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id),
                      )
                    }
                  />
                  <span>
                    <strong>{version.name}</strong>
                    <small>
                      {weekdays.filter((_, day) => version.days.includes(day)).join(' · ')} ·{' '}
                      {version.time} · {version.location_name}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>
        </>
      ) : (
        <div className="schedule-review">
          <div className="schedule-review-total">
            <CalendarDays size={24} />
            <div>
              <strong>{candidates.length} clases nuevas</strong>
              <small>
                {shortDate(fromDate)} al {shortDate(toDate)} · las ya existentes se omiten
              </small>
            </div>
          </div>
          <div className="schedule-review-list">
            {candidates.slice(0, 12).map((candidate) => (
              <div key={`${candidate.serviceId}:${candidate.sessionDate}:${candidate.startTime}`}>
                <time>
                  {shortDate(candidate.sessionDate)} · {candidate.startTime}
                </time>
                <span>
                  <strong>{candidate.title}</strong>
                  <small>{candidate.locationName}</small>
                </span>
              </div>
            ))}
            {candidates.length > 12 && <p>Y {candidates.length - 12} clases más.</p>}
            {!candidates.length && <p>No hay clases nuevas para este rango.</p>}
          </div>
          <label className="check-row">
            <input type="checkbox" required />
            Revisé el rango y quiero crear esta agenda.
          </label>
        </div>
      )}
      <FormError error={error} />
      <div className="split-actions">
        {review && (
          <button type="button" className="text-button" onClick={() => setReview(false)}>
            Volver y editar
          </button>
        )}
        <FormActions pending={pending} label={review ? 'Confirmar agenda' : 'Revisar agenda'} />
      </div>
    </form>
  );
}

export function SessionRosterForm({
  data,
  session,
  run,
}: {
  data: Workspace;
  session: ClassSession;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const bookings = data.bookings.filter(
    (booking) => booking.session_id === session.id && booking.status !== 'cancelled',
  );
  const bookedStudents = new Set(bookings.map((booking) => booking.student_id));
  const eligible = data.students.filter(
    (student) =>
      student.state === 'active' &&
      !bookedStudents.has(student.id) &&
      data.enrollments.some(
        (enrollment) =>
          enrollment.student_id === student.id &&
          enrollment.service_id === session.service_id &&
          enrollment.state === 'active',
      ),
  );
  const ordered = [...bookings].sort((a, b) => {
    if (a.status === 'waitlist' && b.status !== 'waitlist') return 1;
    if (a.status !== 'waitlist' && b.status === 'waitlist') return -1;
    return (
      (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0) ||
      a.created_at.localeCompare(b.created_at)
    );
  });
  return (
    <>
      <div className="roster-class-summary">
        <Clock3 size={19} />
        <div>
          <strong>
            {longDate(session.session_date)} · {session.start_time}
          </strong>
          <small>
            {session.title} · {session.location_name}
          </small>
        </div>
      </div>
      {session.state === 'scheduled' && (
        <form
          className="roster-add"
          onSubmit={(event) =>
            f.submit(event, (form) => ({
              type: 'booking.create',
              sessionId: session.id,
              studentId: String(form.get('studentId')),
            }))
          }
        >
          <label>
            Alumno con inscripción activa
            <select
              key={eligible.map((student) => student.id).join(':')}
              name="studentId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Elegir alumno
              </option>
              {eligible.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" disabled={f.pending || !eligible.length}>
            <UserPlus size={17} /> Agregar
          </button>
        </form>
      )}
      {!eligible.length && session.state === 'scheduled' && (
        <p className="info-note">
          Todos los alumnos elegibles ya están en la clase. Las nuevas altas se hacen desde la ficha
          del alumno.
        </p>
      )}
      <div className="roster-list">
        {ordered.map((booking) => {
          const student = data.students.find((item) => item.id === booking.student_id);
          return (
            <div className="roster-row" key={booking.id}>
              <span className={`booking-mark ${booking.status}`} aria-hidden="true" />
              <div>
                <strong>{student?.name}</strong>
                <small>
                  {bookingStates[booking.status]}
                  {booking.waitlist_position ? ` · puesto ${booking.waitlist_position}` : ''}
                </small>
              </div>
              {session.state === 'scheduled' &&
                ['confirmed', 'waitlist'].includes(booking.status) && (
                  <form
                    onSubmit={(event) =>
                      f.submit(event, () => ({
                        type: 'booking.cancel',
                        id: booking.id,
                        expectedVersion: booking.version,
                      }))
                    }
                  >
                    <button className="text-button danger" disabled={f.pending}>
                      Cancelar
                    </button>
                  </form>
                )}
            </div>
          );
        })}
        {!ordered.length && (
          <Empty title="Clase sin alumnos">Agregá a quienes van a entrenar en este bloque.</Empty>
        )}
      </div>
      <FormError error={f.error} />
      {session.state === 'scheduled' && (
        <details className="danger-zone">
          <summary>Cancelar toda la clase</summary>
          <p>Conserva la clase en el historial y cancela las reservas activas.</p>
          <form
            onSubmit={(event) =>
              f.submit(event, () => ({
                type: 'session.cancel',
                id: session.id,
                expectedVersion: session.version,
              }))
            }
          >
            <button className="button secondary" disabled={f.pending}>
              <XCircle size={17} /> Confirmar cancelación
            </button>
          </form>
        </details>
      )}
    </>
  );
}

export function AttendanceForm({
  data,
  session,
  run,
}: {
  data: Workspace;
  session: ClassSession;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const roster = data.bookings.filter(
    (booking) =>
      booking.session_id === session.id &&
      ['confirmed', 'present', 'absent', 'no_show'].includes(booking.status),
  );
  return (
    <form
      onSubmit={(event) =>
        f.submit(event, (form) => ({
          type: 'attendance.save',
          sessionId: session.id,
          expectedVersion: session.version,
          items: roster.map((booking) => ({
            bookingId: booking.id,
            expectedVersion: booking.version,
            status: String(form.get(booking.id)) as 'present' | 'absent' | 'no_show',
          })),
        }))
      }
    >
      <div className="attendance-head">
        <ShieldCheck size={22} />
        <div>
          <strong>
            {longDate(session.session_date)} · {session.start_time}
          </strong>
          <small>
            {session.title} · {roster.length} {roster.length === 1 ? 'alumno' : 'alumnos'}
          </small>
        </div>
      </div>
      <div className="attendance-list">
        {roster.map((booking) => {
          const student = data.students.find((item) => item.id === booking.student_id);
          const current = ['present', 'absent', 'no_show'].includes(booking.status)
            ? booking.status
            : 'present';
          return (
            <fieldset key={booking.id}>
              <legend>{student?.name}</legend>
              {[
                ['present', 'Presente'],
                ['absent', 'Ausente'],
                ['no_show', 'Sin aviso'],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={booking.id}
                    value={value}
                    defaultChecked={current === value}
                    required
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>
      {!roster.length && (
        <Empty title="No hay asistencia para tomar">
          Primero agregá alumnos confirmados a la clase.
        </Empty>
      )}
      <FormError error={f.error} />
      <FormActions
        pending={f.pending}
        disabled={!roster.length}
        label={session.state === 'completed' ? 'Guardar corrección' : 'Cerrar asistencia'}
      />
    </form>
  );
}
