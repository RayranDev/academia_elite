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
| 17 | Ronda `mejoras.pdf`: onboarding, Apartado Eventos, Entrenamiento dinámico, notificaciones, endurecimiento de validación | 2026-07-25 → 2026-07-29 | ✅ |
| 18 | Giro a ERP — cobranza: dinero en `Decimal`, registro de pago, aranceles, generación masiva y deuda derivada | 2026-07-31 | ✅ (A.0–A.4) |
| 19 | Sincronización de la documentación con el código | 2026-07-31 | ✅ |
| 20 | Evaluación del portero: derivación propia en el motor | 2026-07-31 | ✅ |

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

## 17. Ronda `mejoras.pdf` (2026-07-25 → 2026-07-29)

El usuario mandó un PDF con ~25 hallazgos de uso real en producción. Resumen
por tema (commits en `main`, orden cronológico dentro de cada uno):

**Onboarding del jugador**
- Carta Bronce inicial (con datos base) para el jugador sin evaluación aún,
  en vez de un hueco vacío en el hub.
- Modal de bienvenida saltable (una vez por sesión) invitando a configurar
  foto/avatar.

**Fixes puntuales del PDF**
- Remoción de fondo (`@imgly/background-removal`) rota por CSP: causa real
  era que `unsafe-eval` se fija por DOCUMENTO en `/jugador/perfil`, y una
  navegación client-side (`<Link>`) no vuelve a pedir esa cabecera. Se agregó
  un auto-reparador: detecta `eval` bloqueado y fuerza una única recarga.
- Modo oscuro que "se resetea" al recargar: eran 4 hydration mismatches
  distintos (`NoticiasList`, `EvolutionChart`, `ListaAnuncios`,
  `UpcomingList`/`MonthGrid`) por formatear fechas con la zona horaria del
  servidor (UTC) en vez de la del navegador; `MonthGrid` además inicializaba
  estado con `new Date()` directo. El síntoma de "tema oscuro" era un efecto
  secundario de que React descartaba y remontaba el árbol al fallar la
  hidratación.
- Calendario: hoy/pasado/futuro no se distinguían en tema claro (opacidad
  sobre un fondo casi blanco no rinde contraste) — ahora cada estado tiene un
  fondo propio y mutuamente excluyente.
- Navegación "volver": auditoría completa de `dt/`, `jugador/`, `escuela/`,
  `admin/` — 3 pantallas sin ningún link de retorno (`dt/eventos/[id]`,
  `jugador/eventos/[id]`, `admin/escuelas/[id]`), corregidas con el mismo
  patrón `← Volver a X` ya usado en el resto del proyecto.
- Confirmar/rechazar convocatoria: el detalle de evento del jugador no
  dejaba cambiar la respuesta ya dada (`ProximoPartidoTile`/`UpcomingList` sí
  lo permitían) — se extrajo `CambiarRespuesta` a un componente compartido.
- Paginación, contraseñas, tab bar, sheen de carta, cámara, anuncios del DT:
  ronda anterior de fixes de esta misma serie (ver conversación/PRs de
  2026-07-25).

**Apartado Eventos** (rediseño completo)
- Estado unificado del evento (`estadoDeEvento()` en
  `src/lib/eventos/estado.ts`, puro): PROGRAMADO/EN_CURSO/FINALIZADO/CANCELADO,
  derivado de `cancelado`/`periodo`/`sesionCerradaAt`/fechas — antes cada
  consumidor lo inferís por su cuenta.
- Gating real: las estadísticas individuales de un partido ya no se muestran
  hasta EN_CURSO/FINALIZADO (antes bastaba con que existiera la fila, sin
  mirar si el partido había arrancado). Convocatoria y lista siguen visibles
  siempre.
- `editarEventoDt`/`cancelarEventoDt` validan en el servidor que el evento no
  esté ya cerrado/cancelado (antes solo se ocultaba el botón en la UI).
- Listado general de eventos (`/dt/eventos`, `/jugador/eventos`), paginado y
  con filtros de tipo/estado/rango de fechas — antes no existía ninguna
  pantalla de "todos los eventos", solo el calendario mensual.

**Entrenamiento dinámico**
- `crearEventoDt` convoca automáticamente a todo el plantel ACTIVO cuando el
  tipo es ENTRENAMIENTO (antes nunca convocaba a nadie ni notificaba a las
  familias). PARTIDO sigue siendo convocatoria manual.
