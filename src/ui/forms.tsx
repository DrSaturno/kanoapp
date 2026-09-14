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
import { FormActions, FormError } from './primitives';
export type RunCommand = (command: Command) => Promise<void>;
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
}: {
  data: Workspace;
  service?: Service;
  version?: ServiceVersion;
  run: RunCommand;
}) {
  const f = useFormCommand(run);
  const [amount, setAmount] = useState(version ? String(version.amount / 100) : '');
  const [currency, setCurrency] = useState(version?.currency ?? data.settings.currency);
  const [effectiveOn, setEffectiveOn] = useState(
    version
      ? addDays(version.effective_on >= data.today ? version.effective_on : data.today, 1)
      : data.today,
  );
  const activeLocations = data.locations.filter((l) => l.state === 'active');
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
          defaultValue={version?.location_id ?? activeLocations[0]?.id}
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
      {!activeLocations.length && (
        <p className="form-error">Primero creá una sede activa en Configuración.</p>
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
export function LocationForm({ location, run }: { location?: Location; run: RunCommand }) {
  const f = useFormCommand(run);
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
        Los servicios existentes conservan el nombre de sede de su versión. Para mudarlos, publicá
        nuevas condiciones.
      </p>
      <FormError error={f.error} />
      <FormActions pending={f.pending} label={location ? 'Guardar sede' : 'Crear sede'} />
    </form>
  );
}
