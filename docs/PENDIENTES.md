# Pendientes — qué falta hacer

> **Qué es este archivo.** Lo que **todavía no está construido**. Nada de lo ya
> hecho vive acá: eso va a **[TRAZABILIDAD.md](TRAZABILIDAD.md)**, el registro
> único de historial. Para el contexto del proyecto (visión, stack, arquitectura)
> ver **[ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md)**.
>
> **Organización: por paquetes, no por categoría suelta.** Cada paquete agrupa
> tareas relacionadas y trae el detalle técnico para ejecutarlo sin tener que
> re-investigar el código desde cero — archivos, funciones a tocar o crear, y
> la decisión de diseño si todavía falta cerrarla. Se trabajan en el orden en
> que aparecen (de arriba hacia abajo es la prioridad sugerida), pero nada
> obliga a respetar ese orden si hay una razón puntual para saltarlo.
>
> Cuando un paquete se termina, se borra de acá y se resume en TRAZABILIDAD.
> Si un paquete queda parcialmente hecho, se recorta a lo que falta — no se
> deja una tarea marcada "lista" a medio hacer.
>
> Última actualización: 2026-10-19 (auditoría QA externa verificada y corregida,
> protección contra tráfico abusivo, `robots.txt` y políticas de QA y manuales —
> ver TRAZABILIDAD.md #57-58). **Gateado: vigencia y bloqueo automático. Lo que
> depende de una persona (paneles externos, datos legales, decisiones) está en los
> paquetes de abajo marcados con 👤.**

---

## 🗂️ Paquetes (orden sugerido)

| Paquete | Tamaño | Qué resuelve |
|---|---|---|
| [Política en el primer ingreso: lo que queda](#paquete--política-en-el-primer-ingreso-lo-que-queda) | Chico | Pantalla hecha; falta el abogado, decidir alcance (DT/escuela) y re-aceptación por versión |
| [Vigencia y bloqueo automático](#paquete--vigencia-y-bloqueo-automático) | Medio | **Gateado** — no arrancar todavía |
| 👤 [Hallazgos de la auditoría QA](#paquete--hallazgos-de-la-auditoría-qa-2026-10-18) | Chico | Datos legales, `.env.example` y los hallazgos menores ya verificados |
| 👤 [Protección contra tráfico malicioso](#paquete--protección-contra-tráfico-malicioso-lo-que-no-se-hace-desde-el-código) | Config | Spend Management, Firewall, Supabase, Upstash: paneles externos |
| [Calidad: QA a ciegas y manuales por módulo](#paquete--calidad-qa-a-ciegas-y-manuales-por-módulo) | Grande | Ejecutar las políticas `politicas/POLITICA-QA.md` y `politicas/POLITICA-MANUALES.md` por primera vez |

---

## Paquete — Política en el primer ingreso: lo que queda

La pantalla **ya existe** (TRAZABILIDAD #60): una cuenta JUGADOR con
`terminosAceptadosEn = null` es enviada a `/aceptar-politica` y no ve el panel
hasta aceptar; se sellan fecha y versión y queda en `AuditLog`. Falta:

- **Revisión del abogado** del texto y de la pantalla (HABEAS-DATA.md). El texto
  es el de `/legal` y conserva `[Razón social]` y `[NIT]` hasta constituir la
  empresa (ver el checklist de lanzamiento).
- **Alcance:** solo rol JUGADOR. Si DT y escuelas deben aceptarla en línea, extender
  la compuerta a sus layouts.
- **Cambio de versión:** subir `TERMINOS_VERSION` no vuelve a pedir aceptación (la
  compuerta solo mira `null`). Si un cambio material de la Política exige
  re-aceptación, hay que decidirlo con el abogado y comparar la versión.
- **Server Actions directas:** la compuerta es de navegación (layout); no bloquea
  una acción invocada sin renderizar el layout. Es un registro de consentimiento,
  no un control de acceso (esa barrera sigue en los servicios). Si se quisiera
  bloquear también ahí, iría en `requireAuthContext`.

---

## Paquete — Vigencia y bloqueo automático

Medio. **Gateado — no se construye todavía.** Cron que bloquea vencidos y
desbloquea al día, apoyado sobre el estado de cuenta derivado de `Membresia`
(A.4, ya en producción). No arranca hasta que una escuela real haya cerrado
un ciclo de cobro completo y el bloqueo manual resulte repetitivo — antes de
eso, automatizarlo es resolver un problema que todavía no existe. Diseño de
riesgos ya cerrado, para cuando se destrabe: `TIPOS_BLOQUEO` suma
`"VIGENCIA_VENCIDA"` en `src/lib/bloqueo.ts`; `bloqueado: false` en el WHERE
del cron de bloqueo (no pisa un bloqueo manual ya puesto); `bloqueoTipo:
"VIGENCIA_VENCIDA"` en el WHERE del desbloqueo automático (no levanta un
bloqueo puesto por otro motivo); `registrarAuditoriaSistema` con actorId
`"SISTEMA"` para el cron, que no tiene `AuthContext` de un usuario real.

(El fix previo que este paquete listaba —`statsLatest` sin filtrar
`evaluacion.anulada`— ya está resuelto: ver TRAZABILIDAD.md #48.)

---

## Paquete — Hallazgos de la auditoría QA (2026-10-18)

Verificados contra el código; el detalle completo está en
`docs/auditoria/REPORTE-QA.md`.

- **Datos legales reales en `/legal`** (Alta, bloqueado por el dueño). La página
  de producción muestra `[Razón social]` y `[NIT]` (`src/app/legal/page.tsx`
  líneas 59 y 176). Hay que cargar los datos de la entidad responsable del
  tratamiento: no se pueden inventar.
- **`.env.example` desactualizado** (Media). Sigue describiendo SQLite
  (`DATABASE_URL="file:./dev.db"`) y no menciona `DIRECT_URL`, que sí usan los
  seeds y Playwright, ni las variables de Supabase, Upstash, Resend y
  `CRON_SECRET` que lee el código. Reescribirlo contra los `process.env.*` reales.
- **Hallazgos de Gemini ya verificados** (detalle y evidencia en
  `docs/auditoria/VERIFICACION-2026-10-19.md`). Reales y pendientes:
  - **`TabBarMovil`: el menú "Más" no cierra con Escape** (QA-008, Bajo; el
    "focus trap" que pedía el reporte no aplica a un menú no modal).
  - **`crearEvaluacionAction` sin rate limit ni clave de idempotencia**
    (QA-007, Bajo: el botón ya se deshabilita al enviar).
  - **`ESTADO-DEL-PROYECTO.md` desactualizado** (DOC-003): conteos de tests,
    specs, modelos y migraciones, y lista como inexistentes descuentos y staff.
  - **`MANUAL-DE-USO.md` incompleto o incorrecto** (DOC-005/006/007): omite 7
    pantallas de Escuela (Pagos, Egresos, Descuentos, Staff, Conceptos, Morosos,
    Mi cuenta) y Pagos/Calendario/Mi cuenta de la familia; afirma que se
    "descargan recibos" (no existe esa función) y describe la recuperación con
    enlace cuando es con código de 6 dígitos. Se resuelve con los manuales por
    módulo (paquete de Calidad), no parchando este archivo.
  - **`actualizarParametroAction`** (admin) sigue como `<form action>` sin feedback visible: último ítem del antiguo paquete de feedback (el resto se cerró, TRAZABILIDAD #60).
  Descartados: QA-011 (no hay switches), DOC-009 (ya actualizado), DOC-010
  (ya conocido).
- **Decidir si M1 (motivo obligatorio del SUPER_ADMIN) alcanza a `editarUsuarioAdmin`,
  `resetPasswordUsuarioAdmin` y `editarEscuelaSuperAdmin`** (Media, política).
  Hoy auditan el cambio pero no piden `motivo` (a diferencia de editar jugador,
  ficha médica, restaurar, bloqueo o reset de clave de familia). Señalado por el
  revisor del pre-commit; depende de si "usuarios" y "escuela" cuentan como datos de
  un tenant.

---

## Paquete — Protección contra tráfico malicioso (lo que NO se hace desde el código)

La parte de código está hecha (TRAZABILIDAD #58). Estas capas se configuran en
paneles externos; sin ellas, un ataque volumétrico igual ejecuta funciones y
cuesta plata antes de que el rate limit de la app lo frene.

- **Vercel Hobby no tiene Spend Management** (es solo de Pro) ni cobra: si se
  excede el uso incluido (1 M de invocaciones, 4 h de CPU, etc.) el proyecto se
  **pausa hasta 30 días**. Además Hobby es **solo para uso no comercial**: al salir
  al público como negocio hay que pasar a **Pro** y configurar ahí Spend Management
  (Settings → Billing). Ver el checklist de lanzamiento.
- **Vercel → Firewall** (Hobby permite **1** regla de rate limit y 3 reglas en
  total): regla "Limite visitantes publicos" con condiciones OR sobre
  `Request Path` empieza con `/e/`, `/login`, `/registro`; Fixed Window, 60 s,
  límite 100, clave IP; primero acción **Log** durante ~10 min y luego 429/**Deny**.
  Pasos exactos: Firewall → ⋯ → Configure → Add New… → Rule → Rate Limit → Save
  Rule → Review Changes → Publish.
- **Vercel → Firewall → Attack Challenge Mode** ("Attack Mode" en la doc): no se
  deja prendido; es el interruptor para cuando ya se está bajo ataque.
- **Supabase**: `DATABASE_URL` (Production, en Vercel) debe ser el pooler: host
  `…pooler.supabase.com`, puerto **6543**, usuario `postgres.<ref>`,
  `?pgbouncer=true`. `DIRECT_URL` (5432) solo para migraciones. Se compara con
  el botón **Connect → Transaction pooler**.
- **Supabase backups**: el plan Free **no tiene backups automáticos**; Pro guarda 7
  días de copias diarias y el PITR es un complemento pago (exige cómputo Small o
  mayor y reemplaza las copias diarias). Mientras tanto, `scripts/backup-db.ts`.
- **Upstash**: confirmar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en
  Production (sin ellas el límite cae a memoria por instancia). Plan gratis: 500.000
  comandos/mes; pago por uso USD 0,20 cada 100.000 con presupuesto mensual
  configurable.
- **Hecho:** `/e/[slug]` se sirve desde caché de 60 s y las acciones que cambian
  la landing la invalidan al instante (TRAZABILIDAD #60). No cubre slugs al azar:
  el Firewall sigue siendo necesario.
- **Al migrar al VPS**: Cloudflare adelante, firewall del servidor solo para IPs
  de Cloudflare, `IP_CLIENTE_HEADER=cf-connecting-ip`, y Nginx `limit_req` +
  fail2ban como respaldo.

---

## Paquete — Calidad: QA a ciegas y manuales por módulo

Grande. Las políticas ya están escritas (`docs/politicas/`); falta **ejecutarlas**.
Orden sugerido:

0. **Repetir la prueba a ciegas, esta vez en local.** Existe un
   `docs/auditoria/REPORTE-QA-CIEGO-2026-10-19.md` (sin versionar) que auditó
   **producción** (`academia-elite.vercel.app`), contra `POLITICA-QA.md` §2, y cita el
   commit `b992baf`, que nunca se subió (el origen sigue en `4860299`): el auditor
   tuvo que leer el repositorio, así que tampoco fue ciega. Sus hallazgos describen
   código de septiembre y hay que tomarlos como pistas, no como evidencia, hasta
   pasarlos por P02/P06.
1. **Primera prueba a ciegas** (`POLITICA-QA.md`, prompt **P01** de `docs/prompts/`) con un agente que no lea código ni
   docs. Entrega `docs/auditoria/REPORTE-QA-CIEGO-<fecha>.md`; recién después, el
   triage. Cada hallazgo confirmado termina corregido (con test), en este archivo o
   descartado.
2. **Manuales por módulo** (`POLITICA-MANUALES.md`, prompt **P04**), empezando por **Mediciones y
   evaluación**, **Fondos** y **Logros**; después el resto del menú de cada rol.
   Crear `docs/manuales/INDICE.md` con la tabla de frescura.
3. **Decisiones previas** (ver el listado de decisiones abiertas):
   - dónde se publican los PDF/DOCX/HTML generados (hoy pesan 13-18 MB cada uno y
     `docs/manuales/` no está versionado): no se commitean binarios;
   - cuando existan los manuales por módulo, `docs/MANUAL-DE-USO.md` pasa a ser un
     índice (no pueden convivir dos manuales).

---

## Checklist de lanzamiento público 👤

Todo esto depende de la empresa constituida o de paneles externos; nada se hace
desde el código. Orden sugerido:

- [ ] **Constituir la empresa** y cargar razón social y NIT en `/legal`
      (`src/app/legal/page.tsx`, líneas 59 y 176).
- [ ] **Abogado**: revisar la Política de Tratamiento de Datos y la pantalla de
      aceptación del primer ingreso (HABEAS-DATA.md).
- [ ] **Vercel a Pro** (Hobby es no comercial) y configurar **Spend Management**.
- [ ] **Firewall de Vercel**: la regla de rate limit descrita arriba.
- [ ] **Supabase**: confirmar pooler 6543; plan Pro y evaluar PITR (hoy Free: sin
      backups automáticos).
- [ ] **Upstash**: variables en Production y presupuesto mensual si se pasa a pago.
- [ ] **Correo**: verificar el dominio en Resend y quitar `EMAIL_DEV_TO`.
- [ ] **Dominio propio** (y, si se migra a VPS, Cloudflare + `IP_CLIENTE_HEADER`).
- [ ] **Auth**: fijar la versión exacta de `next-auth` (sin `^`).
- [ ] Correr **P09** (`docs/prompts/`) y **P01/P07** sobre la rama a publicar.

---

## 🟡 Diferido — depende de algo externo, no entra en un paquete todavía

> **Decisión (2026-08-04): el resto del riesgo de plataforma se retoma cuando
> el proyecto esté 100% en producción**, junto con la implementación del
> dominio propio — no antes. Hasta entonces, no tiene sentido cerrar una
> decisión de arquitectura (Auth) o de infraestructura (backups,
> observabilidad, CI) para un entorno que todavía puede cambiar.

- **Decisión de Auth** (Media). `next-auth ^5.0.0-beta.31`. Verificado (oct. 2026):
  Auth.js pasó al equipo de Better Auth (22-sep-2025); la v5 sigue en beta y recibe
  solo parches de seguridad; recomiendan Better Auth para proyectos nuevos.
  Recomendación: quedarse en v5, **fijar la versión exacta**, seguir los avisos de
  seguridad y evaluar Better Auth tras el lanzamiento (ojo: el proxy lee el JWT sin
  base de datos y hay que confirmar que Better Auth lo cubra). Volver a v4 se
  descarta; Supabase Auth exigiría sincronizar identidades y rehacer OTP/roles.
  Dispara la migración antes: una vulnerabilidad sin parche, una incompatibilidad
  con Next, o necesitar MFA/SSO.
- **Backups / PITR** (Chico, config). Ver el paquete de protección y el checklist
  de lanzamiento: Free no tiene backups automáticos; con datos reales de menores,
  pasar a Pro y evaluar PITR.
- **Observabilidad** (Media). Hoy solo hay logs de runtime de Vercel y el
  `digest` del error boundary (`src/app/error.tsx`/`global-error.tsx`).
  Sentry se descartó dos veces: incompatibilidad con Next 16 + Turbopack, y
  porque es un procesador externo que recibiría PII de menores (requeriría
  pasar por `HABEAS-DATA.md` primero, como cualquier tercero nuevo).
  Reevaluar cuando el SDK de Sentry madure para Turbopack, o buscar una
  alternativa self-hosted que no saque datos del proyecto.
- **`build` y `e2e` en el workflow de CI** (Media). Hoy el workflow
  (`.github/workflows/`) corre `typecheck`/`lint`/`test` (unit). Sumar
  `build` y `test:e2e` exige un proyecto Supabase **dedicado a CI** (no el de
  producción) con sus propios secretos en GitHub Actions — hay que
  aprovisionarlo antes de tocar el YAML.
- **Credenciales por link en alta de DT y jugador** (Chico). Hoy el alta
  muestra la contraseña temporal una vez; se podría mandar además un link
  (`emitirSetPassword`, ya usado en recuperación). Depende del correo:
  mientras `EMAIL_DEV_TO` esté activo y el dominio de Resend sin verificar,
  el link no llegaría al DT/familia real. Retomar después de verificar el
  dominio y sacar `EMAIL_DEV_TO`.
- **Paginación de mensajes** (Chico → Medio). Las conversaciones no paginan
  en servidor (jugadores/auditoría/eventos sí). Prematuro hoy — un DT tiene
  pocos hilos — y para hacerlo bien hay que mover el filtro del DT (hoy
  client-side en `MensajesDtFiltro`) a la URL, si no el filtro solo
  aplicaría dentro de la página ya cargada.

## ❓ Sin reproducir — necesitan un caso concreto

No se tocan hasta poder reproducirlos; el código no muestra el defecto.

- **"El partido debería empezar 0-0."** Un partido nuevo calcula 0-0 desde
  `resultadoLocal/Visitante = null`. Probablemente dato residual de pruebas.
- **"El color de los stats no coincide con el fondo."** El color SÍ fluye:
  `obtenerHub` setea `card.fondoTexto` desde `fondo.colorTexto` y en `PlayerCard`
  todo el texto hereda `textoCarta`. Hipótesis: el fondo equipado tiene
  `colorTexto = null`, o se compara con otro listado que usa tokens del tema.

## 🚧 Bloqueado por una decisión de producto

- **Puntos de sesión que mueven la carta.** Contradice la tesis documentada en
  `ESTADO-DEL-PROYECTO.md` §0. Requiere entrada explícita en `DECISIONES.md`
  antes de escribir código (§57). El fix previo que este ítem exigía
  (`statsLatest` sin filtrar `evaluacion.anulada`) ya está hecho — ver
  TRAZABILIDAD.md #48.
- **Herramientas de formación/táctica.** Diferidas a una ronda de planeamiento
  propia; hoy sin ninguna definición.
- **Mejoras propuestas por Gemini (con recomendación).** (1) **Comprobante de pago
  en PDF** para la familia: bajo riesgo, esfuerzo M, hacerlo primero; llamarlo
  "comprobante de pago", no factura (consultar al contador por la DIAN). (2)
  **Recordatorios de cobranza por email** (Resend ya integrado; exige verificar el
  dominio) antes que WhatsApp. (3) **WhatsApp**: piloto con una escuela; paga por
  mensaje de plantilla y exige número verificado, plantillas aprobadas y
  consentimiento de Habeas Data. (4) **Pasarela PSE/Wompi**: espera a la empresa
  constituida y a definir si recauda la plataforma o cada escuela. (5) **Modo
  offline**: primero confirmar con los DTs que ocurre; empezar por un borrador
  local del formulario, no por un offline completo.
- **Countdown al iniciar sesión.** Cortado (§56). Si se retoma, que sea de 1
  segundo y salteable.

## 🔮 Fuera de alcance por ahora

Registrados para no re-discutirlos: **rankings entre escuelas** (excluidos a
propósito por privacidad de menores), **app móvil nativa** (hoy es PWA) e
**internacionalización** (la app es en español).