- Modo Sesión (`obtenerSesionDt`) generaliza `usarConvocatoria` para no
  exigir que sea PARTIDO.
- Observaciones del DT (`ObservacionJugador`, campo `visiblePadre` que ya
  existía sin consumidor) ahora se muestran a la familia en el detalle del
  evento cuando están marcadas como visibles.

**Notificaciones**
- La campana quedaba congelada con lo que había al entrar a la sección
  (`PanelShell` vive en el `layout.tsx` de cada rol, que no se re-ejecuta al
  navegar entre páginas hijas): se agregó refresco por intervalo (60s) y al
  volver a la pestaña.
- Un lead nuevo no generaba ningún aviso interno para el súper admin — solo
  el correo (que además llegaba redirigido por `EMAIL_DEV_TO`). Se agregó
  notificación in-app (`NUEVO_LEAD`, prioridad alta) a todos los SUPER_ADMIN.
- Cron diario (`/api/cron/limpiar-notificaciones`, mismo patrón que
  `men-diario`) que borra notificaciones leídas con más de 7 días.
- Diagnóstico de correo confirmado con el usuario en producción:
  `enviarAvisoLeadEquipo` se omitía en silencio sin `EMAIL_EQUIPO`; al
  agregarla en Vercel + redeploy, el correo "Nuevo lead" empezó a llegar.
  Pendiente del lado del usuario: verificar dominio propio en Resend y sacar
  `EMAIL_DEV_TO` de producción para que cada correo llegue a su destinatario
  real (hoy todo se redirige a una sola casilla).

**Simulador de carta**
- El marco Héroe no se veía en el simulador salvo eligiendo el fondo
  "Leyenda" (mismo comportamiento que un jugador real, documentado en
  `PlayerCard.tsx`) — a pedido del usuario, en el simulador (no en jugadores
  reales) el marco Héroe ahora se ve automático al cruzar el umbral, porque
  el propósito de la herramienta es previsualizar cada nivel.
- Personalización completa agregada: nombre/apellido/dorsal editables +
  editor de avatar granular (se extrajo `AvatarPicker` de `AvatarEditor` para
  reutilizarlo sin duplicar el selector de peinado/ojos/cejas/boca/ropa/colores).

**Endurecimiento de validación (seguridad)**
- Dorsal: tope subido de 99 a 100, con clamp defensivo en el simulador
  (los atributos `min`/`max` de un `<input>` no bloquean valores pegados).
- `textoSeguro()` (ya existía, sanitiza HTML/scripts + límites de longitud)
  se aplicó a los campos de texto libre que seguían con `z.string()` plano:
  mensajes/anuncios (el mayor riesgo real — texto que se renderiza a otro
  usuario), eventos, catálogo de fondos/logros, escuela/categoría/sede/cancha,
  observaciones de evaluación, motivos de bloqueo/soporte (este último sin
  ningún límite de longitud antes).
- `publicarAnuncioAction` pasó de `Promise<void>` (cualquier error de
  validación caía al `error.tsx` genérico) al contrato `ActionResult` +
  `useActionState`, con el formulario de publicar anuncio extraído a
  `PublicarAnuncioForm` (compartido por DT y escuela).
- Hallazgo de Guardian Angel al revisar ese mismo fix: `publicarAnuncio` no
  validaba que la categoría elegida por un `ESCUELA_ADMIN` perteneciera a su
  propia escuela (el DT sí tenía ese chequeo) — un cruce de tenant real,
  corregido.

---

## 18. Giro a ERP — cobranza (2026-07-31)

Reorientación del producto: **Academia Elite pasa a posicionarse como el ERP de
las escuelas de fútbol**, con la carta gamificada como diferencial y no como
centro. La carta es el anzuelo de la familia; la administración es lo que el
dueño de la escuela compra. El plan anterior ("Modo Sesión de alto valor") tenía
3 de 4 tracks en experiencia DT/jugador; se reordenó poniendo la cobranza
primero. Mercado objetivo confirmado: **Colombia**.

**Diagnóstico que motivó el giro.** El módulo de dinero era `Membresia` con 6
campos y nada más: sin lista de precios, sin fecha/medio/comprobante de pago, y
con las cuotas cargadas **de a una** por formulario — 150 altas manuales por mes
para una escuela de 150 chicos.

