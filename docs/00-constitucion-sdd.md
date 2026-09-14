# Constitución de Spec-Driven Development (SDD) — Plataforma para Entrenadores

## Propósito

Construir una plataforma multi-tenant para que entrenadores de artes marciales y preparación física administren alumnos, servicios, cobros, agenda, rutinas y evolución sin depender de planillas ni mensajes manuales.

## Reglas innegociables

1. **La especificación es la fuente de verdad.** No se implementa una historia si no existe su especificación, criterios de aceptación y pruebas asociadas.
2. **Módulos antes que pantallas.** Cada capacidad del negocio posee límites, datos, API y permisos explícitos; ningún módulo accede directamente a tablas ajenas.
3. **Monolito modular antes que microservicios.** Se prioriza una base de código desplegable y testeable. Sólo se extrae un servicio cuando existan métricas que lo justifiquen.
4. **Seguridad y privacidad por diseño.** Mínimo privilegio, aislamiento de organizaciones, auditoría de cambios críticos y minimización de datos.
5. **Dinero e historial son inmutables.** Un pago, ajuste, precio vigente o asistencia nunca se reescribe silenciosamente: se corrige mediante movimientos/versiones auditables.
6. **Sin borrado destructivo de negocio.** Servicios, alumnos y rutinas se archivan; los datos personales se anonimizan/eliminan sólo mediante un flujo autorizado de privacidad.
7. **Contrato primero.** Tipos de dominio, esquema de base de datos y contrato HTTP/eventos se acuerdan antes de UI. La interfaz no decide reglas de negocio.
8. **Pruebas proporcionales al riesgo.** Cobros, permisos, inscripción, cupos, recordatorios y datos sensibles requieren pruebas de unidad, integración y flujo crítico.
9. **Observabilidad desde el primer release.** Errores, auditoría, colas, métricas de negocio y alertas deben permitir entender qué ocurrió sin leer la base de datos manualmente.
10. **Cambios por especificación.** Toda modificación sigue: propuesta → revisión → actualización de spec → plan/tareas → implementación → evidencia de pruebas.
11. **Configuración antes que código.** Las políticas operativas del entrenador se modelan como configuración editable y versionada; sólo las reglas de integridad, seguridad y auditoría permanecen innegociables en el dominio.

## Definición de terminado

Una historia se considera terminada sólo si: cumple sus criterios de aceptación, tiene pruebas automatizadas, respeta permisos y aislamiento, documenta cambios de datos/API, emite auditoría si corresponde y cuenta con monitoreo de errores.

## Ciclo obligatorio por cambio

`constitución → /specify → /plan → /tasks → /implement → /verify`

Un cambio de requisito vuelve a `/specify`; no se parchea el código como sustituto de actualizar la fuente de verdad. Cada etapa deja un artefacto versionado y revisable.
