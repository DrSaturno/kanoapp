# ADR 0001 — Primera entrega vertical local

Estado: aceptada para implementación local por autorización del usuario. Las specs completas continúan como objetivo de producto; esta entrega implementa el subconjunto verificable R0/R1a.

- Next.js App Router, React y TypeScript; módulos de negocio en `src/modules`, contratos en `src/contracts`, reglas puras en `src/domain`, persistencia en `src/infrastructure`. Un solo paquete inicialmente: no crear paquetes vacíos; extraer workspaces cuando existan consumidores reales.
- PostgreSQL embebido (PGlite) persistente en `.kano/db` exclusivamente para desarrollo local, con transacciones, restricciones y RLS bajo un rol sin bypass. Permite demostrar el flujo sin contratar ni provisionar servidores. Un solo proceso accede a esa carpeta; tests usan bases aisladas en memoria. PostgreSQL administrado, pool, migraciones operativas y despliegue son el siguiente hito.
- Login local con scrypt, sesiones opacas revocables y cookie HttpOnly/SameSite, validación Origin, límite de cuerpo y denegación por defecto. La identidad completa con MFA, email verificado, recuperación, tutores y profesores todavía no se declara implementada.
- Runtime sólo en loopback, incluso tras `next build`; se bloquea acceso por hosts/orígenes externos. No exponer esta entrega a Internet. La autenticación no se sustituye por un selector de rol.
- Primera UI: dashboard, alumnos (alta/edición/archivo), servicios (versiones de precio/horario/sede), inscripción administrativa con cargo, pago manual parcial/completo, ajustes operativos e historial. Otras capacidades se mantienen en backlog: sin botones que aparenten integraciones activas.
- Precios e importes en unidades menores enteras con moneda por movimiento. Política/versión fijada en inscripción/cargo. Moneda nueva sólo para nuevos servicios; no convertir histórico ni sumar monedas diferentes.
- Historial financiero prevalece sobre estado de actividad: alumno pausado con deuda vencida se muestra rojo, con estado de actividad separado. Corrige el precedente gris que ocultaba deudas.
- Cambio operativo de nombre/sede/horario crea versión. Esta entrega aplica cambios a nuevas altas/inscripciones; las existentes conservan condiciones. Migración masiva requiere spec/pruebas posteriores. Pausar/archivar impide nuevas inscripciones, no borra ni anula saldos.

Fuentes técnicas: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [PGlite](https://pglite.dev/docs/), [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [OWASP sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Versiones exactas en lockfile.
