# Trazabilidad — Academia Elite (Fútbol Career Mode)

> **Qué es este archivo.** El registro **único** de todo lo que se ha hecho:
> sprints, correcciones y planes ejecutados. Cuando un plan se completa, su
> resumen aterriza acá y el documento del plan se elimina — el detalle completo
> siempre queda en el historial de git.
>
> **Qué NO está acá:** los documentos vivos de referencia van aparte —
> `ESTADO-DEL-PROYECTO.md` (contexto integral: visión, stack, arquitectura),
> `DECISIONES.md`, `SEGURIDAD.md`, `HABEAS-DATA.md`, `CURVA-DE-DESARROLLO.md`,
> `GUIA-FONDOS.md`, `MANUAL-DE-USO.md` y `ACADEMIA-ELITE-DEMO.md`. Lo que **falta
> por hacer** vive en `PENDIENTES.md`.
>
> **Planes ya ejecutados y eliminados del repo** (su resumen está en esta línea de
> tiempo): `PLAN-MAESTRO-v4.md` (visión original de Fase 1 — describía SQLite,
> hoy obsoleto), `PLAN-UX-DT.md` (PR-1 a PR-5, ejecutado 100%) y
> `HOJA-DE-RUTA.md` (migración Sprint 8, cerrada). Los comentarios del código que
> citan `PLAN-UX-DT PR-n §x` refieren al hito 12 de acá.

---

## Línea de tiempo (resumen)

| # | Hito | Fecha | Estado |
|---|---|---|---|
| 0 | Fase 1 — base funcional | — | ✅ |
| 1 | Sprint V / V.1 / G — visual + gestión (pre-producción) | 2026-06 | ✅ |
| 2 | PLAN-MEJORAS-2 — Sprint M (10 puntos post-G) | 2026-06 | ✅ |
| 3 | Simulador configurable + planilla con fórmulas + curva MEN diaria | 2026-06-13 | ✅ |
| 4 | Correcciones Sprint M.1 → M.5 | 2026-06-12 | ✅ |
| 5 | Aislamiento multi-tenant (hardening) | 2026-06-23 | ✅ |
| 6 | Rol Súper Admin — M1/M2/M3/M4 | 2026-06-23 | ✅ |
| 7 | PLAN-MEJORAS-5 — 8 ítems en 3 sprints | 2026-06-24 | ✅ |
| 8 | Sesión foto/carta (CORS, compartir, @imgly) | 2026-06-24 | ✅ |
| 9 | Branding + favicon + fixes carta/hydration | 2026-06-25 | ✅ |
| 10 | Resend — email transaccional + auth por correo | 2026-06-26 | ✅ (commit `e6b1842`) |
| 11 | Sprint 8 — migración a producción (Supabase + Vercel) | 2026-07 | ✅ |
| 12 | PLAN-UX-DT — Modos de Sesión y panel Escuela (PR-1 a PR-5) | 2026-07 | ✅ |
| 13 | Ronda de testing en Vercel — bugs y mejoras | 2026-07-23 | ✅ |
| 14 | Contactos: teléfono + parentesco y export de nómina | 2026-07-24 | ✅ |
| 15 | Academia Elite — escuela demo curada | 2026-07-24 | ✅ |
| 16 | Red de seguridad — CI/CD y error boundaries | 2026-07-24 | ✅ |

Principios transversales respetados en **todos** los hitos: capas estrictas
(`app|components → actions → services → repositories → prisma`), seguridad de
datos de menores (`AuthContext` de sesión, `requireRole`/`assertTenant`, Zod en
la frontera, AuditLog, DTOs planos), componetizado, español en el dominio,
`typecheck`/`lint`/`test`/`build`/`e2e` en verde antes de cerrar.

---

## 0. Fase 1 — base funcional

Plataforma multi-tenant base: motor de stats puro (RIT/TIR/PAS/REG/DEF/FIS/MEN +
OVR), carta estilo EA FC por nivel (Bronce/Plata/Oro/Héroe), 4 roles
(SUPER_ADMIN, ESCUELA_ADMIN, DT, JUGADOR), auth (Auth.js v5 + Credentials + JWT),
RBAC + guards, evaluaciones, semana operativa, bloqueo de familias. **38 unit, 7
E2E.** La visión está en `ESTADO-DEL-PROYECTO.md` §0.

## 1. Sprint V / V.1 / G — visual + gestión (pre-producción)