**A.0 — Saneamiento del modelo de dinero** (migración `membresia_cobranza`)
- `Membresia.monto`: `Float` → `Decimal(12,2)`. La plata no se guarda en punto
  flotante. Se hizo con 15 filas en producción, cuando el cast era trivial.
- Campos nuevos: `pagadaEn`, `medioPago` (EFECTIVO/TRANSFERENCIA/NEQUI/
  DAVIPLATA/OTRO), `referenciaPago`, `descuento` (becas, hermanos) y `concepto`.
- El unique pasa de `(escuelaId, jugadorId, periodo)` a incluir `concepto`: una
  escuela cobra matrícula, indumentaria y torneos, no solo la mensualidad. Las
  filas existentes quedaron en `MENSUALIDAD`, así que la tupla ampliada siguió
  siendo única.
- `Decimal` de Prisma **nunca** sale hacia la UI: se convierte en el mapper del
  servicio. La conversión decide la ausencia sobre el valor original, no sobre el
  convertido — un monto de 0 (beca total) es legítimo y `0` es falsy.
- Marcar PAGADA abre un paso para medio + comprobante en vez de aplicarse de una;
  el export de cobranza suma **neto** (monto − descuento), no precio de lista.

**A.1 — Lista de precios** (migración `arancel`)
- Modelo `Arancel`: precio por categoría y concepto, con `vigenteDesde` y baja
  lógica. **Sin unique por (categoría, concepto) a propósito**: varias filas con
  distinta fecha son el historial de precios.
- `src/lib/aranceles.ts` — `resolverArancel` puro y testeado: gana el precio de
  la categoría sobre el general (`categoriaId = null`), y dentro del mismo
  alcance el `vigenteDesde` más reciente **ya vigente** (un aumento con fecha
  futura queda programado y no se aplica hasta entonces).
- Pantalla `/escuela/aranceles`, enlazada desde Membresías.

**A.2 — Generación masiva de la cobranza del mes**
- `generarCuotasDelPeriodo`: emite la cuota de todos los jugadores `ACTIVO` de un
  click. Un solo query de precios y resolución en memoria — no una consulta por
  categoría.
- Usa `createMany({ skipDuplicates })` y **no** un upsert: un upsert pisaría el
  monto y el estado de una cuota ya pagada. El unique hace el filtrado en la
  base, así que no hay ventana de carrera entre "ver qué falta" y "crear".
- Los jugadores sin precio vigente reciben la cuota **sin monto** y se informan
  aparte: preferible a inventar un número o a dejarlos fuera de la cobranza.
- La UI devuelve el detalle real ("137 creadas, 13 ya existían, 2 sin monto"), no
  un "listo" opaco sobre una operación que toca cientos de filas.

**Verificación.** `typecheck`/`lint` limpios, **215 tests** en verde (19 nuevos:
validadores de cobranza y resolución de precios). Smoke de idempotencia contra la
base real dentro de una transacción con `ROLLBACK`: 13 creadas en la primera
corrida, **0 en la segunda**, y una cuota marcada PAGADA sobrevivió a la
regeneración con su estado y su monto intactos.

**Decisiones de producto tomadas en esta ronda** (detalle en `DECISIONES.md`):
countdown de sesión **cortado**; `Jugador.vigenciaHasta` manual **descartado** en
favor de estado de cuenta derivado; Track P (puntos en sesión) bloqueado hasta
resolver la contradicción con la tesis de la carta.

## 19. Sincronización de la documentación (2026-07-31)

La documentación había quedado atrás del código y varios documentos afirmaban
cosas **falsas**. Auditoría y corrección completa, contrastando cada afirmación
contra el repo y la base:

- **`CURVA-DE-DESARROLLO.md`** decía en su encabezado *"Estado: diseño /
  propuesta (**no implementado**)"* y marcaba como "a construir" el crecimiento
  diario y el decaimiento. **La etapa 1 estaba construida y corriendo en
  producción** (`src/lib/curva.ts`, `curva.service.ts`, cron `men-diario`). Se
  reescribió con una tabla de estado real por pieza, los parámetros vigentes, las
  decisiones que quedaron cerradas y las que faltan cerrar para la etapa 2.
