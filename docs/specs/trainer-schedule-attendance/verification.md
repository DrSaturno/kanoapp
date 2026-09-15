# Verificación — Agenda operativa

Fecha: 2026-09-15  
Entorno: Windows, Node 22+, Next.js 16.3.5, PGlite 0.5.8, navegador Chromium integrado.

## Automatización

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test`: 4 archivos y 50 casos correctos.
- `npm run build`: build de producción correcto.
- `npm run format:check`: formato correcto.

Los casos nuevos cubren rango y fechas civiles, idempotencia, instantánea del servicio, dos reservas compitiendo por el último cupo, lista de espera, promoción al cancelar, asistencia completa, control de versión y aislamiento RLS.

## Recorrido real en navegador

Con el espacio demo, en viewport móvil de 375 px:

1. Se abrió Agenda y se verificaron resumen, filtros y estado vacío.
2. Se seleccionaron cuatro servicios y el rango 15–28 de septiembre.
3. La vista previa mostró 20 clases, sede y horario antes de confirmar.
4. Se generó el lote y aparecieron los bloques agrupados por fecha sobre la línea de rounds, sin desplazamiento horizontal.
5. En la clase Fuerza & movilidad del día se agregó a Camila Méndez; la ocupación cambió de 0/12 a 1/12 sin cerrar la nómina.
6. Se registró como presente; la clase pasó a Finalizada y quedó habilitada la corrección de asistencia.
7. Se recargó el build final y se verificó la persistencia de la clase, la reserva y la asistencia.

## Límites vigentes

La evidencia prueba esta entrega local de un solo proceso. No certifica un despliegue público, mensajería, identidad de alumnos ni concurrencia multi-instancia.
