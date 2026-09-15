# Kano

Gestión de entrenamiento para profesionales de artes marciales y preparación física. Entrega **R1a.2: administración y agenda local**, desarrollada por módulos y guiada por especificaciones (SDD).

## Qué funciona

- Cuenta de dueño, inicio/cierre de sesión y espacio separado por organización.
- Alumnos adultos: alta, edición, pausa, archivo, reactivación, búsqueda y ficha.
- Sedes en una sección propia, con búsqueda, estados, impacto y alta rápida al crear un servicio. Servicios personales, grupales e híbridos con condiciones versionadas.
- Inscripción administrativa a varios servicios, primer cargo y generación mensual asistida con vista previa y confirmación.
- Agenda por bloques generada desde los horarios versionados, cupos por clase, lista de espera con promoción automática y asistencia corregible.
- Cobros manuales completos/parciales, saldo derivado, cinco estados visuales y auditoría. Reintentos de un mismo pago no duplican movimientos.
- Ajustes de nombre del espacio, zona horaria, moneda inicial, ventana de próximo vencimiento y medios manuales habilitados.
- Panel adaptable a escritorio y pantallas móviles. Los datos sobreviven a las recargas y al reinicio del servidor.

**No es todavía una aplicación de producción.** Usar sólo con datos ficticios en este equipo; no exponer por túnel, proxy público o red local. No hay garantía de software “inhackeable”. Los controles y riesgos pendientes están en el [modelo de amenazas](docs/specs/first-vertical-slice/threats.md).

## Probar en este equipo

Requisitos: Node.js 22.14 o superior (CI usa Node 22), npm y un navegador moderno. Desde la raíz del repositorio:

```sh
npm ci
npm run db:seed
npm run dev
```

Abrir [Kano local](http://127.0.0.1:3000). La carga demo es opcional: sin ella se puede crear un espacio desde la pantalla de acceso.

Credenciales **públicas y exclusivas de la demo ficticia**:

- Email: `entrenador@kano.test`
- Contraseña: `KanoDemo-Local-2026!`

El script no reemplaza un espacio demo ya creado. Ejecutarlo **antes** de iniciar el servidor: PGlite permite un solo proceso por carpeta de datos. No ejecutar dos servidores con la misma base.

Los valores de `.env.example` ya son los predeterminados; no hace falta crear un archivo de entorno. Si se cambia el puerto, `KANO_ORIGIN` debe coincidir exactamente con el origen del navegador. No usar `localhost` y `127.0.0.1` indistintamente cuando se haya fijado ese valor.

### Recorrido inicial

1. Sedes → crear o modificar un lugar de entrenamiento.
2. Servicios → nuevo servicio con precio, horario y cupo.
3. Alumnos → nuevo alumno → abrir su ficha → inscribir.
4. Elegir el vencimiento del primer cargo.
5. Agenda → generar clases → revisar el rango → gestionar alumnos de un bloque.
6. En una clase de hoy, tomar asistencia; las correcciones quedan versionadas y auditadas.
7. Cobros → generar las cuotas del período seleccionando alumnos y revisando importes.
8. Registrar una parte del pago. Consultar saldo, estado naranja e Historial.

Un parcial vencido se destaca en rojo, con el pago recibido conservado. Pausar/archivar no elimina saldos. Las nuevas condiciones de un servicio se aplican a **nuevas inscripciones** desde su vigencia; las existentes mantienen su versión. La migración de alumnos a nuevas condiciones será un flujo explícito posterior, con vista previa.

## Verificación

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

`npm run check` encadena tipos, lint, tests y build. Detener el servidor de desarrollo antes del build: comparten `.next`. `npm run start` ejecuta el build también en loopback; **no habilita un despliegue público**.

Las pruebas automatizadas usan bases aisladas, nunca `.kano/db`. El recorrido inicial está en [verificación R1a](docs/specs/first-vertical-slice/verification.md) y la agenda en [verificación R1a.2](docs/specs/trainer-schedule-attendance/verification.md). El workflow de GitHub ejecuta tipos, lint, tests y build; no envía notificaciones ni provisiona servicios.

## Estructura

```text
docs/                 Constitución, producto, ADR, specs, tareas y evidencia
design-system/        Dirección UX/UI
src/app/              Rutas Next y límites HTTP
src/ui/               Pantallas y formularios; sin acceso a la base
src/contracts/        Esquemas de entrada y proyecciones tipadas
src/domain/           Dinero, fechas, estados y errores puros
src/modules/          Identidad, alumnos, catálogo, inscripciones, agenda, cobros y consultas
src/infrastructure/   PostgreSQL embebido, migración, transacciones y seguridad HTTP
tests/                Reglas, seguridad, persistencia y concurrencia
scripts/              Datos ficticios explícitos
```

Stack: Next.js App Router, React, TypeScript, Zod y PostgreSQL embebido con PGlite. Versiones reproducibles en `package-lock.json`. Monolito modular en un solo paquete; todavía no hace falta un monorepo de paquetes vacíos. Las decisiones que acotan el plan general están en [ADR 0001](docs/adr/0001-primera-entrega.md).

## Datos y mantenimiento local

La base vive en `.kano/db`, está excluida de Git y contiene información sensible si se cargan datos reales. No es cifrado de aplicación. Mantener permisos del sistema operativo y cifrado de disco. El equipo actual usa una carpeta bajo OneDrive: usar sólo datos ficticios; para datos reales se requiere almacenamiento aprobado fuera de carpetas sincronizadas, además del hito de seguridad.

Para un respaldo de desarrollo, detener el servidor y copiar **toda** la carpeta de datos a un destino privado. No copiar mientras la base está abierta. Para restaurar, mantener la original apartada y configurar `KANO_DATA_DIR` a una copia; nunca restaurar sobre una base en uso. Este procedimiento local no sustituye backups automáticos/PITR ni una prueba de recuperación de producción.

Las migraciones aplicadas se registran en `kano_migrations`. No editar una migración ya usada para cambiar datos: añadir una nueva y probar actualización/restauración. El runner aplica 001, 002 y 003 en orden y dentro de transacciones separadas.

## Próximos incrementos

1. PostgreSQL administrado, identidad de producción (verificación/recuperación/MFA), permisos completos, backups y controles de despliegue.
2. Reglas recurrentes automáticas, ajustes/reversiones, comprobantes e integraciones de pago. Hoy las cuotas mensuales se generan de manera manual, seleccionada y confirmada; no cobran dinero por sí mismas.
3. Portal/PWA del alumno, solicitud y autogestión de reservas sobre la agenda ya implementada, políticas de cancelación y avisos.
4. Recordatorios consentidos, rutinas semanales personales/grupales, métricas de progreso y CRM.
5. Voz con confirmación y visualización corporal futurista opcional, respetando accesibilidad y rendimiento.

No hay todavía cuentas de alumnos, autoservicio de reservas, notificaciones enviadas, archivos, pasarela de pago ni PWA instalable. No ingresar menores ni datos de salud hasta el flujo de consentimiento/tutores. El [backlog completo](docs/06-backlog-ejecutable.md) sigue siendo el objetivo; esta entrega no lo marca como terminado.

Para cada incremento: actualizar spec → diseño y amenazas → tareas → código → pruebas y evidencia. Empezar por [spec R1a](docs/specs/first-vertical-slice/spec.md) y [tareas](docs/specs/first-vertical-slice/tasks.md).
