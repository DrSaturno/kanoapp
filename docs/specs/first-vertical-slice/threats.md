# Modelo de amenazas R1a

Ámbito: demostración local con datos ficticios, navegador → API loopback → módulos → PGlite en un único proceso. No es una auditoría externa ni una aprobación de uso productivo. Registrado durante la revisión de R1a; no se presenta como un gate de seguridad completado antes del código inicial.

## Activos y límites

Activos: identidad/sesiones, contactos y nacimiento del alumno, condiciones contratadas, cargos/pagos y auditoría. El navegador es no confiable. El servidor deriva organización y rol de la sesión. La base usa un rol restringido durante transacciones de negocio. El usuario del sistema operativo que controla archivos/proceso está fuera del aislamiento entre organizaciones; RLS no protege frente a un administrador del equipo o código servidor comprometido.

| Amenaza                                      | Control implementado                                                                                                           | Verificación / límite                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leer/escribir otro espacio por ID manipulado | RLS en tablas de negocio, claves compuestas, actor desde sesión                                                                | Tests de lectura/escritura cruzada y referencias ajenas. Sin tenant/rol aceptados desde JSON.                                                        |
| Alumno invoca comandos administrativos       | Denegación por rol en dispatch y proyección                                                                                    | Tests con rol alumno; alta de roles adicionales aún pendiente.                                                                                       |
| Robo/fijación de sesión                      | Token aleatorio, hash almacenado, expiración 12 h, revocación, cookie HttpOnly/SameSite, navegación completa al cambiar sesión | Tests de revocación y token inválido. HTTP permitido sólo local; HTTPS/Secure obligatorios para publicación futura.                                  |
| Fuerza bruta                                 | scrypt con salt; respuesta genérica; límites persistidos globales y por email                                                  | Tests 401/429. Sin proveedor antifraude ni rate limiting distribuido. Puede provocar bloqueo temporal del acceso local.                              |
| CSRF/DNS rebinding                           | Host loopback y Origin exacto, JSON obligatorio                                                                                | Tests origen cruzado, Host externo y URL normalizada por Next. No colocar detrás de un proxy público.                                                |
| Inyección/XSS/cuerpo masivo                  | SQL parametrizado, Zod estricto, escape React, sin HTML libre, límite 32 KiB                                                   | Tests contrato/JSON/cuerpo; CSP básica, sin `dangerouslySetInnerHTML`. CSP permite inline/eval para runtime local: pendiente nonce y endurecimiento. |
| Pago duplicado/excesivo o sobrecupo          | Clave idempotente persistida, transacción con bloqueo y verificación de saldo/cupo                                             | Tests reintento, contenido distinto, pagos y altas concurrentes, rollback.                                                                           |
| Cambio silencioso de dinero/condiciones      | Triggers inmutables, snapshots y auditoría atómica de comandos                                                                 | Tests update/delete rechazados, versiones y archivo con saldo. Correcciones financieras no implementadas: no editar SQL manualmente.                 |
| Pérdida de actualización                     | expectedVersion y conflicto 409                                                                                                | Tests edición concurrente. No sobreescribir desde una pestaña antigua.                                                                               |
| Fuga en Git/logs                             | Datos/env/cache fuera de Git; errores inesperados registran ID y clase, no payload                                             | Revisión previa al commit. Los datos demo son ficticios; no se publican DB ni capturas de sesión.                                                    |
| Robo de archivo o pérdida de disco           | Exclusión Git y procedimiento de respaldo local documentado                                                                    | No hay cifrado propio, backups automáticos ni recuperación certificada. Un solo proceso por carpeta.                                                 |

## Bloqueantes para publicar o tratar datos reales

- Identidad gestionada o revisión equivalente: verificación email, recuperación, MFA del entrenador, rotación y gestión de dispositivos/roles.
- PostgreSQL operativo con roles separados, pool, runner incremental de migraciones, backups/PITR y ensayo de restauración; no PGlite en almacenamiento efímero.
- TLS, configuración de proxy confiable, CSP con nonce, control de abuso/registro y límites distribuidos; retirar fixture público.
- Política de privacidad/retención, exportación y anonimización, consentimiento/tutores antes de menores o salud. Revisión legal según país y tratamiento efectivo.
- Ajustes/reversiones auditables, conciliación y garantías del proveedor antes de dinero real o webhooks; nunca confiar en redirección del navegador.
- Telemetría de seguridad sin datos sensibles, alertas, respuesta a incidentes, pruebas de accesibilidad y pruebas E2E automatizadas reproducibles en CI.

Se requiere verificar nuevamente los controles después de sustituir adaptadores o habilitar acceso remoto. Ninguna configuración del entrenador puede desactivar aislamiento, validación de importes o conservación del historial.
