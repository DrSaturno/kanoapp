# Verificación R1a — 14 de septiembre de 2026

Ámbito: primera entrega administrativa **local**, con datos ficticios. No acredita producción, auditoría externa ni cumplimiento integral del backlog.

## Entorno y resultados

- Windows, Node 22.23.2, npm 10.9.8, dependencias del lockfile.
- `npm run typecheck`: correcto, incluyendo generación de tipos de rutas con `next typegen`.
- `npm run lint`: correcto, sin warnings.
- `npm test`: **40 tests correctos**, cuatro archivos. Bases de test aisladas.
- `npm run build`: correcto. Página administrativa y APIs dinámicas, sin prerenderizar datos privados.
- `npm run format:check`: correcto.
- `npm audit --audit-level=high`: 0 vulnerabilidades reportadas en esta ejecución; no es una garantía permanente ni un pentest.
- `npm run start`: arranque correcto en 127.0.0.1:3000 después de detener desarrollo. El alumno, inscripción, cargo y pago de prueba sobrevivieron al cambio de proceso.
- Cierre de sesión desde el build redirige al acceso; nuevo login demo correcto, sin conservar la pantalla autenticada anterior.
- GitHub Actions en Ubuntu/Node 22: [Validate Kano, ejecución 34881219824](https://github.com/DrSaturno/kanoapp/actions/runs/34881219824), resultado `success` sobre el primer commit `5acfd47`. Incluye instalación limpia, formato, tipos, lint, tests, build y auditoría de dependencias.

## Trazabilidad de aceptación

| Criterio                   | Evidencia                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC01 identidad             | Tests registro/login, respuesta genérica, límites y revocación. Acceso HTTP sin cookie devuelve 401; navegación autenticada del build correcta.                                                                  |
| AC02 alumnos               | Alta y ficha desde navegador; tests rechazo de menores, archivo con deuda y conflicto de versión.                                                                                                                |
| AC03 catálogo              | Publicación UI de servicio híbrido con sede, días, precio y cupo. Tests precio futuro sin alterar inscripción anterior y bloqueo de sede inactiva.                                                               |
| AC04 inscripción           | UI genera cargo de ARS 12.000 con vencimiento elegido. Tests de cupo concurrente, referencias cruzadas y finalización sin borrar cargo/pago.                                                                     |
| AC05 pagos                 | UI rechaza ARS 13.000 sobre saldo de ARS 12.000 (409); acepta ARS 4.000, muestra ARS 8.000 y naranja tras recarga/reinicio. Tests reintentos, sobrepago concurrente y rollback.                                  |
| AC06 ajustes               | Ventana próximo vencimiento cambiada de 7 a 5 días desde móvil; tras recarga muestra versión 2. Test preserva moneda histórica.                                                                                  |
| AC07 seguridad y auditoría | RLS de lectura/escritura, rol denegado, dinero inmutable y auditoría transaccional en tests. Historial UI muestra alta, servicio, inscripción, pago y cambio de configuración.                                   |
| AC08 UX                    | Chromium mediante Playwright CLI; revisión visual a 1440×1000, 390×844 y 375×812. Ancho de documento coincide con viewport en tablero y configuración; menús, formularios y resultados accesibles por etiquetas. |

## Recorrido de navegador reproducible

1. Cargar demo explícita y abrir el servidor local; entrar con las credenciales ficticias del README.
2. Crear `Alumno Prueba UI`, contacto `ui@ejemplo.test`, nacimiento adulto.
3. Publicar `Movilidad · Prueba UI`: híbrido, sede demo, lunes/miércoles/viernes 18:00, 60 minutos, cupo 4, ARS 12.000, vigencia de hoy.
4. Abrir alumno → Inscribir → elegir ese servicio y vencimiento futuro cercano. En la ejecución fue 2026-09-18.
5. Intentar pago de 13.000: error visible y saldo sin modificación. Corregir a 4.000 y confirmar.
6. Recargar ficha: naranja, recibido 4.000 de 12.000, saldo 8.000.
7. Cambiar ajustes de próximo vencimiento a 5; recargar y comprobar nueva versión. Revisar historial.
8. Detener dev, compilar, iniciar build y abrir ficha: mismos datos, sin errores ni warnings de consola en la carga final.

La inspección de navegador es un recorrido asistido por CLI, **no una suite E2E ejecutada por CI**. El workflow contiene las pruebas unitarias/integración y el build. Automatizar los flujos de navegador y probar Safari/Firefox/dispositivos reales sigue siendo un gate anterior a producción.

Capturas locales en `output/playwright/`: `dashboard-desktop-final.png`, `dashboard-mobile-final.png`, `student-mobile.png`, `student-desktop-final.png`. No se suben a Git; contienen sólo fixtures en esta ejecución. Las primeras capturas pueden preceder ajustes de tipografía; las marcadas `final` corresponden a la revisión posterior.

## Correcciones encontradas durante la verificación

- Next normalizaba URL a localhost aunque el navegador usaba 127.0.0.1: se verifica Origin contra el Host local validado. Regresión cubierta por test.
- Se crea el directorio padre antes de inicializar la base persistente; test de cierre/reapertura en carpeta temporal.
- La sede se valida después de seleccionar la versión vigente: nunca se inscribe usando una versión antigua como fallback.
- El estado gris ya no oculta deuda vencida; pagos parciales vencidos mantienen indicación secundaria.
- Mejor legibilidad/tamaño de controles en móvil; menú cerrado fuera del foco; campos a una columna en pantallas estrechas y tamaño de entrada de 16 px.
- Finalizar inscripción muestra impacto y confirmación; métricas estáticas ya no aparentan enlaces.
- Tipos de rutas generados antes del typecheck, para que el control no dependa de haber iniciado dev previamente.

## Límites del resultado

No se ensayaron carga masiva, restauración de producción, servicios remotos, proveedores financieros, envío de mensajes, consentimientos, portal de alumno ni PWA. No hubo evaluación formal WCAG ni pentest. La proyección local carga todos los datos del espacio y requiere paginación/consultas por pantalla antes de escalar.

La protección local depende también del equipo. No exponer con túneles/proxies ni usar datos reales. Ver [amenazas y gates pendientes](threats.md) y [ADR 0001](../../adr/0001-primera-entrega.md).
