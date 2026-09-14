# Especificación de producto v0.1

## 1. Objetivo y actores

La plataforma ordena la operación de un entrenador o academia: cobra con precisión, organiza clases individuales y grupales, entrega entrenamiento y acompaña la evolución de cada alumno.

| Actor                       | Necesidad principal                                                             |
| --------------------------- | ------------------------------------------------------------------------------- |
| Dueño/entrenador            | Configurar su oferta, cobrar, llenar clases, seguir alumnos y tomar decisiones. |
| Profesor (futuro)           | Ver sólo los grupos y alumnos que le fueron asignados.                          |
| Alumno                      | Conocer su plan, reservar/avisar asistencia, entrenar, pagar y ver su progreso. |
| Administrador de plataforma | Soporte técnico sin acceso libre a información sensible.                        |

La primera versión se orienta a un entrenador, pero el modelo admite organizaciones con varias sedes y profesores.

## 2. Alcance funcional

### 2.1 Servicios y programación

El entrenador da de alta, edita, pausa, archiva y consulta todos sus servicios. Un servicio puede ser individual, grupal, híbrido, clase suelta, pack u online. Sus atributos son nombre, descripción, disciplina, modalidad, reglas de elegibilidad, precio/versiones de precio, duración, sede, responsable, cupo, horarios, días, políticas de cancelación, contenidos asociados y estado.

Un servicio **archivado** deja de aceptar inscripciones, pero conserva historial. Un cambio de precio se programa con fecha de vigencia y se elige explícitamente si aplica a renovaciones existentes o solamente a nuevas inscripciones.

### 2.2 Inscripciones, elegibilidad y cupos

Un alumno puede tener varios servicios activos. Puede ver servicios elegibles y solicitar inscripción; el entrenador aprueba, rechaza o deja la solicitud en espera. Las reglas de elegibilidad pueden requerir edad, nivel técnico, apto/documentación, cupo, estar al día en pagos o invitación del entrenador.

Las clases grupales derivan de una programación de servicio. El alumno confirma asistencia, cancela dentro de la política o avisa que no irá. La inscripción y la reserva son conceptos distintos: un alumno inscripto puede reservar una clase y entrar en lista de espera si el cupo está completo.

### 2.3 Cobros

El sistema modela obligaciones de cobro por inscripción y períodos, pagos, imputaciones y ajustes. Soporta pagos completos, parciales y deuda restante. Los estados visibles son:

| Estado                         | Significado                                                   |
| ------------------------------ | ------------------------------------------------------------- |
| Verde — al día                 | No hay saldo exigible pendiente.                              |
| Amarillo — próximo vencimiento | Está al día y se aproxima una obligación.                     |
| Naranja — pago parcial         | Existe una obligación con pago imputado, pero conserva saldo. |
| Rojo — vencido                 | Existe saldo exigible después de la fecha de vencimiento.     |
| Gris — pausado/inactivo        | No tiene una inscripción facturable activa.                   |

El entrenador puede registrar efectivo/transferencia, confirmar comprobantes y generar enlaces de pago. Las notificaciones se programan, son idempotentes y guardan entrega, lectura cuando esté disponible, reintentos y exclusión voluntaria.

### 2.4 Entrenamiento y evolución

El entrenador arma plantillas, rutinas semanales y sesiones por alumno o servicio. Cada alumno ve sus bloques semanales, ejercicios, series, repeticiones, videos y observaciones. Puede marcar una sesión como completada y registrar esfuerzo, energía o una molestia voluntaria. La metodología, ejercicios y métricas disponibles son configurables por organización y pueden cambiar con el tiempo sin reescribir sesiones históricas.

Las métricas incluyen asistencia, fuerza, resistencia, movilidad, peso/perímetros si el alumno decide registrarlos, objetivos y evaluaciones técnicas. La aplicación no brinda diagnóstico médico ni prescribe tratamiento.

### 2.5 CRM y comunicación

Prospectos, alumnos activos, pausados e inactivos forman un embudo. El sistema genera tareas y alertas: baja de asistencia, pago pendiente, renovación próxima, documento por vencer, servicio con pocos cupos o lista de espera. La mensajería se basa en plantillas y consentimiento; el asistente de voz es una mejora futura para crear tareas o proponer registros, siempre con confirmación humana antes de guardar.

## 3. Flujos críticos y criterios de aceptación

### FC-01 — Registrar pago parcial

1. El entrenador registra un pago sobre una obligación vigente.
2. El sistema valida organización, permisos, monto positivo, medio y que la imputación no supere el saldo salvo que se cree crédito explícito.
3. Crea un movimiento inmutable, actualiza el saldo calculado y registra auditoría.
4. Si queda saldo y no venció, el alumno aparece naranja; si venció, rojo.

**Aceptación:** recargar la pantalla no duplica pagos; ningún usuario de otra organización puede ver o imputar el pago; el historial conserva monto, fecha, actor y comprobante.

### FC-02 — Publicar servicio y aceptar inscripción

1. El entrenador configura servicio, precio vigente y al menos una programación activa cuando corresponda.
2. El alumno elegible solicita ingreso.
3. El sistema evalúa condiciones y cupo de forma transaccional.
4. El entrenador aprueba, rechaza o envía a espera; al aprobar se crea inscripción, acceso y plan de cobro según configuración.

**Aceptación:** dos solicitudes simultáneas no sobrepasan el cupo; archivar el servicio no elimina inscripciones ni historial; alumnos no elegibles no pueden forzar la inscripción desde la API.

### FC-03 — Reserva/aviso de clase

El alumno reserva, confirma, cancela o avisa ausencia. La capacidad se gestiona transaccionalmente; una cancelación promueve en orden a la lista de espera y dispara una notificación solamente una vez.

### FC-04 — Recordatorio de cobro

Un job identifica obligaciones próximas, parciales o vencidas, aplica reglas de cadencia y consentimiento, encola el envío y guarda el resultado. Debe poder reintentarse sin duplicar mensajes.

## 4. Fuera de alcance del primer release

- Diagnóstico, historia clínica o recomendaciones médicas.
- Reconocimiento biométrico/rostro y pagos con datos de tarjeta propios.
- IA que modifique cobros, rutinas o inscripciones sin aprobación humana.
- Avatar corporal 3D/holográfico; será una capa visual posterior sobre métricas ya confiables.

## 5. Decisiones de experiencia

- Panel web responsivo para el entrenador; PWA instalable para alumnos y también usable desde navegador.
- El alumno recibe valor antes de un recordatorio: agenda, rutina, asistencia y progreso.
- Las acciones de pago tienen lenguaje claro, saldo visible y comprobante; no se avergüenza ni expone a alumnos.
- Cada comunicación permite configurar canal, consentimiento y baja.
