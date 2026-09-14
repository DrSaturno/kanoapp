# E-09 — Configuración operativa versionada

**Tags:** `P0 feature architecture services schedule billing ux risk:money`

**Estado:** `spec-review`

## Resultado

El entrenador adapta la aplicación a su realidad sin desarrollo: altas, bajas, pausas y modificaciones de sedes, servicios, precios, horarios, cupos, políticas, comunicaciones y metodología. El sistema preserva qué configuración aplicó a cada hecho histórico.

## Elementos configurables

| Área          | Recursos editables                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Organización  | Marca, idioma, moneda, zona horaria, sedes, disciplinas y terminología.                                                                |
| Oferta        | Servicios, modalidades, responsables, precios, cupos, requisitos, horarios y estado.                                                   |
| Operación     | Ventanas de reserva/cancelación, lista de espera, vencimiento, generación de cargos, métodos de pago habilitados y políticas de pausa. |
| Comunicación  | Canales, plantillas, cadencia por evento y responsables de seguimiento.                                                                |
| Entrenamiento | Plantillas, ejercicios, bloques, escalas de esfuerzo, evaluaciones y métricas ofrecidas.                                               |

## Reglas de variación

- Alta crea un recurso en borrador; publicar exige validar los campos mínimos del tipo de recurso.
- Baja operativa es pausa o archivo. Sólo datos sin uso pueden eliminarse; de lo contrario se conserva la historia y se oculta de futuras selecciones.
- Una modificación relevante exige fecha/hora de vigencia, alcance y previsualización del impacto. Puede aplicar sólo a futuras altas, futuras sesiones/cargos o inscripciones existentes elegidas.
- El sistema crea `PolicyVersion`/versión de recurso y la vincula al hecho creado. Una reserva, mensaje, cargo o rutina pasada no se recalcula al modificar la configuración actual.
- Todo cambio de configuración relevante queda auditado con antes/después, actor, fecha, alcance y versión.
- Roles restringen quién cambia cada recurso: dueño para cobros, privacidad, roles y configuración global; administrador para oferta/operación; profesor solamente para plantillas o sesiones que el dueño habilite.

## Criterios de aceptación

1. El entrenador puede crear una sede y asignarle servicios/horarios sin despliegue ni intervención técnica.
2. Puede pausar un servicio y luego reactivarlo sin perder alumnos, precios o asistencia pasada.
3. Antes de subir un precio o cambiar un horario, ve afectados, fecha y elección de alcance; al confirmar, el historial mantiene el valor/horario anterior.
4. Cambiar una plantilla de rutina genera nueva versión; una rutina ya asignada continúa reproduciendo su versión original salvo reasignación explícita.
5. Un alumno no recibe recordatorio o política nueva aplicada retroactivamente a una reserva/cargo generado bajo otra versión, salvo que se ejecute una migración explícita y auditada.
