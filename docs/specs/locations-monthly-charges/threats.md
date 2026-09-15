# Amenazas R1a.1

Se heredan los límites locales y gates de [R1a](../first-vertical-slice/threats.md).

| Riesgo                                                     | Mitigación y prueba                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Cargo duplicado por reintento o dos pestañas               | Unicidad inscripción-mes, clave persistida, hash canónico, bloqueo y tests concurrentes.                                                |
| Manipulación del precio/moneda/alumno                      | Precio y alumno derivados del contrato, comparación de snapshot y RLS. Tests de payload adulterado y organización ajena.                |
| Lote parcialmente confirmado                               | Una sola transacción con auditoría; cualquier conflicto revierte todo. Test con item válido seguido de inválido.                        |
| Cambio de actividad después de la vista previa             | Revalidación de estados dentro de transacción. No confiar en checkboxes del cliente.                                                    |
| Error de migración reescribe dinero                        | Tabla de asociación nueva, backfill transaccional, sin UPDATE de cargos/pagos. Tests desde esquema previo y fallo por duplicado legado. |
| Facturar por accidente un servicio que no es mensual       | Selección vacía por defecto, aviso de alcance, resumen y confirmación explícita. Nunca se ejecuta en un job.                            |
| Vencimiento retroactivo genera deuda sorpresiva            | Fecha visible por cuota y consentimiento adicional al confirmar vencimientos pasados. Sin prorrateos ocultos.                           |
| Alta de sede pierde formulario o pausa contratos sin aviso | Alta rápida independiente, edición con impacto, snapshot histórico y prueba de navegación. Pausar sede no da de baja contratos.         |
| Lotes masivos/bloqueos                                     | 100 items por comando, 32 KiB por request y unicidad de IDs; requiere dividir lotes mayores.                                            |

No se admiten consultas SQL del cliente ni se amplían permisos del rol de negocio sobre identidad. No hay envío de información a sistemas externos nuevos.
