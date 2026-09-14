# E-05 — Cobros, pagos parciales y recordatorios

**Tags:** `P0 feature billing security risk:money risk:external test`

**Estado:** `spec-review`

## Resultado

La aplicación constituye una cuenta corriente confiable por alumno: genera cargos por inscripción, recibe pagos manuales/online, los imputa, muestra saldo y activa recordatorios sin duplicarlos.

## Modelo contable operativo

- `Charge`: obligación con concepto, período, vencimiento, importe original y saldo derivado.
- `Payment`: movimiento inmutable, con monto, fecha efectiva, medio, creador, referencia externa y comprobante opcional.
- `PaymentAllocation`: imputa un pago a uno o varios cargos.
- `Adjustment`: crédito/débito/reversión que referencia el movimiento original y requiere motivo.

No se modifica monto o fecha de un movimiento financiero confirmado. No se permiten montos negativos ni imputación que supere el saldo salvo ajuste/crédito explícito.

## Flujos

### Pago manual

Administrador registra efectivo o confirma/rechaza transferencia con comprobante. Confirmar crea pago e imputación en transacción; rechazar conserva comprobante y motivo, sin afectar saldo.

### Pago online

Servidor crea orden de pago con referencia interna e idempotency key. El alumno paga fuera de la aplicación. Un webhook con firma válida y consulta/conciliación al proveedor autoriza el registro del pago; el retorno del navegador sólo informa estado provisional.

### Recordatorios

Job horario aplica la cadencia aprobada en `04-decisiones-base.md`; deduplica por cargo, tipo, canal y ventana. Un fallo entra a reintento con backoff y genera alerta luego del límite.

## Criterios de aceptación

1. Repetir registro o webhook con la misma idempotency key no duplica pago, imputación ni recordatorio.
2. Un pago parcial antes del vencimiento muestra naranja y saldo exacto; vencido muestra rojo con indicador “pago parcial recibido”.
3. Un usuario sin permiso no puede leer, crear, confirmar, revertir o exportar movimientos financieros.
4. Un webhook con firma inválida no cambia ningún saldo y queda registrado como evento de seguridad sin exponer secretos.
5. El historial del alumno y auditoría muestran quién, cuándo y por qué confirmó o ajustó cada operación.

## Pruebas de borde obligatorias

- Pago igual, menor y mayor que saldo; dos pagos simultáneos; reversión; cargo archivado; cambio de precio futuro; transferencia rechazada; pago aprobado después de vencimiento; reintento de webhook; cambio de organización en URL.
