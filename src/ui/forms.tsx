'use client';
import { useState } from 'react';
import type { Command } from '@/contracts/commands';
import type {
  Workspace,
  Student,
  Service,
  ServiceVersion,
  Charge,
  Location,
} from '@/contracts/workspace';
import { parseMoney, money, addDays, nextMonth } from '@/domain/finance';
import { locationUsage } from '@/domain/locations';
import { billingCandidates, nextPeriod } from '@/domain/monthly-billing';
import { FormActions, FormError } from './primitives';
export interface CommandResult {
  id: string;
  count?: number;
}
export type RunCommand = (command: Command) => Promise<CommandResult>;
const stateOptions = (
  <>
    <option value="active">Activo</option>
    <option value="paused">Pausado</option>
    <option value="archived">Archivado</option>
  </>
);
export const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const modalityLabels = { group: 'Grupal', personal: 'Personalizado', hybrid: 'Híbrido' };
export function useFormCommand(run: RunCommand) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    make: (data: FormData) => Command,
  ) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await run(make(new FormData(event.currentTarget)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      setPending(false);
    }
  }
  return { pending, error, submit };
}
export function StudentForm({ student, run }: { student?: Student; run: RunCommand }) {
  const f = useFormCommand(run);
  return (
    <form
      onSubmit={(e) =>
        f.submit(e, (d) => ({
          type: 'student.save',
          ...(student ? { id: student.id, expectedVersion: student.version } : {}),
          name: String(d.get('name')),
          contact: String(d.get('contact')),
          birthDate: String(d.get('birthDate')),
          state: String(d.get('state')) as Student['state'],
        }))
      }
    >
      <p className="form-intro">Una ficha simple para acompañar cada entrenamiento.</p>
      <label>
        Nombre y apellido
        <input
          name="name"
          defaultValue={student?.name}
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Email o teléfono
        <input
          name="contact"
          defaultValue={student?.contact}
          required
          minLength={5}
          maxLength={160}
        />
      </label>
      <div className="form-grid">
        <label>
          Fecha de nacimiento
          <input type="date" name="birthDate" required defaultValue={student?.birth_date} />
          <small>Esta entrega admite alumnos mayores de 18 años.</small>
        </label>
        <label>
          Estado de actividad
          <select name="state" defaultValue={student?.state ?? 'active'}>
            {stateOptions}
          </select>
        </label>
      </div>
      {student && (
        <p className="info-note">
          Pausar o archivar conserva las inscripciones y el historial de pagos. El saldo pendiente
          sigue visible.
        </p>
      )}
      <FormError error={f.error} />
      <FormActions pending={f.pending} label={student ? 'Guardar ficha' : 'Crear alumno'} />
    </form>
  );
}
export function ServiceForm({
  data,
  service,
  version,
  run,
  createLocation,
}: {
  data: Workspace;
  service?: Service;
  version?: ServiceVersion;
  run: RunCommand;
  createLocation: RunCommand;
}) {
  const f = useFormCommand(run);
  const [amount, setAmount] = useState(version ? String(version.amount / 100) : '');
  const [currency, setCurrency] = useState(version?.currency ?? data.settings.currency);
  const [effectiveOn, setEffectiveOn] = useState(
    version
      ? addDays(version.effective_on >= data.today ? version.effective_on : data.today, 1)
      : data.today,
  );
  const [createdLocation, setCreatedLocation] = useState<Location>();
  const [locationId, setLocationId] = useState(
    version?.location_id ?? data.locations.find((l) => l.state === 'active')?.id ?? '',
  );
  const [showLocation, setShowLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationError, setLocationError] = useState('');
  const [creatingLocation, setCreatingLocation] = useState(false);
  const activeLocations = [
    ...data.locations.filter((l) => l.state === 'active'),
    ...(createdLocation && !data.locations.some((l) => l.id === createdLocation.id)
      ? [createdLocation]
      : []),
  ];
  async function addLocation() {
    if (locationName.trim().length < 2) {
      setLocationError('Ingresá al menos 2 caracteres.');
      return;
    }
    setCreatingLocation(true);
    setLocationError('');
    try {
      const result = await createLocation({
        type: 'location.save',
        name: locationName,
        address: locationAddress,
        state: 'active',
      });
      setCreatedLocation({
        id: result.id,
        name: locationName.trim(),
        address: locationAddress.trim(),
        state: 'active',
        version: 1,
      });
      setLocationId(result.id);
      setShowLocation(false);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'No pudimos crear la sede.');
    } finally {
      setCreatingLocation(false);
    }
  }
  return (
    <form
      onSubmit={(e) =>
        f.submit(e, (d) => ({
          type: 'service.save',
          ...(service ? { id: service.id, expectedVersion: service.revision } : {}),
          name: String(d.get('name')),
          discipline: String(d.get('discipline')),
          modality: String(d.get('modality')) as ServiceVersion['modality'],
          locationId: String(d.get('locationId')),
          days: d.getAll('days').map(Number),
          time: String(d.get('time')),
          duration: Number(d.get('duration')),
          capacity: Number(d.get('capacity')),
          amount: parseMoney(amount),
          currency: currency as 'ARS',
          effectiveOn,
        }))
      }
    >
      <p className="form-intro">
        Definí qué ofrecés y cuándo. Las condiciones quedan guardadas por versión.
      </p>
      <label>
        Nombre del servicio
        <input
          name="name"
          defaultValue={version?.name}
          placeholder="Ej. Muay Thai · Grupo de la tarde"
          required
          maxLength={120}
        />
      </label>
      <div className="form-grid">
        <label>
          Disciplina
          <input
            name="discipline"
            defaultValue={version?.discipline}
            placeholder="Muay Thai"
            required
            maxLength={120}
          />
        </label>
        <label>
          Modalidad
          <select name="modality" defaultValue={version?.modality ?? 'group'}>
            {Object.entries(modalityLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Sede
        <select
          name="locationId"
          required
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          <option value="" disabled>
            Seleccioná una sede
          </option>
          {activeLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="text-button inline-create"
        type="button"
        onClick={() => setShowLocation(!showLocation)}
      >
        {showLocation ? 'Cancelar alta de sede' : '+ Crear una sede sin salir'}
      </button>
      {showLocation && (
        <div className="quick-create" role="group" aria-label="Nueva sede">
          <label>
            Nombre
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            Dirección
            <input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              maxLength={180}
            />
          </label>
          {locationError && <p className="form-error">{locationError}</p>}
          <button
            className="button secondary"
            type="button"
            disabled={creatingLocation}
            onClick={addLocation}
          >
            {creatingLocation ? 'Creando…' : 'Crear y usar sede'}
          </button>
        </div>
      )}
      <fieldset className="day-picker">
        <legend>Días de entrenamiento</legend>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <label key={day}>
            <input
              type="checkbox"
              name="days"
              value={day}
              defaultChecked={version?.days.includes(day) ?? [1, 3, 5].includes(day)}
            />
            <span>{weekdays[day]}</span>
          </label>
        ))}
      </fieldset>
      <div className="form-grid three">
        <label>
          Hora
          <input type="time" name="time" defaultValue={version?.time ?? '18:00'} required />
        </label>
        <label>
          Duración (min)
          <input
            type="number"
            name="duration"
            min={15}
            max={240}
            defaultValue={version?.duration ?? 60}
            required
          />
        </label>
        <label>
          Cupo de alumnos
          <input
            type="number"
            name="capacity"
            min={1}
            max={500}
            defaultValue={version?.capacity ?? 12}
            required
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Precio por período
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="45000"
            required
          />
        </label>
        <label>
          Moneda
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['ARS', 'USD', 'EUR', 'UYU', 'CLP', 'MXN', 'BRL'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Vigente desde
        <input
          type="date"
          value={effectiveOn}
          onChange={(e) => setEffectiveOn(e.target.value)}
          min={data.today}
          required
        />
      </label>
      <div className="impact-preview">
        <strong>{service ? 'Nueva versión de condiciones' : 'Resumen de publicación'}</strong>
        <p>
          {amount || '0'} {currency} · Desde {effectiveOn}
        </p>
        <small>
          {service
            ? 'Se aplica a nuevas inscripciones. Las existentes conservan su precio, horario y sede.'
            : 'Se publicará para inscripciones administrativas desde su fecha de vigencia.'}
        </small>
      </div>
      <FormError error={f.error} />
      <FormActions
        pending={f.pending}
        label={service ? 'Confirmar nueva versión' : 'Publicar servicio'}
      />
    </form>
  );
}
export function EnrollmentForm({
  data,
  student,
  run,
}: {
  data: Workspace;
  student: Student;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const available = data.services
    .filter((s) => s.state === 'active')
    .map((s) =>
      data.serviceVersions.find((v) => v.service_id === s.id && v.effective_on <= data.today),
    )
    .filter(
      (v): v is ServiceVersion =>
        !!v &&
        data.locations.some((l) => l.id === v.location_id && l.state === 'active') &&
        !data.enrollments.some(
          (e) =>
            e.student_id === student.id && e.service_id === v.service_id && e.state === 'active',
        ),
    );
  const [serviceId, setServiceId] = useState(available[0]?.service_id ?? '');
  const chosen = available.find((v) => v.service_id === serviceId);
  return (
    <form
      onSubmit={(e) =>
        f.submit(e, (d) => ({
          type: 'enrollment.create',
          studentId: student.id,
          serviceId,
          dueDate: String(d.get('dueDate')),
        }))
      }
    >
      <p className="form-intro">
        Sumá a {student.name.split(' ')[0]} a un servicio. Se creará el primer cargo con las
        condiciones vigentes.
      </p>
      <label>
        Servicio
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="" disabled>
            Seleccionar servicio
          </option>
          {available.map((v) => (
            <option key={v.id} value={v.service_id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <div className="impact-preview">
          <strong>{money(chosen.amount, chosen.currency)}</strong>
          <p>
            {chosen.days.map((d) => weekdays[d]).join(' · ')} / {chosen.time} /{' '}
            {chosen.location_name}
          </p>
          <small>Condiciones versión {chosen.version}. El cupo se verifica al confirmar.</small>
        </div>
      )}
      <label>
        Vencimiento del primer cargo
        <input type="date" name="dueDate" defaultValue={nextMonth(data.today)} required />
      </label>
      {!available.length && (
        <p className="info-note">No hay servicios vigentes disponibles para este alumno.</p>
      )}
      <FormError error={f.error} />
      <FormActions pending={f.pending || !chosen} label="Inscribir y crear cargo" />
    </form>
  );
}
export function PaymentForm({
  data,
  charge,
  run,
}: {
  data: Workspace;
  charge: Charge;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const [amount, setAmount] = useState(String((charge.amount - charge.paid) / 100));
  const [key] = useState(() => crypto.randomUUID());
  const student = data.students.find((s) => s.id === charge.student_id);
  return (
    <form
      onSubmit={(e) =>
        f.submit(e, (d) => ({
          type: 'payment.record',
          chargeId: charge.id,
          amount: parseMoney(amount),
          method: String(d.get('method')) as 'cash' | 'transfer',
          reference: String(d.get('reference')),
          idempotencyKey: key,
        }))
      }
    >
      <p className="form-intro">
        {student?.name} · {charge.description}
      </p>
      <div className="balance-callout">
        <span>Saldo pendiente</span>
        <strong>{money(charge.amount - charge.paid, charge.currency)}</strong>
      </div>
      <label>
        Importe recibido ({charge.currency})
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <small>Podés registrar un pago parcial. No uses separadores de miles.</small>
      </label>
      <label>
        Medio de pago
        <select name="method">
          {data.settings.paymentMethods.map((m) => (
            <option key={m} value={m}>
              {m === 'cash' ? 'Efectivo' : 'Transferencia verificada'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Referencia o comprobante
        <input name="reference" placeholder="Ej. transferencia del 14/09" maxLength={160} />
      </label>
      <p className="info-note">
        Confirmá sólo el dinero que ya recibiste. El movimiento queda registrado en el historial.
      </p>
      <FormError error={f.error} />
      <FormActions pending={f.pending} label="Confirmar pago recibido" />
    </form>
  );
}

export function MonthlyBillingForm({ data, run }: { data: Workspace; run: RunCommand }) {
  const currentPeriod = data.today.slice(0, 7);
  const initialPeriod = billingCandidates(data, currentPeriod).length
    ? currentPeriod
    : nextPeriod(currentPeriod);
  const [period, setPeriod] = useState(initialPeriod);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [pastConfirmed, setPastConfirmed] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const f = useFormCommand(run);
  const candidates = billingCandidates(data, period);
  const chosen = candidates.filter((candidate) => selected[candidate.enrollmentId]);
  const hasPastDate = chosen.some((candidate) => selected[candidate.enrollmentId] < data.today);
  const totals = chosen.reduce<Record<string, number>>((result, item) => {
    result[item.currency] = (result[item.currency] ?? 0) + item.amount;
    return result;
  }, {});
  function changePeriod(value: string) {
    setPeriod(value);
    setSelected({});
    setReviewing(false);
    setPastConfirmed(false);
  }
  function toggle(enrollmentId: string, dueDate: string, checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[enrollmentId] = dueDate;
      else delete next[enrollmentId];
      return next;
    });
  }
  if (reviewing) {
    return (
      <form
        onSubmit={(event) =>
          f.submit(event, () => ({
            type: 'billing.generate',
            period,
            idempotencyKey: key,
            items: chosen.map((candidate) => ({
              enrollmentId: candidate.enrollmentId,
              expectedServiceVersionId: candidate.serviceVersionId,
              expectedAmount: candidate.amount,
              expectedCurrency: candidate.currency as 'ARS',
              dueDate: selected[candidate.enrollmentId],
            })),
          }))
        }
      >
        <p className="form-intro">
          Revisá antes de crear. Esta acción agrega cargos reales a la cuenta corriente.
        </p>
        <div className="billing-summary">
          <strong>
            {chosen.length} cuota{chosen.length === 1 ? '' : 's'} · {period}
          </strong>
          <p>
            {Object.entries(totals)
              .map(([currency, total]) => money(total, currency))
              .join(' · ')}
          </p>
        </div>
        <div className="billing-review-list">
          {chosen.map((candidate) => (
            <div key={candidate.enrollmentId}>
              <span>
                <strong>{candidate.studentName}</strong>
                <small>{candidate.description}</small>
              </span>
              <span>
                <strong>{money(candidate.amount, candidate.currency)}</strong>
                <small>Vence {selected[candidate.enrollmentId]}</small>
              </span>
            </div>
          ))}
        </div>
        {hasPastDate && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={pastConfirmed}
              onChange={(e) => setPastConfirmed(e.target.checked)}
            />
            Confirmo que hay vencimientos anteriores a hoy.
          </label>
        )}
        <p className="info-note">No se enviarán avisos ni se debitará dinero automáticamente.</p>
        <FormError error={f.error} />
        <div className="split-actions">
          <button className="button secondary" type="button" onClick={() => setReviewing(false)}>
            Volver
          </button>
          <FormActions
            pending={f.pending}
            disabled={hasPastDate && !pastConfirmed}
            label="Confirmar y generar cuotas"
          />
        </div>
      </form>
    );
  }
  return (
    <div>
      <p className="form-intro">
        Elegí el período y sólo los alumnos que querés incluir. Nada se genera hasta confirmar.
      </p>
      <label>
        Período mensual
        <input
          type="month"
          value={period}
          onChange={(e) => changePeriod(e.target.value)}
          required
        />
      </label>
      <div className="billing-candidates">
        {candidates.map((candidate) => (
          <label className="billing-candidate" key={candidate.enrollmentId}>
            <input
              type="checkbox"
              checked={Boolean(selected[candidate.enrollmentId])}
              onChange={(e) => toggle(candidate.enrollmentId, candidate.dueDate, e.target.checked)}
            />
            <span>
              <strong>{candidate.studentName}</strong>
              <small>{candidate.description}</small>
            </span>
            <span>
              <strong>{money(candidate.amount, candidate.currency)}</strong>
              <input
                aria-label={`Vencimiento de ${candidate.studentName}`}
                type="date"
                value={selected[candidate.enrollmentId] ?? candidate.dueDate}
                min={`${period}-01`}
                max={`${period}-31`}
                disabled={!selected[candidate.enrollmentId]}
                onChange={(e) =>
                  setSelected((current) => ({
                    ...current,
                    [candidate.enrollmentId]: e.target.value,
                  }))
                }
              />
            </span>
          </label>
        ))}
      </div>
      {!candidates.length && (
        <p className="info-note">
          No hay inscripciones activas pendientes de cuota para este período.
        </p>
      )}
      <div className="form-actions">
        <button
          className="button primary"
          type="button"
          disabled={!chosen.length}
          onClick={() => setReviewing(true)}
        >
          Revisar{' '}
          {chosen.length ? `${chosen.length} cuota${chosen.length === 1 ? '' : 's'}` : 'selección'}
        </button>
      </div>
    </div>
  );
}

export function LocationForm({
  data,
  location,
  run,
}: {
  data: Workspace;
  location?: Location;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const usage = location ? locationUsage(data, location.id) : undefined;
  return (
    <form
      onSubmit={(e) =>
        f.submit(e, (d) => ({
          type: 'location.save',
          ...(location ? { id: location.id, expectedVersion: location.version } : {}),
          name: String(d.get('name')),
          address: String(d.get('address')),
          state: String(d.get('state')) as Location['state'],
        }))
      }
    >
      <label>
        Nombre de la sede
        <input name="name" defaultValue={location?.name} required maxLength={120} />
      </label>
      <label>
        Dirección
        <input name="address" defaultValue={location?.address} maxLength={180} />
      </label>
      <label>
        Estado
        <select name="state" defaultValue={location?.state ?? 'active'}>
          {stateOptions}
        </select>
      </label>
      <p className="info-note">
        {usage
          ? `${usage.currentServices} servicios vigentes y ${usage.activeEnrollments} inscripciones están vinculados. `
          : ''}
        Los servicios existentes conservan la sede de su versión. Para mudarlos, publicá nuevas
        condiciones.
      </p>
      <FormError error={f.error} />
      <FormActions pending={f.pending} label={location ? 'Guardar sede' : 'Crear sede'} />
    </form>
  );
}
