# Backlog SDD ejecutable

Actualización R1a: comenzó la implementación de un subconjunto local de R0/R1. La evidencia y los pendientes efectivos están en [tareas R1a](specs/first-vertical-slice/tasks.md) y [ADR 0001](adr/0001-primera-entrega.md). Las épicas siguientes describen el producto completo, no capacidades ya entregadas. No se han contratado proveedores ni habilitado producción.

## Convención de tags

Cada tarea e issue utiliza etiquetas acumulables:

- Prioridad: `P0`, `P1`, `P2`.
- Tipo: `feature`, `security`, `ux`, `architecture`, `test`, `docs`, `integration`.
- Módulo: `identity`, `students`, `services`, `schedule`, `enrollments`, `billing`, `training`, `notifications`, `crm`, `reporting`.
- Riesgo: `risk:money`, `risk:privacy`, `risk:authorization`, `risk:capacity`, `risk:external`.
- Estado SDD: `spec-needed`, `spec-review`, `planned`, `ready-for-code`, `in-progress`, `verify`, `blocked`.

## Épicas y entregables

| ID   | Épica                                | Tags                                                              | Condición para quedar `ready-for-code`                                                         |
| ---- | ------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| E-01 | Identidad, organización y roles      | `P0 feature identity security risk:authorization`                 | Modelo de roles, sesión, RLS, pruebas de acceso negativo y auditoría definidos.                |
| E-02 | Alumnos y consentimiento             | `P0 feature students security risk:privacy ux`                    | Datos mínimos, tutor, archivo, consentimiento, permisos y solicitudes de privacidad definidos. |
| E-03 | Servicios, precios y horarios        | `P0 feature services schedule risk:money ux`                      | Estados, versiones de precio, publicación, sede/cupo y simulación de impacto definidos.        |
| E-04 | Inscripciones, reservas y asistencia | `P0 feature enrollments schedule risk:capacity ux test`           | Elegibilidad, transacción de cupo, espera, cancelación y asistencia definidos.                 |
| E-05 | Cobros y pagos parciales             | `P0 feature billing security risk:money risk:external test`       | Ledger, imputación, estados, comprobantes, idempotencia, webhook y auditoría definidos.        |
| E-06 | App del alumno y avisos              | `P1 feature ux notifications`                                     | Navegación móvil, consentimiento, PWA y escenarios de reserva/pago definidos.                  |
| E-07 | Rutinas y progreso                   | `P1 feature training ux risk:privacy`                             | Permisos, métricas opcionales, contenidos y acceso a archivos definidos.                       |
| E-08 | CRM, reportes y voz                  | `P2 feature crm reporting risk:privacy`                           | Reglas de alertas, tareas, exportación y confirmación humana de voz definidos.                 |
| E-09 | Configuración versionada             | `P0 feature architecture services schedule billing risk:money ux` | Cada política operativa puede editarse, programarse y auditarse sin alterar hechos históricos. |

## Secuencia de implementación futura

### Release 0 — Fundación

- Crear monorepo, CI, entornos, diseño de tokens, autenticación, organización, roles, auditoría, contratos y observabilidad base.
- Tags: `P0 architecture security identity test docs`.

### Release 1 — Operación administrativa

- E-02 a E-05 + E-09: alumno, configuración versionada, servicios/horarios, inscripciones/cupos y cobros manuales/parciales.
- Vertical slice obligatorio: organización → alumno → servicio → inscripción → cargo → pago parcial → estado naranja → auditoría.

### Release 2 — Autoservicio del alumno

- PWA, agenda, reservas, avisos, estado de cuenta, links de pago y comprobantes.

### Release 3 — Entrenamiento y fidelización

- Rutinas, asistencia, métricas, CRM, reportes y luego integraciones de mensajería.

### Release 4 — Diferenciación

- Voz confirmada, recomendaciones explicables y visualización corporal futurista basada en datos ya validados.

## Definition of Ready

Una tarea no pasa a `ready-for-code` hasta contar con: spec aprobada, criterios de aceptación, contrato, permisos, amenazas, migración de datos, telemetría, diseño UX de estados relevantes y estrategia de pruebas.
