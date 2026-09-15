# A-01 — Agenda operativa, cupos y asistencia

## Estado

`verified-local`

## Resultado

El entrenador puede convertir los horarios versionados de sus servicios en clases concretas, asignar alumnos, controlar cupos y lista de espera, cancelar reservas y registrar asistencia sin perder trazabilidad.

## Alcance de esta entrega

- Nueva vista **Agenda** en el panel del entrenador.
- Generación de clases entre dos fechas (máximo 31 días) para hasta 20 servicios activos.
- Previsualización y confirmación explícita antes de generar.
- Cada clase conserva una instantánea del nombre, disciplina, modalidad, sede, horario, duración y capacidad vigentes para esa fecha.
- Inscripción asistida por el entrenador de alumnos con inscripción activa al servicio.
- Cupo confirmado hasta la capacidad; excedentes en lista de espera ordenada.
- Al cancelar una reserva confirmada, promoción automática del primer alumno en espera.
- Cancelación de una clase preservando el historial.
- Toma y corrección de asistencia (`presente`, `ausente`, `sin aviso`) con control de concurrencia.
- Registro de auditoría para cada mutación.

## Fuera de alcance

- Portal del alumno y solicitud/autogestión de reservas.
- Avisos push, WhatsApp o correo.
- Políticas configurables de cancelación tardía y ofertas temporales de espera.
- Recurrencias infinitas: la generación siempre usa un rango explícito.

## Reglas de dominio

1. Sólo se generan clases de servicios activos y versiones vigentes en la fecha de cada clase.
2. Un servicio puede tener como máximo una clase en la misma fecha; repetir una generación o cambiar después su horario no duplica el bloque ya creado.
3. Una reserva exige alumno activo, clase programada e inscripción activa al servicio.
4. Un alumno no puede tener dos reservas activas para la misma clase.
5. La asignación de cupo se calcula dentro de la transacción serializada de la organización.
6. La espera mantiene orden estable por posición, fecha de creación e identificador.
7. Cancelar una reserva confirmada promueve exactamente a una persona en espera, si existe.
8. La asistencia sólo puede tomarse el día de la clase o después, e incluye todos los alumnos confirmados de la sesión.
9. Versiones esperadas evitan sobrescribir cambios concurrentes.
10. Ninguna baja elimina registros históricos; las clases y reservas cambian de estado.

## Criterios de aceptación

- Dos solicitudes concurrentes por el último cupo producen un confirmado y un alumno en espera.
- Repetir el mismo comando idempotente devuelve el mismo resultado; reutilizar la clave con otra carga responde conflicto.
- Una generación fallida no deja clases parciales.
- Modificar un servicio después de generar no altera las clases existentes.
- Cancelar un confirmado promueve al primero de la espera y queda auditado.
- Una actualización de asistencia obsoleta responde conflicto y no pisa datos.
- En 375 px se puede localizar una clase y abrir su nómina sin desplazamiento horizontal.
- Los estados nunca se comunican sólo con color.
