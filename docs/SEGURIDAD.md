# SEGURIDAD.md — Checklist firmado por endpoint

Auditoría de seguridad aplicada a **cada** frontera de la aplicación.
Última actualización: **2026-11-16**.

## Garantías transversales (por arquitectura)

- **Autenticación**: toda Server Action de mutación llama `requireAuthContext()`,
  que construye el `AuthContext` **desde la sesión** (JWT), nunca del body, y
  además verifica que el usuario siga existiendo y activo y que la sesión no haya
  sido revocada (si no, limpia la cookie vía `/api/salir`). El `AuthContext` para
  páginas usa `requirePanelUser`. Los route handlers de `/api` usan
  `getAuthContext()`, que aplica **la misma revocación** (ver "Revocación de
  sesiones" más abajo): ya no hay una vía que acepte el JWT de un usuario
  desactivado o emitido antes de un cambio de contraseña.
- **Autorización (Barrera 2)**: la Capa 3 (servicios) aplica `requireRole`,
  `assertTenant` (cruce de tenant → **404**, no 403), `assertOwnPlayer` /
  `requireEscuela` y el *scoping* por categorías del DT. El proxy (Barrera 1) es
  solo UX.

### Los guards y qué responde cada uno

Dos preguntas distintas, y confundirlas es el origen de los dos agujeros de
acceso ambiental que se cerraron el 2026-07-31:

| Guard | Responde | Falla con |
|---|---|---|
| `requireRole(ctx, [roles])` | **quién sos** | `ForbiddenError` (403) |
| `requirePermiso(ctx, permiso)` | **qué podés hacer en la plataforma** — permisos de `PERMISOS_POR_ROL` (hoy todos en el SUPER_ADMIN): catálogos globales, parámetros, gestión de escuelas. **No dice nada sobre a qué tenant podés entrar.** | `ForbiddenError` (403) |
| `assertTenant(ctx, escuelaId)` | **a qué escuela podés entrar**. Para el SUPER_ADMIN exige **sesión de soporte activa para esa escuela** | `ForbiddenError` sin sesión; `TenantMismatchError` (→ **404**) contra otra |
| `assertSoportePuedeEscribir(ctx)` | si la sesión de soporte **puede escribir** (nace en solo-lectura) | `ForbiddenError` |
| `assertMotivoSoporte(ctx, motivo)` | si el SA declaró **por qué** entra (solo escrituras, M1) | `ValidationError` |
| `requireEscuela(ctx)` | devuelve el `escuelaId` garantizado del actor | `ForbiddenError` |
| `assertOwnPlayer(ctx, id, propios)` | si el padre/jugador opera sobre **su** jugador | `TenantMismatchError` |

> **Regla:** cuando el `escuelaId` llega del **request** (body, query), ni
> `requireRole` ni `requirePermiso` alcanzan — hace falta `assertTenant`. Los
> primeros dicen quién sos; solo el tercero dice dónde podés mirar.
- **Validación**: toda entrada externa se valida con **Zod** en la Capa 2
  (`safeParse`); lo inválido devuelve mensaje genérico (`ValidationError`).
- **Errores**: `mapError` convierte cualquier error de dominio en `{ ok:false,
  error }` (mensaje seguro) y re-lanza las señales de control de Next; nunca se
  exponen stack traces ni mensajes de Prisma. Los `*.service` devuelven **DTOs
  planos**, nunca modelos Prisma.
- **IDs**: `cuid` (no autoincrementales) → sin enumeración.
- **Cabeceras**: la **CSP** se emite en un solo lugar, por ruta, desde
  `src/proxy.ts` (sin `unsafe-eval` en producción; la única excepción es
  `/jugador/perfil`, donde `@imgly/background-removal` lo necesita). Las demás
  (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en producción) viven en `next.config.ts`. No se
  define la CSP en `next.config.ts`: `headers()` acumula y dos CSP solapadas se
  intersectan.
- **Rate limiting distribuido** con **Upstash Redis** (ventana deslizante por
  clave, p. ej. `login:ip:email`): login 5/min por IP+correo y 20/15 min por
  correo (ver "Límite de intentos de login"), leads 8/h, registro 5/h, foto
  10/día. En serverless la memoria del proceso no se comparte entre lambdas, así
  que el límite real vive en Redis. Sin las envs de Upstash (dev local, E2E) cae
  a la implementación en memoria, y si Redis se cae **degrada** en vez de tumbar
  el login (`src/lib/rate-limit.ts`).
- **Abuso volumétrico y DDoS** — defensa en capas; ninguna sola alcanza:
  1. **Borde de la plataforma** (primera línea, corta ANTES de ejecutar código):
     Firewall de Vercel (reglas de rate limit por IP/ruta, *Attack Challenge
     Mode*) y *Spend Management* con tope de gasto. Se configura en el panel de
     Vercel, no en el repo — checklist en `PENDIENTES.md`.
  2. **Visitantes sin sesión**: `src/proxy.ts` (vía `src/lib/limite-publico.ts`) limita
     600 req/min por IP a todo documento (landing, login, `/e/[slug]`, escaneo de
     rutas): frena a un script de una sola fuente sin castigar a varias familias
     detrás de la misma IP (wifi, CGNAT móvil). Con IP desconocida no limita.
     Responde 429 con `Retry-After`. Suma un viaje a Redis por visita anónima.
  3. **Rutas autenticadas costosas**, por usuario (`limitarRuta`,
     `src/lib/rate-limit-http.ts`): exports Excel 10/min, fotos 1200/min,
     escudos 300/min, comprobantes 60/min. Mensajes 30/h (familia) y 120/h
     (staff), cobrados después de validar (action).
  4. **Acciones sensibles**: los límites por acción de arriba (login, registro,
     OTP, pagos, imports…).
  5. **Base de datos**: toda petición dinámica consulta Postgres; mantener el
     pooler de Supabase activo. `/e/[slug]` es `force-dynamic` a propósito (la
     desactivación de una escuela debe verse al instante) y por eso depende de
     las capas 1 y 2.
  - **`robots.txt`** (`src/app/robots.ts`): higiene, no defensa. Saca de los
    buscadores las áreas con sesión y la API para no gastar pedidos; `/e/` no se
    bloquea para que lean el `noindex` de cada landing. Está excluido del proxy.
  - **VPS futuro**: Cloudflare adelante + firewall del servidor que acepte solo
    sus IPs + `IP_CLIENTE_HEADER=cf-connecting-ip` (ver `ipCliente`; toma el primer valor y
    exige forma de IP). Sin esa
    env, `x-forwarded-for` es falseable fuera de Vercel y se esquivan todos
    los límites por IP.
  - **Límite honesto**: el rate limit de la app corre DENTRO de la función. Frena
    abuso y costo de base, pero un ataque volumétrico real lo absorbe el borde.
    Si Upstash se cae o agota su cuota, cae a memoria por instancia (débil en
    serverless; acotada a 10.000 claves para no filtrar memoria en un VPS).
- **Dependencias.** `npm audit --omit=dev` corre en el CI en cada push y cada lunes y falla ante
  vulnerabilidades críticas en producción; `.github/dependabot.yml` abre un PR semanal. Next.js,
  next-auth, sharp y Prisma se mantienen en versiones parcheadas (TRAZABILIDAD #63). Los riesgos aceptados
  están en `PENDIENTES.md`.
- **Aislamiento multi-tenant verificado por test**: `tests/unit/aislamiento-tenant.test.ts`
  lee el código de los repositorios y falla si una consulta sobre un modelo con
  `escuelaId` no filtra por tenant ni está justificada con `// tenant-global:`.
  **Limitación conocida**: el guardián no cubre `create`/`createMany` (ver
  `PENDIENTES.md`).
- **RLS** habilitado en **todas** las tablas del esquema `public` de Supabase.
  Las migraciones que crean tablas incluyen el bloque idempotente de
  re-habilitación: una tabla nueva no la hereda y nacería expuesta a la Data API.

## Endpoints públicos (sin sesión)

| Endpoint | Validación | Anti-abuso | Notas |
|---|---|---|---|
| `POST /api/leads` | Zod | Honeypot + tiempo mínimo + rate limit 8/h por IP + `Sec-Fetch-Site`/Origin | Respuestas genéricas; honeypot responde 200 silencioso |
| `registrarConCodigoAction` | Zod | Rate limit 5/h por IP | Valida vigencia/usos del código en transacción; crea jugador PENDIENTE |
| `vincularHijoAction` | Zod | Rate limit 5/h por IP | Vincula al padre con un hijo existente (código escuela + código jugador). Si el jugador ya tiene padre o el email existe → error y NO se crea cuenta (transacción) |
| `POST /api/auth/callback/credentials` y `/callback/otp` (`[...nextauth]`) | Auth.js (CSRF) | Tope dentro de `authorize` (`src/auth.ts`), común a la action y al endpoint: contraseña 5/min por IP+correo y 20/15 min por correo; OTP 5/15 min por IP+correo y 20/15 min por correo | bcrypt factor 12; el corte ocurre antes de consultar la cuenta, así que no revela si existe; errores genéricos |
| `GET /api/salir` | — | — | Solo borra cookies `authjs*` y redirige a `/login` |
| `GET /e/[slug]` | — (lectura pública por slug) | — | Slug inexistente o escuela inactiva → **mismo 404** (sin oráculo de enumeración más allá del aceptado: activa-sin-publicar muestra "en construcción" con el nombre de la escuela + `noindex` — decisión consciente, ver `DECISIONES.md` #87–89); DTO público con whitelist explícita (sin datos de jugadores ni fotos) |
| `GET /api/archivos/escudo/[escuelaId]` | Sesión (`getAuthContext`) | Rate limit 300/min por usuario | `assertTenant` en `escudo.service`: mismo tenant o SUPER_ADMIN con soporte de esa escuela; cualquier otro caso → 404 uniforme. CORS solo para el origen propio (la carta exporta el escudo a PNG) |
| `GET /api/archivos/escudo-publico/[slug]` | — | Rate limit 60/min por IP (429 al superarlo) | Sirve el escudo (PNG) solo si la escuela está `activa`; `Cache-Control: public, max-age=300` — hasta 5 min de staleness tras desactivar una escuela, aceptado |

## Server Actions (con sesión) — checklist por acción

Leyenda: **S** sesión/AuthCtx · **R** requireRole · **Z** Zod · **T** tenant/own ·
**E** errores genéricos · **D** DTO · **A** AuditLog · **L** rate limit.
(✓ aplica · — no aplica)

| Acción | S | R | Z | T | E | D | A | L |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **admin** · actualizarEstadoLead | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| **admin** · convertirLead | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| **admin** · actualizarParametro | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| **escuela** · actualizarBranding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **escuela** · crearCategoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **escuela** · crearSede / crearCancha | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **escuela** · crearDt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **escuela** · crearCodigo / desactivarCodigo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **alta** · crearJugadorCompleto (DT/Escuela/SA en soporte) | ✓ | ✓ | ✓ | ✓⁷ | ✓ | ✓ | ✓ | ✓ |
| **dt** · aprobar/rechazarSolicitud | ✓ | ✓ | ✓ | ✓¹⁰ | ✓ | ✓ | ✓ | — |
| **dt** · crearObjetivo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **dt** · crearEvaluacion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **evaluacion** · anularEvaluacion (escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **evento** · crearEvento / editarEvento | ✓ | ✓ | ✓ | ✓¹² | ✓ | ✓ | — | — |
| **evento** · confirmarConvocatoria (padre) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **evento** · pasarLista / cargarResultado | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **mensaje** · crearConversacion / responder | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓¹ |
| **mensaje** · publicarAnuncio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **notificación** · marcarLeida | ✓ | — | ✓ | ✓² | ✓ | ✓ | — | — |
| **jugador** · subirFoto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| **jugador** · actualizarConsentimiento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **jugador** · actualizarAvatar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **progreso** · validarSemana (responsable) | ✓ | ✓ | ✓ | ✓³ | ✓ | ✓ | ✓ | ✓ |
| **progreso** · validarSemanaDt (DT, sus categorías) | ✓ | ✓ | ✓ | ✓⁴ | ✓ | ✓ | ✓ | ✓ |
| **importación** · importarJugadores XLSX (Escuela/SA) | ✓ | ✓ | ✓ | ✓⁶ | ✓ | ✓ | ✓ | ✓ |
| **importación** · jornada de medición XLSX (DT/Escuela/SA) | ✓ | ✓ | ✓ | ✓⁶ | ✓ | ✓ | ✓ | ✓ |
| **métricas** · fijar/quitarMetrica (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **fondos** · equiparFondo (responsable) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **gestión** · editarJugador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **gestión** · cambiarEstadoJugador (inactivar/reactivar) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **gestión** · eliminarJugador (lógico, solo SA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **gestión** · restaurarJugador (solo SA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **bloqueo** · bloquear/desbloquearAcceso | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **gestión** · resetPasswordFamilia (Escuela/SA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **gestión** · resetPasswordFamiliaDt (DT, sus categorías) | ✓ | ✓ | ✓ | ✓⁴ | ✓ | ✓ | ✓ | ✓ |
| **gestión** · actualizarDt / resetPasswordDt (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓⁵ |
| **admin** · editarUsuario / resetPasswordUsuario (SA) | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓⁵ |
| **admin** · editarEscuela (SA) | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| **logro** · crear/editar/activar (catálogo global, SA) | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| **logro** · crear/configurar/otorgar (DT, su escuela) | ✓ | ✓ | ✓ | ✓⁴ | ✓ | ✓ | ✓ | — |
| **cuenta** · cambiarMiPassword (todos) | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| **política** · aceptarPolitica (JUGADOR, primer ingreso)⁸ | ✓ | ✓ | ✓ | ✓⁹ | ✓ | ✓ | ✓ | — |
| **sesión** · iniciar/cerrarSesión, asistencia viva, gol/tarjeta en vivo, observación (DT) | ✓ | ✓ | ✓ | ✓⁴ ¹¹ | ✓ | ✓ | — | — |
| **soporte** · abrir/habilitar escritura/cerrar sesión de soporte (SA) | ✓ | ✓ | ✓ | ✓⁶ | ✓ | ✓ | ✓ | — |
| **cobranza** · registrarMembresia (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · cambiarEstadoMembresia / registrar pago (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · generarCuotasDelPeriodo (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · crear/desactivarArancel (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · registrar/eliminarEgreso (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · crear/editar/desactivar/asignarJugadores DescuentoRegla (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · crear/editar/borrarConcepto (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **categoría** · editarRangosCategoria (Escuela; SA en soporte con motivo) | ✓ | ✓ | ✓ | ✓⁶ | ✓ | ✓ | ✓ | — |
| **landing** · actualizarLanding (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |

¹ Mensajes: 30/h por usuario familia y 120/h para staff (conversaciones nuevas y
respuestas comparten balde; se cobra tras validar); además la longitud (≤2000) y la pertenencia del jugador acotan el abuso.
² El `where` incluye `userId` del propio usuario: solo marca sus notificaciones.
³ Solo el responsable (padre/cuenta) del jugador; una validación por semana ISO
(único `jugadorId+semana` también a nivel de BD).
⁴ El DT solo opera sobre jugadores de **sus** categorías (`categoriasDelDt` +
verificación de `categoriaId`); el logro debe estar disponible y dentro de
ventana para su escuela (`logroDisponibleParaEscuela`).
⁵ Rate limit compartido `resetpw:<userId>` 10/h y `cambiopw:<userId>` 5/h. Las
contraseñas temporales se generan cripto-seguras y se muestran una sola vez;
nunca se almacenan ni loguean en claro.
⁶ El SUPER_ADMIN **no** tiene acceso ambiental al tenant: sin sesión de soporte
activa `assertTenant` lanza `ForbiddenError`, y contra otra escuela
`TenantMismatchError`. La sesión nace en solo lectura
(`assertSoportePuedeEscribir`) y toda escritura exige motivo (`assertMotivoSoporte`).
⁷ DT: la categoría debe ser una de las suyas (`categoriasDelDt`); ESCUELA_ADMIN: de
su escuela (`contarCategoriasDeEscuela`); SUPER_ADMIN: la escuela sale de la
sesión de soporte, nunca del body. La familia (JUGADOR) recibe 403.
⁸ `aceptarPoliticaAction` → `aceptarPolitica` (`politica.service`): solo rol
JUGADOR (`requireRole`; otro rol → `ForbiddenError`, sin tocar la base). La Zod
exige la casilla (`aceptaTerminos = "on"`). Sella `terminosAceptadosEn` y
`terminosVersion` (`TERMINOS_VERSION`) con un compare-and-set
(`updateMany … where terminosAceptadosEn: null`): **idempotente** y a prueba de
doble envío, no sobrescribe la prueba original. Audita `POLITICA_ACEPTADA` solo
la primera vez, con la versión en `motivo` y sin datos personales extra.
⁹ Propiedad por identidad: el `userId` sale del `AuthContext` (sesión), nunca del
body; no hay recurso de otro tenant que referenciar.
¹⁰ `cambiarEstadoSolicitud` (`jugador.service`): solo se resuelve una solicitud
**PENDIENTE** de las categorías del DT; cualquier otro estado (ACTIVO, INACTIVO,
ELIMINADO) falla con `ValidationError` y no escribe. El cambio es un
compare-and-set (`updateMany … where estado: "PENDIENTE"`), así que dos requests
concurrentes no se pisan, y registra `APROBAR_SOLICITUD` / `RECHAZAR_SOLICITUD` en
el `AuditLog`. Inactivar o reactivar a un jugador ya resuelto es gestión de la
escuela (con motivo y auditoría, `gestion-jugadores.service`).
¹¹ Modo Sesión: los ids de jugador llegan del cliente (asistencia, anotador y
asistente de un gol, tarjetas) y no se confían. `exigirParticipantesDelEvento`
(`participantes-evento.ts`) exige que cada id sea un **convocado** del evento o un
jugador **ACTIVO** de la categoría del evento en la escuela del evento; un id
ajeno o inexistente falla igual, como `NotFoundError` (404 uniforme), antes de
escribir. Sin esto se podían crear `Asistencia`/`EstadisticaPartido` para un
jugador de otra escuela, y el cron de la curva (que lee esas filas por
`jugadorId`) movía su rating. `agregarConvocadoEnCancha` además exige jugador ACTIVO.
`crearObservacion` exige que el `eventoId` (si viene) sea de la escuela y de una
categoría del DT; si no, `NotFoundError`.
¹² `canchaId` del formulario se valida contra las sedes de la escuela
(`validarCancha` → `obtenerCancha`, acotada por `sede.escuelaId`) al crear y al
editar; una cancha ajena falla como `NotFoundError`. Sin esto una cancha de otra
escuela se asignaba al evento y su nombre se mostraba a las familias.

### Revocación de sesiones
- El JWT (7 días) lleva una **huella de contraseña**: SHA-256 truncado (16 hex) del
  hash vigente, nunca el hash (`src/lib/auth/huella-password.ts`). Se calcula en
  `authorize` (Node) y `config.ts` solo la copia, para seguir siendo edge-safe.
- `getAuthContext()` lee al usuario una vez por request (`React.cache`) y devuelve
  `null` si **no existe, no está activo, o la huella del token no coincide** con la
  actual. Un token sin huella (anterior a este cambio) no vale: se vuelve a entrar
  una vez. Es la única puerta de los route handlers de `/api` (exports, fotos,
  comprobantes, escudos), que ante `null` responden como a un anónimo (401/404).
- `requireAuthContext` y `requirePanelUser` aplican la misma regla y, ante una
  sesión revocada o un usuario desactivado, redirigen a `/api/salir` (limpia la
  cookie; ir a `/login` provocaría un bucle con el proxy). Conservan el bloqueo de
  familias (`/bloqueado`, `permitirBloqueado`) sin cambios. La propia página
  `/bloqueado` ya no confía en el JWT solo: pasa por `requireAuthContext({
  permitirBloqueado: true })`, así una sesión revocada no ve su mensaje de bloqueo y
  no hay rebote entre `/bloqueado` y los guards.
- **`/api/salir` borra con los atributos que el navegador exige** (`src/lib/auth/cookies-sesion.ts`).
  Sobre HTTPS Auth.js usa `__Secure-authjs.session-token` y `__Host-authjs.csrf-token`;
  el navegador rechaza cualquier Set-Cookie de esos nombres sin `Secure`, borrados
  incluidos, y un `cookies().delete()` pelado lo emitía sin `Secure`: la cookie
  sobrevivía y el usuario entraba en bucle guard ↔ `/api/salir`. Ahora cada cookie
  (también los fragmentos `.0`, `.1`) se borra con `Path=/`, `HttpOnly`,
  `SameSite=lax`, `Max-Age=0` y `Secure` para los prefijos `__Secure-`/`__Host-`,
  sin `Domain`. El borrado por `signOut` (cambio de contraseña, logout) lo arma
  Auth.js con las opciones con las que creó la cookie, así que no tiene este
  problema. Cubierto por `tests/unit/api-salir.test.ts` (atributos del Set-Cookie
  serializado; el e2e corre por HTTP y no puede ejercitar los prefijos).
- Cualquier cambio de contraseña (propio, recuperación, temporal asignada por la
  escuela o el SA) cambia el hash y por lo tanto invalida **todas** las sesiones
  anteriores. Sin tabla de sesiones ni migración.
- Quien cambia **su propia** contraseña también queda fuera en ese dispositivo:
  `cambiarMiPasswordAction` cierra la sesión (`signOut`) y redirige a
  `/login?clave=1`, con un mensaje que explica el motivo. Se descartó refrescar el
  JWT con `unstable_update`: al mutar cookies, Next vuelve a renderizar la página
  en la misma request y `auth()` lee el header `cookie` original (token viejo)
  contra la base ya actualizada, de modo que el render echaba al usuario por
  `/api/salir` (lo detectó el e2e `08-sesion-revocada`).
- Límite conocido: `rol` y `escuelaId` viajan en el JWT y no se refrescan hasta el
  próximo login.

### Límite de intentos de login
- Vive **dentro de los `authorize`** de `src/auth.ts` (`src/lib/auth/limite-login.ts`),
  no en las Server Actions: el handler `/api/auth/callback/*` llega al mismo código
  y el proxy excluye `/api`, así que un tope solo en la action se esquivaba pidiendo
  un token CSRF y llamando al endpoint directo.
- Dos topes por intento, antes de consultar la cuenta o bcrypt (por eso no revelan
  si el correo existe): **IP+correo** (contraseña 5/min, OTP 5/15 min, como antes) y
  **solo correo** 20/15 min (≈1.900 por día), que no se esquiva rotando de IP.
- Superarlos lanza `LimiteIntentosError` (hereda de `CredentialsSignin`, `code`
  `demasiados_intentos`); la action lo traduce al mismo mensaje de siempre y no
  vuelve a contar el intento. Por el endpoint directo se ve como una redirección a
  `/login?error=CredentialsSignin&code=demasiados_intentos`.
- Compromiso asumido: como todo tope por cuenta, un tercero que conozca el correo
  puede dejarlo **sin acceso por contraseña**. Con ~1,3 intentos por minuto desde
  una sola IP mantiene lleno el cupo de 20/15 min de forma indefinida: el bloqueo
  dura mientras él siga y termina cuando para (ventana deslizante; no hay nada que
  levantar a mano). La alternativa —no tener tope por correo— permitiría adivinar
  sin límite rotando de IP. El ingreso con **código por correo** tiene su propio
  contador (`otp-login-correo`), así que sigue disponible mientras el atacante no
  gaste también ese. Pendiente de decidir si se endurece (p. ej. alerta al
  titular o desafío adicional).

### Bloqueo de acceso de familias (G2)
- Lo aplican **ESCUELA_ADMIN** (su tenant) y **SUPER_ADMIN**; el DT solo lo ve.
- Marca `User.bloqueado` de la cuenta de la familia (padre/cuenta del jugador).
- `requireAuthContext`/`requirePanelUser` redirigen al JUGADOR bloqueado a
  **`/bloqueado`**, que muestra el mensaje según el motivo (PAGO, COMPORTAMIENTO,
  CONTACTA_DT o PERSONALIZADO). Los mensajes predefinidos viven en `lib/bloqueo`.

### Aceptación de la Política en el primer ingreso de la familia
- Una cuenta JUGADOR con `User.terminosAceptadosEn = null` (la que crea el alta
  asistida) no ve el panel: el layout de `/jugador` lee la aceptación **de la
  base** (no del JWT, que no se refresca) vía `obtenerEstadoPolitica` y
  redirige a **`/aceptar-politica`**.
- `/aceptar-politica` es ruta pública para el proxy (fuera de los prefijos de
  rol; si colgara de `/jugador` el layout la redirigiría a sí misma en bucle).
  La sesión se exige **en la propia página** con `requirePanelUser("JUGADOR")`
  (Barrera 2): sin sesión → `/login`; otro rol → su panel; ya aceptada →
  `/jugador`. Lleva `noindex`.
- La compuerta es de **navegación** (layout): no sustituye la autorización de
  cada servicio, que sigue intacta. Alcance: solo JUGADOR; DT y escuela quedan
  fuera por ahora.

### Eliminación lógica de jugadores (G3)
- Solo **SUPER_ADMIN**; estado `ELIMINADO` (reversible con "restaurar").
- La acción exige reescribir el nombre del jugador + motivo; auditada. Los
  ELIMINADO se filtran de las listas (`listarHijos`, gestión por estado).

### Alta completa de jugador (hito 53.4)
- `crearJugadorCompletoAction` → `crearJugadorCompleto`: **DT** (solo sus
  categorías), **ESCUELA_ADMIN** (su tenant) y **SUPER_ADMIN** únicamente con
  sesión de soporte habilitada (no solo lectura) y motivo. Reemplaza al alta del
  DT (`crearJugador`), que creaba solo la identidad. Rate limit 60/h por
  usuario: crea cuentas con contraseña.
- **Una transacción** (`crearJugadorConFamilia`): cuenta de la familia (si hay) +
  jugador con toda su ficha. Si algo falla no queda nada a medias.
- **Alcance por rol en el servidor** (`fichaParaGuardar`): el DT no guarda
  documento, EPS, RH ni condiciones aunque el request los traiga. Sin
  `autorizaDatosSalud` no se guarda ningún dato de salud. Texto libre por
  `textoSeguro`; el mapeo FormData → schema está al lado del schema y cubierto
  por un test de renombres.
- **Cuenta de familia**: contraseña temporal cripto-segura, devuelta una sola vez,
  guardada solo como hash bcrypt, nunca en `AuditLog`. El correo es único global:
  uno que pertenece a otra escuela se rechaza con mensaje genérico (no revela de
  quién es); uno de una familia de **esta** escuela vincula al jugador (hermanos)
  en vez de crear otra cuenta. La búsqueda va acotada por `escuelaId` + rol.
- **Auditoría**: `CREAR_JUGADOR` (qué se cargó, sin valores) y, si se creó cuenta,
  `CREAR_CUENTA_FAMILIA`.

### Carga masiva por Excel y plantilla (M7 · M.1)
- `importarJugadores`: **ESCUELA_ADMIN** (su tenant) / **SUPER_ADMIN** (escuela
  explícita). Archivo **`.xlsx`** (migrado de CSV en M.1) máx **1 MB**, máx
  **500 filas**, rate limit 5/h.
  Cada fila se valida con el **mismo Zod** que el alta manual; la categoría se
  mapea por nombre dentro de la escuela; los duplicados (nombre+apellido+fecha)
  se **omiten**. Crea **solo jugadores** ACTIVO (sin familia). Auditado con los
  conteos (`IMPORTAR_JUGADORES`).
- `GET /api/plantilla-jugadores`: requiere sesión vigente (un usuario desactivado o con
  la sesión revocada cuenta como sin sesión); el servicio aplica rol/tenant
  (sin sesión → 401; sin permiso → 404). La plantilla lleva las categorías
  válidas de **esa** escuela.

### Métricas por escuela (M9)
- `fijar/quitarMetrica`: **ESCUELA_ADMIN** + `requireEscuela`; whitelist
  obligatoria (**solo** `RANGO_*` y `UMBRAL_*`). `PESO_MEN_EN_OVR` queda global
  para que el OVR sea comparable entre escuelas. Se valida la coherencia
  (min<max, Plata<Oro<Héroe) contra el valor **efectivo** mezclado. Auditado
  (`CAMBIO_PARAMETRO_ESCUELA` / `QUITAR_PARAMETRO_ESCUELA`).

### Validación de progreso por el DT (M6)
- `validarSemanaDt`: el DT solo valida jugadores de **sus** categorías
  (`categoriasDelDt`); la unicidad `jugadorId+semana` garantiza una sola
  validación por semana (la hace quien llegue primero, padre o DT). Auditado por
  jugador.

### Avatares de menores (M10)
- DiceBear v10 (`toon-head`) se genera **en proceso** (sync `toDataUri`), nunca
  una API externa. Sin datos personales: solo índices de estilo. La migración
  v1→v2 es local (no se exponen datos).

### Foto de menores: recorte/compresión en cliente (M.1)
- La imagen se redimensiona y recorta a 3:4 **en el navegador** antes de subir,
  reduciendo lo que viaja al servidor. El servidor **vuelve a procesarla**
  (magic bytes + strip EXIF + resize + WebP, nombre UUID) como defensa en
  profundidad: la validación de seguridad NO depende del cliente.
- Límite de Server Actions subido a 6 MB (`bodySizeLimit`) para que la subida no
  se rechace antes de la validación; el servicio mantiene su tope de 5 MB.

### Fondos de carta (M.1)
- `equiparFondo`: solo el **responsable** (rol JUGADOR + `assertTenant` +
  pertenencia). Se verifica que el fondo esté **desbloqueado** (cumple el
  requisito o ya estaba registrado) antes de equiparlo. Es cosmético: no toca
  OVR ni datos personales.

### Acceso ambiental del SA cerrado en las plantillas (2026-07-31 → 2026-08-01)

Hallazgos **preexistentes**, detectados al revisar cambios vecinos. Tres rutas
de importación/exportación por Excel resolvían el alcance del `SUPER_ADMIN`
tomando el `escuelaId` **del request** sin los tres guards de la familia M1/M2:

1. `plantilla-simulador.service.ts` (`?escuela=` del route) — solo verificaba
   `requirePermiso`, que es un permiso de **plataforma**, no un control de
   tenant. Exponía nombre, slug, rangos físicos efectivos, peso de MEN y
   umbrales de cualquier escuela. Corregido con `assertTenant`.
2. `importacion-evaluaciones.service.ts` — el caso grave, detallado abajo.
3. `importacion.service.ts` (`importarJugadores`) — mismo patrón que (2), un
   escalón atrás: `assertTenant` estaba, pero faltaban
   `assertSoportePuedeEscribir` y `assertMotivoSoporte`. Una sesión de soporte
   en **solo lectura** podía crear hasta 500 jugadores en el tenant, y el
   `AuditLog` solo registraba conteos, nunca el motivo. Corregido con el mismo
   patrón: `motivo` pedido en `ImportarJugadoresDialog` (solo cuando hay
   `escuelaId`), sanitizado con `textoSeguro({ max: 200 })` y encabezando el
   `motivo` del `AuditLog`.

> **Patrón a recordar:** `requireRole` y `requirePermiso` responden *quién sos*;
> `assertTenant` responde *a qué escuela podés entrar*. Cuando el `escuelaId`
> llega del request, hacen falta los dos.

`importacion-evaluaciones.service.ts` resolvía el alcance del `SUPER_ADMIN`
tomando el `escuelaId` **del request** (`formData` de la action y `?escuelaId=`
del route `/api/plantilla-evaluaciones`) con solo `requireRole`.

- **Lectura**: la plantilla embebe la nómina completa de jugadores activos
  (código, apellido, nombre, categoría). Un SA se llevaba los datos de menores de
  **cualquier escuela** escribiendo su id, sin sesión de soporte, por un GET.
- **Escritura**: `importarEvaluaciones` crea jugadores y evaluaciones (hasta 300
  filas) sobre esa misma escuela.

Contradecía §5 de `AGENTS.md`: *el SUPER_ADMIN no tiene acceso ambiental*.
Corregido con los **tres** guards de la familia M1/M2:
- `assertTenant(ctx, escuelaId)` en la rama del SA — exige sesión de soporte
  activa **para esa escuela**.
- `assertSoportePuedeEscribir(ctx)` en la importación — la sesión nace en
  solo-lectura.
- `assertMotivoSoporte(ctx, motivo)` — el motivo se pide en el diálogo (solo al
  SA), pasa por `textoSeguro({ max: 200 })` y encabeza el `motivo` del
  `AuditLog`. Antes ese campo guardaba solo los conteos (`evaluados=… nuevos=…`):
  telemetría con la ropa del motivo. Registraba **cuánto**, nunca **por qué** —
  y una entrada de auditoría que parece completa y no lo está es peor que una
  vacía, porque nadie la va a ir a buscar.

### Cobranza / ERP (hito 18)
- Todas las acciones son **ESCUELA_ADMIN** + `requireEscuela`; el SUPER_ADMIN no
  entra por acceso ambiental (nota ⁶). Cada escritura queda en `AuditLog`
  (`MEMBRESIA_REGISTRAR`, `MEMBRESIA_ESTADO`, `MEMBRESIA_GENERAR_PERIODO`,
  `ARANCEL_CREAR`, `ARANCEL_DESACTIVAR`), y el motivo incluye el medio de pago:
  es la traza de cómo entró la plata.
- `crearArancelEscuela` **revalida la categoría contra las de su propia escuela**
  en vez de confiar en el id del formulario.
- `referenciaPago` es el único campo de texto libre nuevo y pasa por
  `textoSeguro({ max: 60 })`; en el export va además por `protegerCelda`
  (inyección de fórmulas).
- El **monto de un arancel es obligatorio y se exige antes de coercionar**:
  `z.coerce.number()` convierte `null` y `""` en `0` (`Number(null) === 0`), y una
  Server Action es un endpoint HTTP donde el `required` del input no vale. Sin la
  guarda, un POST sin el campo creaba un precio de $0 que emitía el mes entero en
  cero, indistinguible de un 0 deliberado.
- La **generación masiva** usa `createMany({ skipDuplicates })` y **no** un
  upsert: un upsert pisaría el monto y el estado de una cuota ya pagada. El
  filtrado lo hace el unique en la base, así que es idempotente por construcción.
- El **período se calcula en la hora de la escuela (UTC-5)**, no en la del
  proceso: en Vercel el servidor corre en UTC, y leerlo con `getMonth()` daba por
  vencidas las cuotas cinco horas antes de que el mes cerrara, marcando en mora a
  familias que no lo estaban.
- El dinero se guarda en `Decimal`, nunca en `Float`, y el `Decimal` de Prisma no
  sale hacia la UI (DTOs planos).

## Protección específica de menores (Sección 6.4)

- **Fotos** fuera de `/public`; servidas por `GET /api/archivos/foto/[id]` con
  sesión + tenant + (responsable **o** consentimiento siendo staff). Sin permiso
  → **404** (avatar). Validación por **magic bytes**, **strip de EXIF**, resize
  800px y recompresión WebP; nombre regenerado (UUID); `Cache-Control: no-store`.
- **Revocar consentimiento** oculta la foto al instante (la carta usa avatar).
- **Mensajería**: sin canal directo adulto↔menor; los hilos van DT/Escuela↔padre.
- **Sin rankings** públicos; métricas visibles solo a padre, sus DTs y la escuela.
- **Observaciones privadas** de la evaluación: nunca en la carta ni en noticias.

## Resuelto en el Sprint 8 (ya no es pendiente)

- **RLS en Supabase**: habilitado en todas las tablas del esquema `public`; la
  app dejó de ser el único guardián.
- **Rate limiting distribuido**: Upstash Redis con ventana deslizante.
- **Correo transaccional**: Resend (recuperación, verificación, OTP).

## Pendiente

- **Decisión de Auth**: Auth.js sigue en **v5 beta** sobre datos de menores.
- **Observabilidad**: hoy solo logs de runtime de Vercel + el `digest` del error
  boundary. Sentry quedó descartado (incompatibilidad con Next 16 + Turbopack y,
  sobre todo, por ser un procesador externo que recibiría PII de menores).
- **El guardián de tenant no cubre `create`/`createMany`**: un create escribiendo
  en el tenant equivocado es peor que una lectura filtrada.
- **`build` y `e2e` en CI**: exige un proyecto Supabase dedicado con sus secretos.

Detalle y tamaño estimado en [PENDIENTES.md](PENDIENTES.md).
