# Configuración inicial v0.1 — Valores base, no reglas cerradas

Alcance de producto completo. En la primera entrega local sólo están implementados los campos enumerados en [R1a](specs/first-vertical-slice/spec.md); el resto sigue en backlog. Menores, notificaciones y cobros online todavía no están habilitados.

Los valores de este documento son predeterminados lógicos para arrancar, no reglas fijas. El dueño/administrador puede modificarlos desde Configuración sin pedir cambios de código. Cada cambio crea una versión con fecha de vigencia, actor y alcance; la aplicación conserva la versión que rigió cada cargo, reserva, mensaje o sesión pasada. Cambiar una decisión estructural del producto sí sigue SDD; cambiar la operación cotidiana del entrenador no.

## 1. Mercado, operación y cuentas

| Tema             | Decisión inicial                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Mercado          | País, moneda, idioma y zona horaria por sede. Predeterminado inicial: Argentina, ARS y `America/Argentina/Buenos_Aires`.    |
| Cliente inicial  | Un entrenador dueño con posibilidad de sumar administradores y profesores; arquitectura multi-organización desde el inicio. |
| Modalidad        | Personalizado, grupal, híbrido, clase suelta, pack e incorporación online como modalidad futura.                            |
| Menores          | Permitidos sólo con tutor legal asociado; el tutor acepta condiciones y recibe comunicaciones financieras.                  |
| Estado de alumno | Prospecto, activo, pausado, inactivo, archivado. El archivo no borra la historia financiera.                                |
| Sedes            | Alta, edición, pausa y archivo de sedes; predeterminado inicial: una sede.                                                  |

## 2. Servicios, precios y agenda

- Un servicio pertenece a una organización y puede tener muchos horarios, sedes y responsables; todos se crean, editan, pausan o archivan desde el catálogo.
- Cada alumno posee una o más inscripciones. Un servicio no da acceso automático: el alumno solicita, el entrenador aprueba y se validan sus reglas.
- El precio se versiona con fecha de entrada en vigencia. Por defecto, una nueva versión afecta únicamente altas y renovaciones futuras; el dueño puede elegir migrar inscripciones existentes con aviso previo.
- Los planes mensuales vencen por defecto el mismo día del mes en que se activó la inscripción; si ese día no existe, vence el último día. El entrenador puede definir ancla de cobro por servicio o inscripción.
- El aviso de generación de cargo predeterminado es siete días antes del vencimiento; es configurable por organización/servicio.
- La ventana de reserva, cancelación y definición de ausencia es configurable por servicio. Predeterminados: reserva siete días antes y cancelación libre hasta cuatro horas antes.
- La espera tiene orden configurable y oferta de treinta minutos por defecto; el entrenador puede modificar ventana y priorizar una entrada dejando auditoría.

## 3. Pagos, estados y recordatorios

### Medios habilitables en el MVP

1. Efectivo registrado por entrenador.
2. Transferencia: alumno sube comprobante y el entrenador la confirma o rechaza.
3. Link de Checkout Pro de Mercado Pago mediante un adaptador de pagos. El proveedor confirma el resultado por webhook validado en servidor; una redirección del navegador nunca confirma un pago por sí sola. Mercado Pago recomienda su API de Orders para integraciones nuevas y webhooks HTTPS con validación de firma. [Documentación oficial](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/overview)

No habrá cobros automáticos recurrentes, tarjetas almacenadas, reintegros automáticos ni cálculo impositivo en el MVP. Éstos son límites iniciales de alcance, no políticas del entrenador; se agregarán mediante una nueva spec cuando se necesiten.

### Regla determinística del estado financiero

El panel calcula un estado por alumno, nunca lo edita manualmente:

1. **Rojo — vencido:** existe cualquier saldo pendiente después de la fecha de vencimiento, incluso si el alumno está pausado o archivado. Un indicador secundario aclara si hubo pago parcial.
2. **Naranja — pago parcial:** no hay deuda vencida y existe una obligación con pago recibido y saldo pendiente.
3. **Amarillo — próximo vencimiento:** no se cumplen los anteriores y hay saldo de una obligación que vence dentro de la ventana configurable (siete días por defecto).
4. **Gris — sin plan activo:** no se cumplen los anteriores y no hay alumno e inscripción activos. No implica que se hayan borrado cargos futuros.
5. **Verde — al día:** ninguno de los anteriores aplica.

El estado de actividad se muestra separado del financiero. Verde significa sin alertas actuales, no necesariamente saldo cero: puede haber un cargo con vencimiento posterior a la ventana. Un pago se imputa a cargos abiertos comenzando por el más antiguo, salvo selección explícita de un administrador. R1a requiere elegir un cargo explícito. Una reversión se registrará como ajuste; no se elimina el pago original.

### Cadencia de comunicaciones configurable

- Próximo vencimiento: a 7, 3 y 1 día; se detiene ante saldo cero.
- Parcial: 24 horas después del pago parcial y el día de vencimiento.
- Vencido: 1, 5 y 12 días después; luego crea tarea de seguimiento, no envía mensajes ilimitados.
- Reserva: confirmación inmediata, recordatorio 24 horas antes y aviso de cupo liberado.

Push PWA es el canal base; email es respaldo. WhatsApp queda detrás de un adaptador, sujeto a consentimiento, plantillas aprobadas y validación de proveedor. El entrenador configura canales, plantillas y cadencia por evento dentro de límites anti-spam de la plataforma. Cada alumno/tutor puede gestionar la recepción de comunicaciones no esenciales.

## 4. Datos de entrenamiento y privacidad

- Rutinas, ejercicios, asistencia, nivel técnico, objetivos, escalas de esfuerzo y metodología son datos de producto configurables; al modificar una plantilla se crea versión y no se altera una rutina ya asignada.
- Peso, perímetros, fotos de progreso, lesiones y aptitud son estrictamente opcionales, con finalidad explicada, acceso limitado y consentimiento separado.
- No se recolectan diagnósticos, tratamientos, historia clínica ni datos biométricos.
- El alumno puede descargar sus datos y solicitar su eliminación; la política de retención financiera y de auditoría se validará con asesoramiento legal antes del lanzamiento.

## 5. UX/UI: decisiones de producto

- Panel de entrenador optimizado para escritorio/tablet; alumno optimizado primero para móvil y PWA instalable. El dueño puede personalizar nombre de organización, logo, sedes, disciplina, terminología y elementos de navegación habilitados.
- Idioma inicial: español rioplatense, montos en ARS y fechas locales.
- Interfaz clara por defecto (fondo claro); modo oscuro opcional. La estética futurista se concentra en progreso/rendimiento, no en pantallas de cobro o formularios.
- Los estados nunca se comunican sólo por color: incluyen texto, icono y dato accionable.
- Para cada operación crítica se muestra confirmación, resultado y reversibilidad cuando corresponda.
