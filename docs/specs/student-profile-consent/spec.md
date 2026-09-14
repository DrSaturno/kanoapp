# E-02 — Alumnos, perfiles y consentimiento

**Tags:** `P0 feature students security risk:privacy ux`

**Estado:** `spec-review`

## Resultado

El entrenador puede crear y administrar alumnos con datos mínimos, mientras el alumno/tutor controla datos opcionales, comunicaciones y solicitudes de privacidad.

## Datos mínimos

Nombre, apellido, teléfono o email de contacto, fecha de nacimiento, estado y organización. Contacto de emergencia, nivel técnico y notas operativas son opcionales. Para menores, tutor legal, vínculo y datos de contacto son obligatorios.

## Consentimientos separados

1. Términos y privacidad de la plataforma.
2. Comunicaciones operativas (obligatorias para reservas/pagos activos).
3. Comunicaciones no esenciales/marketing (opt-in).
4. Datos físicos sensibles opcionales: peso, perímetros, fotos de progreso, aptitud o molestias.

Cada consentimiento guarda texto/versionado, fecha, actor, canal y posibilidad de revocación. Revocar el consentimiento sensible bloquea futuras cargas y limita visualización según la finalidad; no elimina automáticamente movimientos financieros.

## Reglas

- Un alumno se archiva para salir de operación; no se borran pagos/asistencia necesarios para auditoría.
- El perfil sensible se almacena y sirve sólo a dueño/administrador y, cuando corresponda, al profesor asignado. No se muestra a otros alumnos ni en reportes públicos.
- Alumno/tutor puede solicitar exportación y eliminación. Las solicitudes entran a una cola de administración y quedan auditadas.
- No se usa la app como historia clínica ni se registran diagnósticos o tratamientos.

## Criterios de aceptación

1. Alta de menor sin tutor falla con explicación accionable.
2. Un profesor no asignado no puede leer datos sensibles ni archivos de progreso.
3. Archivar alumno impide nuevas reservas/cargos, pero permite abrir su historial con permiso administrativo.
4. La app del alumno muestra y permite modificar las preferencias de comunicaciones no esenciales.

## UX relevante

- Alta en dos pasos: identidad/contacto; luego tutor, servicios y datos opcionales.
- Campos sensibles llevan finalidad y enlace a consentimiento; no se presumen obligatorios.
- Ficha 360° usa pestañas: resumen, servicios, agenda, cobros, entrenamiento y notas; datos sensibles no aparecen en el resumen por defecto.