Dos sprints antes de pensar en producción (origen: `PLAN-MEJORAS-VISUALES.md`).

- **Sprint V (visual + quick wins):** tipografía display (Archivo Black), iconos
  `lucide-react` (reemplazo de emojis), pulido de PlayerCard/paneles/hub, filtro
  por categoría del DT. `--brand` (white-label) y `prefers-reduced-motion`
  respetados; sin romper selectores E2E.
- **Sprint V.1:** avatares **DiceBear** generados **localmente** (sin APIs
  externas), editor de avatar.
- **Sprint G (gestión/CRUD):** bloqueo de jugadores (Escuela + Súper Admin),
  borrado lógico (reversible, solo SA), logros, simulador, CRUD de gestión.
  WhatsApp/email solo como **arquitectura escalable** (dispatcher multicanal,
  implementación en Fase 2).
- **Resultado:** 64 unit, 8 E2E.

## 2. PLAN-MEJORAS-2 — Sprint M (10 puntos post-G)

- **Bug simulador congelado:** `CountUp` no actualizaba con `reveal=false`
  (renderiza `value` directo).
- Carta: 4 esquinas uniformes (se quitó el `clip-path`).
- Landing: foto real en cartas demo (`nino_carta.png` optimizada con sharp).
- `/admin/usuarios`: filtro por escuela (cliente, sin tocar servicio).
- **Calendario del jugador** (`listarCalendarioJugador`).
- Validación de progreso por DT, **carga masiva de jugadores**, curva de niveles
  ajustable, **métricas por escuela** (las configura el ESCUELA_ADMIN; lo global
  del SA es fallback), umbrales de nivel editables (global y por escuela),
  migración del avatar a **DiceBear v10 (toon-head)**.

## 3. Simulador configurable + planilla con fórmulas + curva MEN diaria

(Origen: `CAMBIOS-CURVA-SIMULADOR.md`. Diseño conceptual en `CURVA-DE-DESARROLLO.md`.)

- **Simulador con parámetros elegibles** (global | escuela) por grupo de edad:
  `obtenerConfigSimuladorEscuela`, selector global ↔ escuela.
- **Planilla Excel con fórmulas nativas de OVR/MEN** (`plantilla-simulador.service`):
  replica el motor con `INDEX/MATCH` por grupo/posición; route
  `/api/plantilla-simulador`.
- **Curva de desarrollo (MEN diario):** la asistencia hace crecer el MEN día a
  día. `src/lib/curva.ts` (puro): entrenamiento **+0.6**, partido **+1.2**, tope
  **+12**, decaimiento solo desde la 3ª ausencia (recuperable), ventana móvil 30
  días, idempotente. `ovrConMen(...)` recalcula OVR sin re-evaluar. **Cron**
  `/api/cron/men-diario` protegido por `CRON_SECRET`, schedule en `vercel.json`.
  **Alcance acotado:** el bonus afecta solo la carta del hub del jugador; ranking
  / export / dashboard usan el OVR **medido** (comparabilidad). 10 tests nuevos.

## 4. Correcciones Sprint M.1 → M.5 (2026-06-12)

**M.1** — Fix `Body exceeded 1 MB limit` (Server Actions →
`bodySizeLimit: "6mb"`); compresión/recorte de foto en cliente
(`prepararParaRecorte`, `recortarABlob`, `FotoCropper` con react-easy-crop 3:4);
limpieza de estado del modal de importación; **importación masiva .xlsx** con
`exceljs` (migrada de CSV); cuadrícula de stats en 6 columnas; **fondos de carta
por méritos** (`FondoCarta`/`FondoDesbloqueado`, requisito configurable
SIEMPRE/LOGRO/NIVEL_CARTA/NIVEL_PERSONAL). 88 unit.

**M.2** — Encuadre de foto (cabezas cortadas: `object-top` + máscara a `50% 36%`);
reactividad al cambiar foto (cache-buster `?v=`); transparencia + Héroe como fondo
especial "LEYENDA" (`heroeEquipado`); **registro del padre + vinculación por
códigos** (`codigoJugador`, `registrarPadreYVincular` en transacción); **descargar
carta con marca de agua** (`html-to-image`). Extra: simulador del SA con
apariencia. 91 unit.

**M.3** — Transparencia de foto (causa raíz: el pre-recorte exportaba **JPEG** sin
alfa → fondo negro; pasa a **WebP**); carta del dashboard idéntica a la landing
(wrapper unificado); **modo claro/oscuro en la landing** (reusa el sistema de
tema existente, `LandingHeader` + ThemeToggle).

