# Amenazas — Agenda operativa

| Riesgo                                                  | Control                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Cruce de datos entre organizaciones                     | `organization_id`, RLS forzada y transacción con tenant fijado                    |
| Sobreventa por concurrencia                             | bloqueo estable de organización y conteo dentro de la misma transacción           |
| Duplicación por reintento                               | clave idempotente, hash de solicitud y restricción única servicio/fecha/hora      |
| Manipulación de cupo, sede u horario desde el navegador | instantánea reconstruida exclusivamente desde versiones del servicio              |
| Sobrescritura de asistencia                             | `expectedVersion` en sesión y reservas; toda la lista se valida antes de mutar    |
| Promoción no determinista                               | orden por posición, creación e identificador dentro de la transacción             |
| Generación parcial                                      | lote y clases creados en una sola transacción                                     |
| Eliminación accidental del historial                    | estados de cancelación; sin `DELETE` para rol de aplicación                       |
| Reservas sin vínculo válido                             | claves foráneas tenant-aware más comprobación de alumno e inscripción activos     |
| Abuso de payload                                        | límites Zod: 31 días, 20 servicios y 500 asistencias                              |
| Confusión por zona horaria                              | fechas civiles `YYYY-MM-DD`; “hoy” calculado con la zona configurable del espacio |

## Riesgo residual

PGlite es adecuado para esta entrega local de un solo proceso. Un despliegue multi-instancia deberá reemplazar el adaptador por PostgreSQL administrado y probar las mismas garantías con concurrencia real antes de considerarse producción.
