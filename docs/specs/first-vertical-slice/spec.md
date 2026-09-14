# R1a — Flujo administrativo local

## Aceptación

- AC01: crear cuenta/organización, iniciar/cerrar sesión; acceso privado sin sesión denegado.
- AC02: alta/edición/archivo/reactivación de alumnos adultos con nombre y contacto. Menores y datos de salud quedan fuera de este incremento hasta implementar consentimiento/tutor.
- AC03: alta/edición/pausa/archivo de servicios; nombre, disciplina, modalidad, días, hora, sede, duración, cupo, importe, moneda y vigencia. Versiones anteriores consultables, edición con control de concurrencia.
- AC04: inscribir un alumno en varios servicios activos; snapshot de versión y cargo inicial con vencimiento elegido. Cupo de inscripciones administrado en transacción, duplicados bloqueados. Finalizar inscripción exige confirmación con el impacto visible y conserva los cargos.
- AC05: registrar pagos manuales en un cargo abierto; parciales naranja, vencidos rojo aunque haya pago parcial; saldo cero verde/próximo según otros cargos. Pago idempotente con misma clave y contenido; conflicto si se reutiliza para otro contenido. Exceso y decimales inválidos rechazados.
- AC06: cambiar marca, zona horaria, moneda para nuevas operaciones, plazo próximo al vencimiento y medios de pago habilitados; historial de configuración. Cobros anteriores no se recalculan.
- AC07: auditoría de cada mutación dentro de la misma transacción. Tests: rollback, lectura/escritura cruzada entre organizaciones, rol sin permiso, pago concurrente, versión vieja y archivo con saldo.
- AC08: UI móvil/escritorio con labels, foco, errores, búsqueda/filtros y estados vacíos; recorrido navegador alumno→servicio→inscripción→pago parcial y recarga preserva los datos.

## Contrato HTTP

`POST /api/auth` recibe acción register/login/logout. Registro crea dueño, organización y configuración en una transacción; a continuación emite la sesión. Si la emisión falla, la cuenta permanece y puede iniciar sesión. Contraseñas >=12 caracteres. Credenciales demo sólo se crean por un script local explícito.

`GET /api/workspace` devuelve proyección del tenant autenticado; `POST /api/commands` recibe unión discriminada por `type`, validada en runtime (`src/contracts/commands.ts`). No acepta tenant ni rol del cliente. Respuestas `{ok:true}` o `{error:string}`; 401 sesión, 403 rol/origen, 404 recurso, 409 conflicto/saldo/cupo, 422 entrada, 429 límite.

Operaciones: student.save, service.save, service.state, enrollment.create, enrollment.end, payment.record, settings.save, location.save. `expectedVersion` obligatorio al editar; idempotencyKey obligatorio al cobrar. No hay DELETE destructivo.
