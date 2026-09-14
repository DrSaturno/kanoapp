# E-01 — Identidad, organización y acceso

**Tags:** `P0 feature identity security risk:authorization`

**Estado:** `spec-review`

## Resultado

Un usuario inicia sesión y opera exclusivamente dentro de su organización, según permisos explícitos. Ninguna ruta, consulta, archivo o evento permite cruzar datos entre organizaciones.

## Roles iniciales

| Acción                                       | Dueño | Administrador |                Profesor |         Alumno/Tutor |
| -------------------------------------------- | ----: | ------------: | ----------------------: | -------------------: |
| Configurar organización, roles y pagos       |    Sí |            No |                      No |                   No |
| Gestionar alumnos, servicios e inscripciones |    Sí |            Sí |          Sólo asignados | Sólo propio/tutelado |
| Registrar/confirmar pagos                    |    Sí |            Sí |                      No |                   No |
| Tomar asistencia                             |    Sí |            Sí | Sólo sesiones asignadas |     Confirmar propia |
| Ver métricas de otros alumnos                |    Sí |            Sí |          Sólo asignados |                   No |

## Reglas

- `organization_id` se determina desde la membresía de sesión, no desde parámetros de cliente.
- Dueño puede invitar, revocar y modificar administradores/profesores. No puede eliminar el último dueño.
- Alumno o tutor no puede autoasignarse rol ni unirse a una organización sin invitación/aprobación.
- MFA es obligatorio para dueño/administrador antes de producción; opcional para el resto.
- Las sesiones se revocan al cambiar contraseña, suspender membresía o revocar acceso.

## Contratos de producto

- `POST /auth/session` inicia sesión; mensajes idénticos para usuario inexistente/contraseña inválida.
- `POST /organizations/:id/invitations` crea invitación limitada por rol y expiración.
- `POST /invitations/:token/accept` vincula la cuenta sólo con el rol incluido en la invitación.
- `GET /me/context` devuelve organización seleccionada, roles y permisos efectivos.

## Criterios de aceptación

1. Cambiar un identificador de organización en la URL o solicitud no revela ni modifica datos ajenos.
2. Un profesor no puede confirmar pagos ni editar servicios, aun si llama directamente a la API.
3. Revocar una membresía invalida sesiones activas en un plazo máximo de cinco minutos.
4. Toda modificación de membresía, rol o configuración de MFA genera `AuditEvent` con actor, objetivo, fecha y organización.

## Amenazas y pruebas negativas

- IDOR: probar cada recurso con IDs válidos de otra organización y esperar 404/403 sin filtrar existencia.
- Escalación vertical: forzar claims/roles del cliente y esperar denegación del servidor.
- Fuerza bruta: rate limit, bloqueo progresivo y alertas sin enumeración de cuentas.
- CSRF/sesión: cookies seguras, token CSRF en mutaciones y rotación de sesión.
