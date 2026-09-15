# Verificación R1a.1

Fecha: 2026-09-15. Entorno local, datos ficticios.

## Automatizada

- `npm run check`: tipos, ESLint, 44 pruebas y build Next.js correctos.
- `npm run format:check`: formato correcto.
- GitHub Actions `Validate Kano` (run 34986215763): correcto, incluida auditoría de dependencias de severidad alta.
- Casos agregados: período y último día de febrero; lote idempotente; rechazo de duplicado; rechazo de snapshot adulterado sin escritura parcial; persistencia con migraciones 001 y 002.

## Navegador

Recorrido con cuenta demo en el build de producción:

- Acceso y panel del entrenador en viewport móvil.
- Menú móvil con destino visible “Sedes”.
- Sedes: búsqueda, filtro, conteos, “Nueva sede” y “Editar sede”.
- Servicio: alta rápida “Crear una sede sin salir” sin enviar el formulario principal.
- Cobros: selección inicialmente vacía, vencimiento por alumno, resumen y paso explícito de confirmación. No se confirmó el lote para no alterar la demo.
- Viewports 375 px y 1440 px; se corrigió el desborde horizontal causado por la tabla de fondo al abrir el diálogo móvil.
- Consola: sin errores ni advertencias.

## Límites

No valida producción, accesibilidad con tecnología asistiva real, recuperación de desastre ni concurrencia distribuida. El logo tipográfico es provisional hasta recibir el activo vectorial oficial.
