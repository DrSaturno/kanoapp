# E-03 — Servicios, precios y horarios

**Tags:** `P0 feature services schedule risk:money ux`

**Estado:** `spec-review`

## Resultado

El entrenador administra toda su oferta sin romper inscripciones o deuda histórica: servicios, modalidades, precios fechados, reglas, sedes, horarios, cupos y responsables.

## Entidades y estados

- `Service`: borrador, activo, pausado, archivado.
- `PriceVersion`: programada, vigente, finalizada, cancelada.
- `ScheduleTemplate`: activo, pausado, archivado; día, hora, duración, sede, cupo y responsable.
- `Session`: instancia concreta de horario; programada, cancelada, completada.

## Reglas de publicación

- Sólo dueño/administrador crea o modifica. Profesor puede proponer cambios futuros si se habilita, nunca publicarlos.
- Servicio grupal activo requiere por lo menos un horario activo, modalidad de cobro y precio vigente.
- La edición de un horario afecta únicamente sesiones futuras no reservadas; si existen reservas se debe elegir: mantener, reprogramar con notificación o cancelar según política.
- Archivar bloquea nuevas solicitudes y reservas, conserva usuarios, sesiones, precios y cargos históricos.
- Precio vigente no se edita. Crear una nueva versión requiere importe, moneda, fecha y alcance: sólo altas/renovaciones o migración de inscripciones existentes.
- Sede, responsable, duración, cupo, modalidad, requisitos y horario son editables mediante una versión con vigencia. Los cambios pueden aplicarse a futuras sesiones, inscripciones nuevas o inscripciones existentes con previsualización explícita.

## Elegibilidad configurable

Edad mínima/máxima, nivel técnico, requisito de documentación, invitación, estado de pago y cupo. En el MVP se permiten reglas AND simples; reglas complejas quedan fuera de alcance.

## Criterios de aceptación

1. Publicar servicio incompleto falla indicando cada requisito faltante.
2. Un cambio de precio futuro muestra antes de confirmar cantidad de inscripciones afectadas y próximo cargo estimado.
3. Archivar un servicio no altera un cargo, precio o asistencia ya registrados.
4. Un alumno sólo ve servicios activos para los que supera la elegibilidad básica; la API aplica la misma regla.
5. Modificar un servicio, horario o precio no modifica una sesión, reserva, cargo o inscripción histórica sin una acción de migración explícita y auditada.
