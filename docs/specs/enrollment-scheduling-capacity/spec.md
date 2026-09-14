# E-04 — Inscripciones, reservas, espera y asistencia

**Tags:** `P0 feature enrollments schedule risk:capacity ux test`

**Estado:** `spec-review`

## Resultado

Un alumno solicita o recibe una inscripción; puede reservar clases grupales, avisar ausencia y conservar una experiencia clara ante cupos completos.

## Estados

- `EnrollmentRequest`: solicitada, aprobada, rechazada, espera, cancelada, expirada.
- `Enrollment`: pendiente de pago, activa, pausada, finalizada, cancelada.
- `Booking`: confirmada, espera, cancelada, cancelación tardía, presente, ausente, no-show.

## Reglas

- El entrenador puede crear inscripción directa; el alumno solicita desde servicios elegibles.
- Aprobar solicitud vuelve a validar elegibilidad y cupo en una transacción. Si el grupo se llenó, crea espera y no inscripción activa.
- La reserva exige inscripción activa y abre según la política vigente del servicio. No hay dos reservas activas del mismo alumno para la misma sesión.
- Cancelar dentro de la ventana vigente libera cupo; por debajo cambia a cancelación tardía, según política versionada del servicio.
- Al finalizar clase, entrenador toma asistencia de una sola vez y puede corregirla, dejando auditoría.
- La lista de espera mantiene orden de solicitud, salvo prioridad manual auditable del entrenador.

## Criterios de aceptación

1. Cien intentos concurrentes sobre el último cupo producen exactamente una reserva confirmada.
2. El alumno en espera recibe una oferta única con vencimiento; expirada pasa al siguiente sin intervención manual.
3. Alumno pausado, archivado o con documentación obligatoria vencida no puede reservar.
4. El alumno puede confirmar/cancelar desde móvil en no más de dos interacciones desde `Hoy`.
