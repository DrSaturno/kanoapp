# Arquitectura técnica y seguridad v0.1

## 1. Decisión arquitectónica

Se construirá un **monolito modular multi-tenant** con frontend web/PWA y una API de servidor. Esta elección permite velocidad, transacciones consistentes para cupos/cobros, despliegue simple y límites de módulos claros. No se adoptarán microservicios al inicio.

```text
Web/PWA (entrenador y alumno)
        │ HTTPS
API / BFF
 ├─ Identidad y organizaciones
 ├─ Catálogo y programación
 ├─ Inscripciones, cupos y asistencia
 ├─ Facturación, pagos e integraciones de cobro
 ├─ Rutinas, progreso y archivos
 ├─ Notificaciones y CRM
 └─ Auditoría / reportes
        │
Base relacional ─ Cola de trabajos ─ Almacenamiento privado de archivos
        │
Proveedores: pagos, email, push y mensajería (adaptadores intercambiables)
```

### Stack de referencia (a validar antes de implementar)

- TypeScript de extremo a extremo.
- Web/PWA con React y un framework de renderizado del lado servidor.
- API HTTP tipada y documentada con OpenAPI; validación de entradas en runtime.
- Base de datos relacional PostgreSQL para transacciones y reportes.
- Cola para recordatorios, webhooks, reintentos e informes pesados.
- Almacenamiento de objetos privado para comprobantes, videos y fotos, con URLs firmadas de corta duración.

La tecnología concreta se elegirá en una ADR antes del scaffold; la arquitectura no dependerá de un proveedor único.

## 2. Estructura de código propuesta

```text
apps/
  web/                         # UI PWA; rutas por rol
  api/                         # composición HTTP/BFF y workers
packages/
  domain/                      # entidades, value objects, reglas sin framework
  contracts/                   # OpenAPI, DTOs, eventos, validadores compartidos
  modules/
    identity/
    organizations/
    students/
    services-catalog/
    scheduling-attendance/
    enrollments/
    billing-payments/
    training-progress/
    notifications-crm/
    files/
    audit-reporting/
  infrastructure/              # DB, cola, proveedores, observabilidad
  ui/                          # design system accesible y sin reglas de negocio
docs/
  specs/                       # specs versionadas por capacidad
  adr/                         # decisiones arquitectónicas
  threat-model/                # amenazas y controles
  api/                         # contratos publicados/generados
```

Cada módulo expone casos de uso y contratos, pero no tablas internas. Las dependencias van hacia `domain/contracts`; las integraciones externas se implementan como adaptadores. Esto evita acoplar la lógica de pagos a un proveedor o la UI a la base de datos.

## 3. Modelo de datos conceptual

| Área          | Entidades principales                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| Tenancy       | Organization, Location, OrganizationSettings, User, Membership, Role, Permission       |
| Personas      | StudentProfile, GuardianContact, Consent, EmergencyContact                             |
| Oferta        | Service, ServicePriceVersion, ScheduleTemplate, Session, CapacityPolicy, PolicyVersion |
| Operación     | Enrollment, EnrollmentRequest, Booking, WaitlistEntry, Attendance                      |
| Dinero        | Charge, Payment, PaymentAllocation, Adjustment, PaymentProof, PaymentLink              |
| Entrenamiento | RoutineTemplate, AssignedRoutine, WorkoutSession, Exercise, ProgressMetric, Assessment |
| CRM           | Lead, Tag, Task, CommunicationTemplate, Notification, DeliveryAttempt                  |
| Trazabilidad  | AuditEvent, OutboxEvent, IdempotencyKey                                                |

Todas las tablas con información de negocio llevan `organization_id`. El acceso se restringe además en la aplicación y en la base de datos con políticas de fila (RLS), de modo que una falla en una capa no exponga datos de otra organización.

`OrganizationSettings` y `PolicyVersion` almacenan valores editables —moneda, zona horaria, reglas de reserva/cancelación, cadencia de recordatorios, criterios de elegibilidad y metodología de entrenamiento— con fecha de vigencia, actor y versión. Los hechos ya creados referencian la versión aplicable para que un cambio futuro no altere pagos, reservas o sesiones pasadas.

## 4. Autorización

