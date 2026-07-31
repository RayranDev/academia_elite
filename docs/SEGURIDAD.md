# SEGURIDAD.md — Checklist firmado por endpoint

Auditoría de seguridad aplicada a **cada** frontera de la aplicación.
Última actualización: **2026-07-31**.

## Garantías transversales (por arquitectura)

- **Autenticación**: toda Server Action de mutación llama `requireAuthContext()`,
  que construye el `AuthContext` **desde la sesión** (JWT), nunca del body, y
  además verifica que el usuario siga existiendo y activo (si no, limpia la
  cookie vía `/api/salir`). El `AuthContext` para páginas usa `requirePanelUser`.
- **Autorización (Barrera 2)**: la Capa 3 (servicios) aplica `requireRole`,
  `assertTenant` (cruce de tenant → **404**, no 403), `assertOwnPlayer` /
  `requireEscuela` y el *scoping* por categorías del DT. El proxy (Barrera 1) es
  solo UX.
- **Validación**: toda entrada externa se valida con **Zod** en la Capa 2
  (`safeParse`); lo inválido devuelve mensaje genérico (`ValidationError`).
- **Errores**: `mapError` convierte cualquier error de dominio en `{ ok:false,
  error }` (mensaje seguro) y re-lanza las señales de control de Next; nunca se
  exponen stack traces ni mensajes de Prisma. Los `*.service` devuelven **DTOs
  planos**, nunca modelos Prisma.
- **IDs**: `cuid` (no autoincrementales) → sin enumeración.
- **Cabeceras** (`next.config.ts`): CSP (sin `unsafe-eval` en producción),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en producción.
- **Rate limiting distribuido** con **Upstash Redis** (ventana deslizante por
  clave, p. ej. `login:ip:email`): login 5/min, leads 8/h, registro 5/h, foto
  10/día. En serverless la memoria del proceso no se comparte entre lambdas, así
  que el límite real vive en Redis. Sin las envs de Upstash (dev local, E2E) cae
  a la implementación en memoria, y si Redis se cae **degrada** en vez de tumbar
  el login (`src/lib/rate-limit.ts`).
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
| `POST /api/leads` | Zod | Honeypot + tiempo mínimo + rate limit 3/h + `Sec-Fetch-Site`/Origin | Respuestas genéricas; honeypot responde 200 silencioso |
| `registrarConCodigoAction` | Zod | Rate limit 5/h por IP | Valida vigencia/usos del código en transacción; crea jugador PENDIENTE |
| `vincularHijoAction` | Zod | Rate limit 5/h por IP | Vincula al padre con un hijo existente (código escuela + código jugador). Si el jugador ya tiene padre o el email existe → error y NO se crea cuenta (transacción) |
| `GET /api/auth/[...nextauth]` | Auth.js | Rate limit login 5/min (acción `login`) | bcrypt factor 12; errores genéricos |
| `GET /api/salir` | — | — | Solo borra cookies `authjs*` y redirige a `/login` |

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
| **dt** · crearJugador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **dt** · aprobar/rechazarSolicitud | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **dt** · crearObjetivo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **dt** · crearEvaluacion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **evaluacion** · anularEvaluacion (escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **evento** · crearEvento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **evento** · confirmarConvocatoria (padre) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **evento** · pasarLista / cargarResultado | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **mensaje** · crearConversacion / responder | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓¹ |
| **mensaje** · publicarAnuncio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **mensaje** · marcarNotificacionLeida | ✓ | — | ✓ | ✓² | ✓ | ✓ | — | — |
| **jugador** · subirFoto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| **jugador** · actualizarConsentimiento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **jugador** · actualizarAvatar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **progreso** · validarSemana (responsable) | ✓ | ✓ | ✓ | ✓³ | ✓ | ✓ | ✓ | ✓ |
| **progreso** · validarSemanaDt (DT, sus categorías) | ✓ | ✓ | ✓ | ✓⁴ | ✓ | ✓ | ✓ | ✓ |
| **importación** · importarJugadores XLSX (Escuela/SA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
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
| **sesión** · iniciar/cerrarSesión, asistencia viva, observación (DT) | ✓ | ✓ | ✓ | ✓⁴ | ✓ | ✓ | — | — |
| **soporte** · abrir/habilitar escritura/cerrar sesión de soporte (SA) | ✓ | ✓ | ✓ | ✓⁶ | ✓ | ✓ | ✓ | — |
| **cobranza** · registrarMembresia (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · cambiarEstadoMembresia / registrar pago (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · generarCuotasDelPeriodo (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **cobranza** · crear/desactivarArancel (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |

¹ La longitud (≤2000) y la pertenencia del jugador acotan el abuso; el rate limit
de mensajes (30/h) queda como refinamiento pendiente — la infraestructura de
Upstash ya está, solo falta aplicarla a esta acción.
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

### Bloqueo de acceso de familias (G2)
- Lo aplican **ESCUELA_ADMIN** (su tenant) y **SUPER_ADMIN**; el DT solo lo ve.
- Marca `User.bloqueado` de la cuenta de la familia (padre/cuenta del jugador).
- `requireAuthContext`/`requirePanelUser` redirigen al JUGADOR bloqueado a
  **`/bloqueado`**, que muestra el mensaje según el motivo (PAGO, COMPORTAMIENTO,
  CONTACTA_DT o PERSONALIZADO). Los mensajes predefinidos viven en `lib/bloqueo`.

### Eliminación lógica de jugadores (G3)
- Solo **SUPER_ADMIN**; estado `ELIMINADO` (reversible con "restaurar").
- La acción exige reescribir el nombre del jugador + motivo; auditada. Los
  ELIMINADO se filtran de las listas (`listarHijos`, gestión por estado).

### Carga masiva por Excel y plantilla (M7 · M.1)
- `importarJugadores`: **ESCUELA_ADMIN** (su tenant) / **SUPER_ADMIN** (escuela
  explícita). Archivo **`.xlsx`** (migrado de CSV en M.1) máx **1 MB**, máx
  **500 filas**, rate limit 5/h.
  Cada fila se valida con el **mismo Zod** que el alta manual; la categoría se
  mapea por nombre dentro de la escuela; los duplicados (nombre+apellido+fecha)
  se **omiten**. Crea **solo jugadores** ACTIVO (sin familia). Auditado con los
  conteos (`IMPORTAR_JUGADORES`).
- `GET /api/plantilla-jugadores`: requiere sesión; el servicio aplica rol/tenant
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