- **`HABEAS-DATA.md`** — el peor lugar para una afirmación falsa. Su checklist
  daba por **pendientes** la autorización en el registro, la política publicada y
  **RLS**, las tres ya implementadas (`User.terminosAceptadosEn` + `terminosVersion`,
  `/legal` enlazada desde el footer y el registro, RLS en todas las tablas).
- **`SEGURIDAD.md`** listaba RLS, Upstash y los emails transaccionales como
  "pendiente Fase 2" cuando los tres están en producción desde el Sprint 8;
  seguía diciendo "carga masiva por CSV" (es XLSX desde M.1) y no mencionaba la
  cobranza, el Modo Sesión ni las sesiones de soporte del SUPER_ADMIN.
- **`ESTADO-DEL-PROYECTO.md`** venía del 2026-07-24 con conteos viejos (30
  modelos → **36**, 7 migraciones → **12**, 171 tests → **248**), con el Sprint 8
  como "próximo" estando terminado y con "pagos/facturación" fuera de alcance.
- **`PENDIENTES.md`** listaba como pendientes A.3, A.4 y el `"es-AR"` suelto, ya
  hechos en el hito 18.
- **`MANUAL-DE-USO.md`** describía Membresías como una tabla de estados, sin la
  lista de precios, la generación masiva ni el registro del pago.
- **`README.md`** no reflejaba el posicionamiento como ERP.

**Regla que se estaba incumpliendo** (AGENTS.md §8): la doc se actualiza en la
misma ronda que el código, no cada tanto. Una doc que miente es peor que una que
falta: manda a construir lo que ya existe.

## 20. Evaluación del portero (2026-07-31)

**El problema.** Lo único específico de un arquero en todo el código era **una
fila** de `PESOS_POSICION`. Las cuatro notas técnicas seguían siendo control,
pase, tiro y regate — habilidades de jugador de campo — y ninguna medía blocaje,
achique, juego aéreo ni distribución. Peor: el **DEF** del arquero, su stat de
mayor peso (0.35), se calculaba con
`resistencia Yo-Yo × 0.45 + salto × 0.30 + control × 0.25`.

La app aparentaba evaluar arqueros y en realidad los medía con la vara de un
delantero.

**Qué se hizo** (detalle y porqués en `DECISIONES.md` §58-62):
- `src/lib/medidas-tecnicas.ts` (nuevo): las mismas cuatro columnas de
  `Evaluacion` se reetiquetan según la posición. Para POR: blocaje/atajada,
  distribución/saque, juego aéreo, achique y 1v1. **Sin cambio de schema.**
- `derivaStatsPortero` en `weights.ts`: derivación propia, cada fila suma 1.0. El
  DEF pasa a `blocaje × 0.50 + agilidad × 0.25 + aéreo × 0.25`; el RIT prioriza
  agilidad sobre velocidad; el FIS se mide igual que en campo.
- `compute.ts` elige la derivación con `derivaStatsPorPosicion(norm, posicion)`.
- `EvaluationForm` pide lo que corresponde según la posición del jugador, con el
  título del bloque y las ayudas cambiadas.
- `plantilla-simulador.service.ts` ramifica las fórmulas del Excel con
  `IF($B{fila}="POR", …)`: esa planilla **replica el motor a mano**, y sin
  ramificarla habría mostrado un OVR distinto al real para cada arquero.

**Verificación.** 12 tests nuevos (`tests/unit/portero.test.ts`), incluidos dos
que fijan el defecto y su arreglo: con la fórmula de arquero, subir la resistencia
Yo-Yo **ya no mueve** el DEF, y subir el blocaje sí; con la de campo, el Yo-Yo lo
movía. `typecheck` y `lint` limpios, **260 tests** en verde.

**Nota operativa.** Los **8 arqueros** que ya tenían carta conservan sus números
viejos: las evaluaciones son inmutables y no se hace migración de datos.
Se corrigen solos en la próxima jornada de medición.

---

## Observaciones abiertas (no bloquean, registradas para no perderlas)

> Sin observaciones abiertas. La de `auth.ts` (mover el provider Credentials a
> `buscarCredencialesPorEmail`) ya está resuelta en código (`src/auth.ts` usa el
> repositorio). Las de CSP (`cdn.jsdelivr.net`) y extender credenciales por link
> se resolvieron o se movieron a `PENDIENTES.md`. Este archivo registra lo hecho,
> no lo que falta.
