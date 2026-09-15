# R1a.1 — Sedes visibles y cuotas mensuales asistidas

Estado: implementación autorizada por el usuario al aprobar R1a y pedir avanzar. Se mantiene el entorno local y no se habilitan proveedores, datos reales ni despliegues públicos.

## Problemas

La gestión de sedes existe en Configuración, pero sus iconos y ubicación no permiten encontrarla fácilmente. Además, el flujo inicial sólo genera un cargo por inscripción: hace falta una operación explícita para los meses siguientes.

## Aceptación

- LOC01: “Sedes” aparece en navegación principal de escritorio y móvil, con “Nueva sede” y “Editar sede” visibles en texto. Listado, búsqueda, filtros activo/pausado/archivado y estado vacío accionable.
- LOC02: nombre y dirección se crean/editan; pausa/archivo/reactivación no borran datos. Antes de guardar se informa qué servicios usan la sede y qué pasa con nuevas inscripciones.
- LOC03: Servicios y Configuración enlazan a Sedes. Desde el formulario de servicio se puede crear una sede sin perder los datos del servicio ni enviarlo accidentalmente.
- LOC04: renombrar una sede no reescribe el nombre histórico de una versión contratada. Las versiones nuevas usan la sede actual. Ediciones concurrentes y referencias de otra organización se rechazan.
- BIL01: Cobros ofrece “Generar cuotas”. El entrenador elige mes y las inscripciones que realmente cobra mensualmente; no se presupone que todo servicio sea una suscripción mensual. Ninguna selección ni cobro se ejecutan sin confirmar.
- BIL02: vista previa con alumno, servicio contratado, importe, moneda, vencimiento editable dentro del mes y totales separados por moneda. El día habitual se toma del cargo inicial y se ajusta al último día si no existe. No se hace prorrateo ni se modifica el precio contratado.
- BIL03: sólo alumnos, inscripciones y servicios activos. Se omiten períodos ya generados y meses anteriores al primer cargo. Sede pausada impide nuevas inscripciones, pero no cancela contratos ni sus cargos; finalizar/pausar el servicio o alumno determina la elegibilidad mensual. Se explica en UI.
- BIL04: un único cargo por inscripción y mes, incluyendo el inicial. Reintentar el mismo lote con la misma clave/contenido devuelve el mismo resultado sin duplicar. Una clave con otro contenido da 409. Generar desde dos pestañas no duplica cargos.
- BIL05: servidor deriva alumno, concepto, importe y moneda desde la inscripción; compara las condiciones esperadas de la vista previa. Si una selección cambió, ya fue generada o está inactiva, rechaza el lote completo (sin escritura parcial).
- BIL06: hasta 100 cuotas por lote, importes enteros, validación de fecha/mes y confirmación de vencimientos pasados. Esta operación crea obligaciones internas, no cobra dinero, no envía avisos y no corre automáticamente.
- BIL07: períodos visibles en cuenta corriente/Cobros; historial registra actor, mes, cuotas y totales. Reglas de pagos parciales previas siguen vigentes.
- MIG01: migración incremental 002, transaccional y reaplicable. Asocia cargos existentes a su mes de vencimiento sin modificar cargos ni pagos. Conflictos de datos legados detienen la migración; no se descarta dinero para resolverlos.

## Fuera de alcance

Cobro automático, recordatorios, procesadores de pago, reversión, reajuste masivo de precios, asignación automática de periodicidad a servicios, cambio de contratos ya aceptados, impuestos y ciclo de bajas retroactivas. No se amplía autorización para producción.
