# SEGURIDAD.md — Checklist 6.8 firmado por endpoint

Estado de la auditoría de seguridad (Sprint 7). Se aplica el checklist de la
Sección 6.8 del Plan Maestro a **cada** frontera de la aplicación.

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
- **Rate limiting** (en memoria, Fase 1): login 5/min, leads 3/h, registro 5/h,
  foto 10/día.

## Endpoints públicos (sin sesión)

| Endpoint | Validación | Anti-abuso | Notas |
|---|---|---|---|
| `POST /api/leads` | Zod | Honeypot + tiempo mínimo + rate limit 3/h + `Sec-Fetch-Site`/Origin | Respuestas genéricas; honeypot responde 200 silencioso |
| `registrarConCodigoAction` | Zod | Rate limit 5/h por IP | Valida vigencia/usos del código en transacción; crea jugador PENDIENTE |
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
| **importación** · importarJugadores CSV (Escuela/SA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **métricas** · fijar/quitarMetrica (Escuela) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
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

¹ La longitud (≤2000) y la pertenencia del jugador acotan el abuso; rate limit
de mensajes 30/h queda como refinamiento (Upstash en Fase 2).
² El `where` incluye `userId` del propio usuario: solo marca sus notificaciones.
³ Solo el responsable (padre/cuenta) del jugador; una validación por semana ISO
(único `jugadorId+semana` también a nivel de BD).
⁴ El DT solo opera sobre jugadores de **sus** categorías (`categoriasDelDt` +
verificación de `categoriaId`); el logro debe estar disponible y dentro de
ventana para su escuela (`logroDisponibleParaEscuela`).
⁵ Rate limit compartido `resetpw:<userId>` 10/h y `cambiopw:<userId>` 5/h. Las
contraseñas temporales se generan cripto-seguras y se muestran una sola vez;
nunca se almacenan ni loguean en claro.

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

### Carga masiva por CSV y plantilla (M7)
- `importarJugadores`: **ESCUELA_ADMIN** (su tenant) / **SUPER_ADMIN** (escuela
  explícita). Archivo `.csv` máx **1 MB**, máx **500 filas**, rate limit 5/h.
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

## Protección específica de menores (Sección 6.4)

- **Fotos** fuera de `/public`; servidas por `GET /api/archivos/foto/[id]` con
  sesión + tenant + (responsable **o** consentimiento siendo staff). Sin permiso
  → **404** (avatar). Validación por **magic bytes**, **strip de EXIF**, resize
  800px y recompresión WebP; nombre regenerado (UUID); `Cache-Control: no-store`.
- **Revocar consentimiento** oculta la foto al instante (la carta usa avatar).
- **Mensajería**: sin canal directo adulto↔menor; los hilos van DT/Escuela↔padre.
- **Sin rankings** públicos; métricas visibles solo a padre, sus DTs y la escuela.
- **Observaciones privadas** de la evaluación: nunca en la carta ni en noticias.

## Pendiente para Fase 2

- RLS en Supabase replicando las reglas de tenant (la app deja de ser el único
  guardián).
- Rate limiting distribuido (Upstash/Redis) y emails transaccionales.
