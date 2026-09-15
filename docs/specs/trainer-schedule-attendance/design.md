# Diseño — Agenda operativa

## Persona y trabajo principal

Entrenador independiente, usando el teléfono entre clases. Su trabajo principal es saber qué clase sigue, dónde se dicta, quién tiene lugar y registrar asistencia con pocos toques.

## Arquitectura

- `contracts`: valida los cinco comandos y expone la proyección tipada.
- `domain/scheduling`: calcula fechas candidatas y estados derivados sin I/O.
- `modules/scheduling`: aplica invariantes transaccionales, idempotencia y auditoría.
- `infrastructure/migrations/003-scheduling`: tablas, restricciones, índices y RLS.
- `modules/reporting`: entrega sesiones y reservas ya limitadas al tenant.
- `ui/schedule-screen`: agenda, generación, nómina y asistencia.

## Modelo visual

- Se conserva el sistema Kano: negro `#0C0C0C`, marfil `#F5F3EF` y ámbar `#C27A16`, con Barlow / Barlow Condensed.
- La pieza distintiva es una **línea de rounds**: eje ámbar vertical con fechas fuertes y tarjetas de clase, legible como una cartelera deportiva.
- La ocupación se expresa con texto, fracción y barra; el color es refuerzo, nunca la única señal.
- Las acciones primarias tienen objetivo táctil mínimo de 44 px y foco visible.
- No se usa una grilla semanal: en móvil comprime horarios, esconde información y exige desplazamiento lateral.
- Movimiento limitado a transiciones de estado breves y respetando `prefers-reduced-motion`.

## Flujo

```text
Servicio versionado -> previsualizar rango -> confirmar generación -> clase programada
                                                            |
                                      inscripción activa -> reserva
                                                            |
                                      cupo libre ? confirmado : espera
                                                            |
                    cancelación confirmada -> promover primera espera
                                                            |
                                      día de clase -> asistencia
```

## Decisiones

- El servidor reconstruye las clases desde los servicios; no acepta del cliente precio, cupo, sede ni horario históricos.
- La generación por rango es explícita para evitar series infinitas difíciles de corregir.
- La primera entrega es asistida por el entrenador. El portal del alumno reutilizará las mismas entidades y reglas en un incremento posterior.
- La nómina permanece abierta tras agregar o cancelar para soportar operación rápida.