**M.4** — **Jornada de medición** (carga masiva de evaluaciones .xlsx,
`importacion-evaluaciones.service`, crea+evalúa); el fondo afecta a **toda la
carta** (skins: Clásico, Cobre, Esmeralda, Plata, Dorada, Rubí, Leyenda); color de
letra adaptado al fondo (`colorTexto`, contraste); fix marca de agua en la
descarga (se monta solo durante exportación).

**M.5** — Jornada de medición desde el SA (por escuela, imputa al DT de la
categoría); zoom de foto en carta (caja 3:4); **export total de jugadores .xlsx**
(con `protegerCelda` anti CSV/formula-injection); **`HABEAS-DATA.md`** (Ley
1581/2012 + Decreto 1377/2013, énfasis en menores y fotos); validación de límites
del código de invitación; **anti-XSS** (`lib/validators/sanitizar.ts`,
`textoSeguro`); modo claro legible (contraste ~7:1); formulario de leads
(teléfono obligatorio con indicativo, popups, rate limit 8/h). 97 unit.

## 5. Aislamiento multi-tenant — hardening (2026-06-23)

(Origen: `AISLAMIENTO-MULTITENANT.md`.) Refactor de los repositorios para recibir
`escuelaId` como primer parámetro y aplicar el patrón `...scope`
(`const scope = escuelaId === null ? {} : { escuelaId }`); `findFirst`/`updateMany`
en vez de `findUnique`/`update` para no filtrar por id sin tenant; corrección de
todos los call sites. **Test guardián permanente**
(`tests/unit/aislamiento-tenant.test.ts`): falla si una query sobre un modelo con
`escuelaId` no filtra ni se marca `// tenant-global:` con su razón.

## 6. Rol Súper Admin — M1/M2/M3/M4 (2026-06-23)

(Origen: `ROL-SUPER-ADMIN.md`.)

- **M1 — Auditoría obligatoria:** toda escritura del SA sobre datos de un tenant
  exige `motivo` que va al `AuditLog` (`assertMotivoSoporte`).
- **M2 — Modo soporte:** el SA **no** tiene acceso ambiental; accede al detalle de
  un tenant solo vía **sesión de soporte** activa (`SoporteSesion`,
  `assertTenant` gobernado, nace en **solo-lectura**, escribir requiere
  habilitar). Cierra el agujero de acceso ambiental en los 4
  `escuelaObjetivo()`.
- **M3 — Dashboard agregado:** métricas cross-tenant de plataforma
  (`admin-metrics.repository`, 8 funciones `// tenant-global:`).
- **M4 — RBAC por permisos:** `PERMISOS_POR_ROL`, `requirePermiso`,
  `tienePermiso`.

## 7. PLAN-MEJORAS-5 — 8 ítems en 3 sprints (2026-06-24)

(Origen: `NUEVOS-REQUERIMIENTOS.md` + análisis arquitectónico → `PLAN-MEJORAS-5.md`.)

- **Sprint 1:** alta directa de escuelas (SA, `crearEscuelaConAdmin` atómico),
  notificaciones (`prioridad` + deep-links), registro con **auto-login**,
  **`formatearNombre`** (Title Case con partículas/prefijos, punto único de
  verdad vía Zod `.transform`).
- **Sprint 2:** **CRM de leads** (mini-CRM: estados, notas, seguimiento),
  **vista jugador card-first** (`HubHero` + Web Share), **códigos humanos de
  referencia** (`codigoRef`, `ESC-…`/`JUG-…`).
- **Sprint 3:** **cámara con silueta** (`CamaraCaptura`, getUserMedia + overlay
  SVG). La **remoción de fondo** quedó como fase posterior (datos de menores: sin
  API externa).

## 8. Sesión foto/carta (2026-06-24, vía Gemini)

(Origen: `RESUMEN-SESION.md`.) Descarga de carta (fix tainted canvas con
`crossOrigin`); compartir con fallback; **remoción de fondo local** con
`@imgly/background-removal` self-hosteada en `/imgly/` (sin CDN externo, modelo
copiado en postinstall); rotación en el cropper; paginación de "Noticias del
club" (de a 10); transparencia PNG; logout con redirección dinámica.
**Revertido por Habeas Data:** se eliminó un bloque que sugería subir la foto del
menor a `iloveimg.com` (servicio externo) — viola §5.

