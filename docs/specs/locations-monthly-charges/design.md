# Diseño R1a.1

## UX y código

Se conserva la estructura aprobada y se incorpora la identidad entregada por el cliente: Barlow Condensed para títulos, Barlow para lectura, fondo cálido `#f5f3ef`, texto `#201e1a`, lateral `#0c0c0c`, acción ámbar `#c27a16` y bordes `#e3ded5`. La sede se presenta como lugar de entrenamiento con dirección, actividad y vínculos de servicios, no como un ajuste técnico escondido. Verde/amarillo/naranja/rojo/gris siguen siendo estados financieros con texto e icono para no depender sólo del color.

Pantalla nueva en `src/ui/locations-screen.tsx`, flujo mensual encapsulado en `MonthlyBillingForm` y reglas de vista previa en `src/domain/monthly-billing.ts`. Formularios con etiquetas, foco y confirmación, sin animación ornamental ni iconos como único nombre de acción. El alta rápida de sede se integra como bloque no anidado dentro del flujo del servicio. Conserva el borrador y selecciona la sede creada.

Se reutiliza `/api/commands`: `billing.generate` recibe período `YYYY-MM`, idempotencyKey y hasta 100 items con enrollmentId, expectedServiceVersionId, expectedAmount, expectedCurrency y dueDate. El servidor nunca confía en importes derivados por el navegador. Respuesta extendida `{ok:true,id,count?}`; el resto de comandos mantiene su contrato.

## Persistencia y aislamiento

Migración 002 crea `charge_periods`: asociación inmutable de organización/inscripción/período/cargo, única por inscripción-mes y por cargo. FK compuesta valida que el cargo corresponde a esa inscripción. El backfill asocia los cargos originales usando su vencimiento; no hace UPDATE del ledger.

`billing_batches` conserva hash canónico del comando (items ordenados), clave idempotente, mes y cantidad. Tablas con FORCE RLS, rol `kano_app` y sólo SELECT/INSERT. Comandos y auditoría comparten transacción/bloqueo de organización. El retorno idempotente se resuelve antes de revalidar un lote ya confirmado, sin cambiar su resultado.

El runner aplica una lista explícita y ordenada de archivos en `kano_migrations`; cada migración y su marca se confirman juntas. No se edita 001 ya aplicada. Antes de actualizar la demo persistente, detener servidor y tomar copia privada de la base. La prueba persistente valida el registro ordenado de 001 y 002 al reabrir; los fixtures legados conflictivos quedan como hardening previo a producción.

## Decisiones operativas

La selección mensual es manual y arranca vacía. El precio/sede/horario provienen de la versión vinculada a la inscripción, aunque el catálogo tenga una versión más nueva. El vencimiento es configurable por cuota; el mes no cambia al editarlo. Vencimientos pasados requieren una confirmación adicional en UI. El estado financiero sigue derivado, no editable.

Las consultas servidor usan filtros por los IDs del lote, índices compuestos y el rol de tenant. Se mantienen transacciones acotadas (máximo 100 items). Este límite no es una prueba de capacidad de producción.
