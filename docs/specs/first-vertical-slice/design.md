# Diseño R1a

Requests → sesión validada → caso de uso → transacción tenant bajo rol `kano_app` → RLS y restricciones → evento auditable → commit → refresco de proyección UI. Identity es el único módulo que consulta las tablas globales privadas de sesión/cuenta.

Una raíz estable service se relaciona con service_versions inmutables y vigencia única por servicio. Enrollment referencia versión concreta; charge conserva concepto, moneda, importe y fecha. Payment referencia un cargo (imputación 1:1 inicial) y nunca se actualiza. Una transacción serializa por organización para evitar pago/sobrecupo simultáneo. Idempotencia persistida en pagos; settings y students usan optimistic locking.

UI: superficies claras y barra lateral grafito, Barlow + Barlow Condensed locales; azul para acción, cinco colores semánticos acompañados de texto. Firma visual: franja de ocupación/estado por servicio y tablero de cuenta corriente. Los números provienen de DB, fixtures explícitamente identificados en entorno demo.

Riesgos: IDOR mitigado por RLS + claves compuestas; pérdida de actualizaciones por expectedVersion; sobrepago por bloqueo+saldo dentro de transacción; XSS mediante escape React y ausencia de HTML libre; CSRF mediante origen estricto+JSON; fuerza bruta con ventana de intentos persistida. Sesión opaca en DB almacenada como hash; revocación inmediata. Datos y credenciales fuera de Git. Control de producción local descrito en ADR.