## 9. Branding + favicon + fixes carta/hydration (2026-06-25)

- **Marca "Academia Elite"** en todo lo visible (título, manifest, login, landing,
  splash, footer) y en metadatos de export `.xlsx`. Antes decía "Fútbol Career
  Mode" (nombre de desarrollo).
- **Favicon** propio: `icon.png` (512) + `apple-icon.png` (180) + `favicon.ico`
  (multi-tamaño), optimizados; el viejo `favicon.ico` tenía precedencia.
- **Carta — descarga:** la foto no salía porque `html-to-image` no rasteriza
  `mask-image` (radial-gradient) en el `<foreignObject>` de Chrome → se quita la
  máscara solo durante la captura. **Compartir** en escritorio cae a descarga.
  Salida **HD** (pixelRatio dinámico ~1080px) y **doble pasada** (la 1ª de
  html-to-image omite imágenes).
- **Hydration:** `suppressHydrationWarning` en los `<form>` (atributos
  `__gcruniqueid` inyectados por extensiones del navegador, no es bug propio).

## 10. Resend — email transaccional + auth por correo (2026-06-26)

(Commit `e6b1842`, rama `feat/seguridad-multitenant`. Passed el code-review del
hook.) Integra **Resend** respetando capas y datos de menores:

- **Infra:** cliente con **modo dev** (sin `RESEND_API_KEY` loguea el correo en
  consola), plantillas con marca, `email.service`. Modelo **`TokenAuth`** (hash
  SHA-256 de un solo uso, expiración, anti-fuerza-bruta) + `User.emailVerificado`.
- **Recuperar contraseña** (`/recuperar` → token → nueva clave), **verificación de
  email** (registro → `/verificar/[token]`, gate **suave** que no bloquea),
  **login con OTP** (`/codigo`, provider `otp`, hash incluye `userId` para no
  colisionar en el `@unique`).
- **Credenciales por link** (set-password) al crear escuela+admin (la clave
  temporal en pantalla queda de respaldo); **código de invitación por correo**
  desde `/escuela/codigos`; **confirmación de lead** al interesado + aviso al
  equipo.
- Anti-enumeración consistente, rate-limit en todos los envíos, AuditLog en
  cambios de contraseña/verificación. 7 tests nuevos (`tokens`). 138 unit.