Roles iniciales: dueño, administrador, profesor y alumno. Las políticas son por acción y recurso, no sólo por pantalla. Ejemplos: profesor sólo ve los grupos asignados; alumno sólo ve su perfil/inscripciones; sólo dueño o administrador confirma pagos o modifica precios.

El contexto de organización y usuario se deriva únicamente de una sesión validada del servidor. Nunca se acepta un `organization_id`, rol o importe enviado por el navegador como fuente de autorización.

## 5. Controles de seguridad

No existe software “inhackeable”; el objetivo es reducir superficie de ataque, detectar incidentes y limitar su impacto.

- **Autenticación:** contraseñas con hash fuerte, verificación de email, MFA obligatorio para dueños/administradores y recuperación de cuenta con expiración. Sesiones cortas con refresh rotativo y cookies `HttpOnly`, `Secure`, `SameSite`; no tokens JWT persistentes expuestos a JavaScript.
- **Autorización y tenancy:** RBAC + controles por recurso, RLS, validación de pertenencia en todos los casos de uso y pruebas específicas contra escalación horizontal/vertical de privilegios.
- **API:** validación por esquema, límites de tamaño, rate limiting, protección CSRF para sesiones por cookie, CORS de lista cerrada, cabeceras de seguridad, sanitización y consultas parametrizadas. Nunca concatenar SQL ni confiar en el cliente.
- **Pagos:** no guardar datos de tarjeta. Usar un proveedor certificado, verificar firmas de webhooks, usar idempotency keys y conciliar eventos del proveedor antes de marcar un pago como confirmado.
- **Archivos:** bucket privado, antivirus/validación MIME y tamaño, nombres aleatorios, URL firmada de corta duración y autorización previa a cada descarga.
- **Secretos:** gestor de secretos, rotación, nunca en repositorio ni logs. Separación estricta de entornos desarrollo/staging/producción.
- **Cifrado y backups:** TLS moderno en tránsito, cifrado administrado en reposo, backups cifrados con restauración probada, RPO/RTO definidos antes de producción.
- **Auditoría:** eventos append-only para pagos, precios, permisos, exportaciones, accesos a datos sensibles y eliminaciones. Alertas ante patrones anómalos.
- **Cadena de suministro:** versiones fijadas, análisis de dependencias, escaneo de secretos, SAST, revisión de PR y actualización regular de vulnerabilidades.

Las lesiones, aptitudes, fotos corporales y métricas de salud requieren minimización, consentimiento explícito y una revisión legal local antes de salir a producción. En Argentina, la Ley 25.326 considera sensible a la información de salud y exige medidas de seguridad/confidencialidad; esta plataforma no debe posicionarse como historia clínica ni como servicio médico sin asesoramiento especializado.

## 6. Calidad, pruebas y operación

| Capa             | Evidencia mínima                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Dominio          | Unit tests de reglas: saldo, estados, cupos, elegibilidad y versiones de precio.              |
| Persistencia/API | Integración: RLS, transacciones, autorización, idempotencia y webhooks.                       |
| UI               | Tests de componentes y flujos PWA: alumno, entrenador, reserva y pago.                        |
| Seguridad        | SAST, dependencias, secretos, prueba de autorización negativa y pentest previo a producción.  |
| Release          | Migraciones reversibles/compatibles, feature flags, staging, backups restaurados y checklist. |

Se instrumentan logs estructurados sin datos sensibles, métricas de errores/latencia/colas y métricas de negocio (cobranza, reservas, mensajes fallidos). La observabilidad debe correlacionar una solicitud, evento de auditoría y job sin registrar contenido de salud o pagos.

## 7. Secuencia de implementación

1. Fundación: repositorio, CI, entornos, identidad, organizaciones, roles, auditoría, esquema base y design system.
2. Operación MVP: alumnos, servicios/versiones de precio, inscripciones, agenda, cupos/asistencia y cobros manuales/parciales.
3. Autoservicio alumno: PWA, estado de cuenta, reservas, avisos, comprobantes y notificaciones.
4. Valor deportivo: rutinas, asistencia, métricas y evaluaciones mínimas.
5. CRM e integraciones: tareas, embudo, pagos online, mensajería y reportes.
6. Diferenciación: voz con confirmación, recomendaciones explicables y visualización corporal, tras validar retención y calidad de datos.
