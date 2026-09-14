# Plan UX/UI v0.1

## Objetivo de experiencia

La app debe reducir decisiones y trabajo administrativo para el entrenador, y requerir segundos —no capacitación— para que el alumno consulte su próximo entrenamiento, confirme asistencia o resuelva un pago. La interfaz no imita un “holograma” en cada pantalla: usa una base profesional, accesible y de alta legibilidad; la visualización de rendimiento aporta la identidad deportiva futurista.

El sistema visual está guardado en [MASTER.md](/C:/Users/nicol/OneDrive/Documentos/Planeta%20Saturno/Codex/kano/design-system/dojo-ops/MASTER.md). La guía UX/UI usada determinó una interfaz operacional moderna, contraste WCAG AA, jerarquía de estados y movimiento sutil; esto orienta las decisiones de este documento.

## 1. Arquitectura de información

### Navegación del entrenador (escritorio)

`Inicio · Alumnos · Servicios · Agenda · Cobros · Entrenamiento · CRM · Reportes · Configuración`

- **Inicio:** caja rápida, pagos pendientes, clases de hoy, cupos, solicitudes y alertas.
- **Alumnos:** buscador, filtros por estado financiero/de servicio/asistencia; ficha 360°.
- **Servicios:** catálogo, precios versionados, horarios, cupos, reglas y solicitudes.
- **Agenda:** sesiones del día/semana, reservas, espera y asistencia.
- **Cobros:** obligaciones, pagos, conciliación de comprobantes, links y acciones de seguimiento.
- **Entrenamiento:** biblioteca, rutinas, asignaciones y evaluaciones.
- **CRM:** prospectos, tareas, comunicaciones y reactivaciones.

La barra lateral conserva contexto y un botón global “Crear” ofrece las acciones más frecuentes: alumno, servicio, pago, clase, rutina y tarea.

**Configuración** contiene el centro de variación operativa: perfil/marca, sedes, disciplinas, servicios, precio y vigencia, horarios, cupos, reglas de reserva/cancelación, formas de cobro, plantillas/cadencia de recordatorios, metodología de entrenamiento, roles y privacidad. Cada pantalla de configuración muestra “vigente desde”, historial y alcance del cambio.

### Navegación del alumno (móvil)

La barra inferior tiene cinco destinos máximos: `Hoy · Agenda · Entrenar · Progreso · Perfil`.

- **Hoy:** próxima clase, rutina pendiente, estado de cuenta compacto y una única acción prioritaria.
- **Agenda:** confirmar, cancelar o avisar ausencia; disponibilidad y lista de espera.
- **Entrenar:** bloques de la semana, rutina actual, videos y finalización de sesión.
- **Progreso:** asistencia, metas y métricas que el alumno aceptó registrar.
- **Perfil:** servicios, estado de cuenta, comprobantes, ajustes de comunicación y privacidad.

## 2. Pantallas y flujo de prioridad P0

| Pantalla         | Usuario    | Acción primaria                    | Información secundaria                               |
| ---------------- | ---------- | ---------------------------------- | ---------------------------------------------------- |
| Dashboard        | Entrenador | Resolver la alerta superior        | Caja, próximas clases, pendientes y solicitudes.     |
| Alumno 360°      | Entrenador | Registrar pago / marcar asistencia | Servicios, rutina, evolución, tareas e historial.    |
| Servicio         | Entrenador | Publicar o guardar cambios         | Precio vigente, agenda, cupo, alumnos y solicitudes. |
| Agenda diaria    | Entrenador | Tomar asistencia                   | Reservas, ausentes, cupo y espera.                   |
| Cobros           | Entrenador | Registrar o confirmar pago         | Saldo, vencimiento, historial y recordatorio.        |
| Inicio de alumno | Alumno     | Confirmar próxima acción           | Resumen sin dashboards sobrecargados.                |
| Reserva          | Alumno     | Confirmar asistencia               | Política y cupos claros.                             |
| Pago             | Alumno     | Pagar / subir comprobante          | Monto, concepto, vencimiento y ayuda.                |

## 3. Reglas de interacción

- Objetivos táctiles de al menos 44 × 44 px; no hay acciones esenciales ocultas en hover.
- Formularios de alta usan pasos: información esencial → horarios/cupo → cobro → publicación. Se guarda borrador automáticamente.
- Cada campo posee etiqueta visible, ejemplo y error junto al campo. Los errores no se muestran sólo al final.
- Acciones irreversibles se nombran con precisión; “archivar” se diferencia de “eliminar datos personales”.
- Los cambios de precio muestran una simulación: quiénes se verán afectados, desde cuándo y cómo cambia el siguiente cargo.
- Los cambios operativos usan un patrón común: editar → elegir vigencia y alcance → previsualizar impacto → confirmar → conservar historial. No existen cambios silenciosos que reescriban hechos pasados.
- La asistencia se opera con un toque; los cambios masivos requieren confirmación y muestran resumen previo.
- Cargas, envíos y conciliaciones muestran estado de progreso. La interfaz deshabilita reenvíos mientras haya una solicitud idempotente en curso.
- Las tablas extensas tienen filtros guardables, búsqueda y vista móvil en tarjetas; nunca dependen únicamente de un color para comunicar estado.

## 4. Sistema visual y accesibilidad

### Fundamentos

- Tipografía de interfaz: Barlow; títulos deportivos: Barlow Condensed. Tamaño base 16 px y cuerpo nunca menor a 14 px.
- Fondo claro neutro, texto casi negro, superficies con profundidad suave. Azul sobrio como acción primaria.
- Estados semánticos: verde/al día, amarillo/próximo, naranja/parcial, rojo/vencido, gris/pausado. Cada uno tiene icono, texto y contraste verificable.
- Visual de rendimiento: silueta corporal abstracta/3D solamente en Progreso; grupos entrenados, consistencia y carga. Nunca representar lesiones como diagnóstico.
- Iconos SVG consistentes, con etiqueta o texto accesible; no emojis.

### Accesibilidad y rendimiento

- Contraste mínimo 4.5:1 para texto normal; foco visible, navegación por teclado y lector de pantalla en el panel web.
- Respeta `prefers-reduced-motion`; transiciones de 150–300 ms sólo comunican cambio de estado, no decoran.
- Diseño mobile-first, sin scroll horizontal ni zoom deshabilitado; prueba mínima en 375, 768, 1024 y 1440 px.
- Videos diferidos, miniaturas comprimidas y espacios reservados para evitar saltos visuales.
- Las gráficas tienen tabla/resumen textual equivalente y no requieren distinguir colores.

## 5. Validación UX antes de desarrollo completo

1. Wireframes navegables de las ocho pantallas P0.
2. Prueba moderada con un entrenador y cinco alumnos representativos.
3. Escenarios: registrar pago parcial, modificar un precio futuro, crear grupo, reservar/cancelar clase, subir comprobante y encontrar una rutina.
4. Éxito: 80% completa cada escenario sin ayuda; ningún usuario interpreta naranja como vencido; tiempos y dudas se documentan como cambios de spec.
