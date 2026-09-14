# Plan de Spec-Driven Development (SDD) antes de escribir código

Actualización de ejecución: el usuario autorizó comenzar a desarrollar. Se inició [R1a local](specs/first-vertical-slice/spec.md), acotado por [ADR 0001](adr/0001-primera-entrega.md), sin proveedores externos. Los gates del producto completo siguen pendientes; la autorización no implica que se hayan superado. R1a incluye sus propios diseño, amenazas, tareas y evidencia.

## Artefactos obligatorios por capacidad

Cada carpeta de `docs/specs/<modulo>/<capacidad>/` debe contener:

1. `spec.md`: problema, actores, escenarios, reglas, datos tratados, fuera de alcance y criterios de aceptación verificables.
2. `design.md`: decisiones, modelo de datos, contratos HTTP/eventos, permisos, errores, migración y observabilidad.
3. `tasks.md`: tareas pequeñas, ordenadas por dependencia, con prueba requerida y definición de terminado.
4. `threats.md`: activos, amenazas, abusos posibles, mitigaciones y pruebas negativas.

La secuencia operativa por feature es: `/specify` crea o actualiza la necesidad verificable; `/plan` define arquitectura y contratos; `/tasks` la divide en tareas dependientes; `/implement` sólo ejecuta esas tareas; `/verify` presenta evidencia contra los criterios de aceptación y el threat model.

## Orden de especificación

1. Constitución y glosario común.
2. Identidad, organizaciones y autorización.
3. Alumnos y consentimiento.
4. Servicios, precios versionados y programación.
5. Inscripción, elegibilidad, reservas, espera y asistencia.
6. Cargos, pagos, imputaciones, comprobantes y estados.
7. Recordatorios/notificaciones y CRM.
8. Rutinas, progreso y archivos.
9. Reportes, auditoría, retención y exportación/eliminación de datos.
10. Configuración versionada de organización: sedes, moneda, horarios, políticas, recordatorios y metodología.

## Gates de revisión

- **Gate A — producto:** cada regla ambigua tiene una decisión; no hay “después vemos” en cobros, cupos o permisos.
- **Gate B — diseño:** modelo, APIs, permisos, datos sensibles y migración aprobados antes de tareas.
- **Gate C — seguridad:** threat model y pruebas negativas revisados antes de implementar cada módulo de riesgo.
- **Gate D — release:** evidencia de pruebas, revisión de dependencia, plan de rollback, backups y observabilidad disponibles.

## Backlog inicial de especificaciones

| Prioridad | Spec                             | Resultado verificable                                            |
| --------- | -------------------------------- | ---------------------------------------------------------------- |
| P0        | `identity-organization-access`   | Cada usuario queda aislado por organización y rol.               |
| P0        | `student-profile-consent`        | Alta/archivo de alumno y registro de consentimientos.            |
| P0        | `service-catalog-pricing`        | CRUD no destructivo y precios fechados.                          |
| P0        | `enrollment-scheduling-capacity` | Solicitud, aprobación, reserva y lista de espera sin sobrecupo.  |
| P0        | `billing-partial-payments`       | Cargos, pagos, saldo y estados verde/amarillo/naranja/rojo/gris. |
| P1        | `reminders-delivery`             | Recordatorios consentidos, trazables e idempotentes.             |
| P1        | `student-pwa-self-service`       | Estado de cuenta, agenda, aviso y comprobante.                   |
| P1        | `routines-progress`              | Rutina asignada y progreso mínimo con privacidad.                |
| P2        | `crm-reports`                    | Alertas, tareas, prospectos y reportes.                          |

## Preguntas que deben resolverse en el discovery con el cliente

1. País/proveedor de pagos y medios que acepta; ¿quién confirma transferencias?
2. Regla exacta de vencimientos, prorrateo, congelamiento, créditos, reintegros y morosidad.
3. Sedes, disciplinas, franjas de edad, cupos, cancelaciones y definición de asistencia.
4. Datos de salud que realmente necesita: se eliminará todo campo que no tenga finalidad concreta.
5. Canales de comunicación autorizados, textos, frecuencia, consentimiento y responsable del envío.
6. ¿Habrá menores? Si sí, definir tutor, consentimiento y visibilidad de datos antes de diseñar el módulo.
7. Reportes indispensables para que el entrenador deje de usar planillas.

## Primer hito de código autorizado

Para el producto público se mantienen los gates de las specs P0, contratos, threat models y proveedores. La excepción explícita para demostrar un subconjunto sin datos reales está delimitada en ADR 0001. El primer vertical slice es: crear organización → alta de alumno → crear servicio con precio/horario → inscribir alumno → generar cargo → registrar pago parcial → visualizar estado naranja y auditoría.