- **Pendiente operativo:** sin dominio verificado en Resend, el modo prueba
  (`onboarding@resend.dev`) solo entrega al correo dueño de la cuenta. Faltan las
  env vars (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DEV_TO`, `EMAIL_EQUIPO`).

## 11. Sprint 8 — migración a producción (2026-07)

(Origen: `HOJA-DE-RUTA.md`, ya eliminado.) La app dejó de correr sobre SQLite y
disco local — ambos efímeros en serverless — y pasó a infraestructura real:

- **SQLite → Supabase PostgreSQL**: `provider = "postgresql"`, adapter `PrismaPg`,
  runtime por el pooler (transaction mode, `?pgbouncer=true`) y CLI por la
  conexión directa (`DIRECT_URL`). Migraciones regeneradas.
- **Fotos en disco → Supabase Storage** (bucket privado): misma firma pública en
  `src/lib/foto/storage.ts`; las fotos se siguen sirviendo SOLO por
  `/api/archivos/*` con auth, nunca por URL pública.
- **Rate limit distribuido**: Upstash Redis con ventana deslizante, con fallback
  en memoria para dev/E2E.
- **RLS habilitado** en Supabase como segunda capa de aislamiento.
- **CSP** movida a `src/proxy.ts` (emisión única por request) y `cdn.jsdelivr.net`
  removido: el modelo de remoción de fondo es self-hosted.
- **Despliegue en Vercel** desde `main`.

## 12. PLAN-UX-DT — Modos de Sesión y panel Escuela (2026-07)

(Origen: `PLAN-UX-DT.md`, ya eliminado. Los comentarios del código que citan
`PLAN-UX-DT PR-n §x` refieren a este hito.) Reemplaza el evento-como-página por un
**flujo guiado** para el DT en cancha.

- **PR-1 — backend de los modos:** migración (`Asistencia` con justificado /
  llegoTarde / salioAntes / agregadoEnCancha / corrección, `Evento` con
  sesionIniciadaAt / sesionCerradaAt / notaSesion, modelo `ObservacionJugador`),
  `sesion.service.ts` con `eventoDelDt` como barrera única, y tests.
- **PR-2 — quick wins:** confirmación antes de cancelar un evento (notifica
  familias), home "Hoy" del DT accionable, tab bar móvil, KPIs de escuela
  clickeables, fila de Administración con `resumenMembresias`.
- **PR-3 — Modo Sesión + ENTRENAMIENTO:** ruta full-screen, `ListaViva` (un toque
  cicla presente/ausente/justificado, long-press para modificadores), guardado
  optimista con cola y backoff, cronómetro, observaciones con chips, cierre.
- **PR-4 — Modo PARTIDO:** marcador en vivo que alimenta marcador **y** estadística
  individual en la misma operación; deshacer gol; tarjetas; cierre con tabla
  editable por steppers. La notificación a familias sale **una sola vez**, al
  cerrar.
- **PR-5 — exportables + pulido:** exports de **membresías/cobranza, asistencia
  (matriz jugador × fecha), resultados y contactos**, todos con `protegerCelda` y
  auditoría `EXPORT_*`; autocomplete de membresías (C2.2); sidebar agrupado en 3
  secciones (C2.4); matriz de asistencia mes × categoría (C2.5); botonera 1–10 en
  la evaluación, sin valor precargado (B5).

## 13. Ronda de testing en Vercel (2026-07-23)

Diez hallazgos probando en producción. Resueltos:

- **Modo Partido:** un partido creado sin convocatoria dejaba la lista vacía (ahora
  cae al plantel completo); un jugador sumado en cancha se duplicaba al revalidar
  (colisión de `key` + marcas compartidas → dedupe por `jugadorId`); las tarjetas
  ahora se **agregan y se quitan** en vivo, con **dos amarillas = roja**.
- **Notificaciones:** la lista se copiaba a `useState` (se sembraba solo al
  montar), así que ni llegaban las nuevas ni se reflejaba lo leído. Ahora la
  fuente de verdad es el prop del server.
- **Auditoría:** filtros por entidad/acción/actor + paginación.
- **UI:** modal con scroll (el form de fondos desbordaba) e iconos del calendario
  centrados.

## 14. Contactos — teléfono y parentesco (2026-07-24)

Destraba el último export de PR-5, que estaba bloqueado por schema. Migración
`User.telefono` + `Jugador.parentescoAcudiente` (nullable); la familia los carga
desde "Mi cuenta"; export de nómina (jugador, nacimiento, categoría, acudiente,
parentesco, teléfono, email) con auditoría `EXPORT_CONTACTOS`.

## 15. Academia Elite — escuela demo curada (2026-07-24)

Escuela demo **aparte** de "Academia Demo" (que queda reservada para los E2E), con
narrativa: 4 categorías por año, 13 jugadores activos y evaluados cubriendo los
cuatro niveles de carta, membresías en los tres estados, 8 semanas de
entrenamientos con asistencia (tasa distinta por categoría para ejercitar el
semáforo) y partidos jugado/próximo. Credenciales y resumen en
`ACADEMIA-ELITE-DEMO.md`.

## 16. Red de seguridad — CI/CD y error boundaries (2026-07-24)

Con producción ya sirviendo datos reales, faltaba la red:

- **`.github/workflows/ci.yml`**: `typecheck` + `lint` + `test` en cada push/PR a
  `main`. `build` y `e2e` quedan fuera porque necesitan base y secretos.
- **`error.tsx` / `global-error.tsx`**: degradación elegante con la API de Next 16
  (`unstable_retry`, no `reset`). Nunca muestran el mensaje del error: solo el
  `digest`, que cruza con los logs de Vercel.
- **Sentry descartado por ahora:** `@sentry/nextjs` rompe con Next 16 + Turbopack
  (duplica `@opentelemetry/api` → stack overflow) y, sobre todo, es un procesador
  externo nuevo que recibiría PII de menores → requiere pasar por Habeas Data
  (§5) antes de instalarse.

---

## Observaciones abiertas (no bloquean, registradas para no perderlas)

- **`auth.ts`** consulta `db.user.findUnique` directo en el provider Credentials
  (patrón estándar de Auth.js; preexistente). Opcional: mover a un
  `buscarCredencialesPorEmail` en el repositorio.

> Las observaciones de CSP (`cdn.jsdelivr.net`) y de extender las credenciales por
> link se resolvieron o se movieron a `PENDIENTES.md` — este archivo registra lo
> hecho, no lo que falta.
