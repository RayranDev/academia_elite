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
| 21 | Limpieza de riesgo: auditoría de `importarJugadores` + fechas de servidor a `FechaLocal` | 2026-08-01 | ✅ |
| 22 | Badge de deuda por jugador (`escuela/jugadores` + ficha del DT, sin monto) | 2026-08-01 | ✅ |
| 23 | Ficha administrativa y médica (datos sensibles de salud) | 2026-08-01 | ✅ |
| 24 | KPI de aptos médicos vencidos + export de contactos de emergencia | 2026-08-04 | ✅ |
| 25 | Localización a Colombia: voseo → tuteo neutro (27 archivos) + 3 fixes de `FechaLocal` | 2026-08-04 | ✅ |
| 26 | Caja / egresos: modelo `Egreso`, caja neta del mes contra la cobranza pagada | 2026-08-04 | ✅ |
| 27 | Guardián de tenant: cobertura de `create`/`createMany` y de llamadas `tx.` en transacciones | 2026-08-04 | ✅ |
| 28 | Planilla del simulador: layout de la hoja Parametros derivado, no hardcodeado | 2026-08-04 | ✅ |
| 29 | Aranceles: editar, evitar duplicados con aviso, descripción libre, navegación | 2026-08-04 | ✅ |
| 30 | Membresías operativas: paginación, filtro por período/jugador, export conectado | 2026-08-04 | ✅ |
| 31 | Bloqueo por mora: atajo directo desde una cuota vencida + acción masiva de morosos | 2026-08-04 | ✅ |
| 32 | Eventos: ejecución solo el día programado (con aviso), duración en vez de hora fin, se saca "minutos jugados" | 2026-08-05 | ✅ |
| 33 | Fix de 2 specs e2e rotos (registro sin confirmar contraseña, aviso importante tapando "Confirmar") | 2026-08-05 | ✅ |
| 34 | Motivo de soporte: se mantienen los dos patrones a propósito, no se unifican | 2026-08-05 | ✅ |
| 35 | Guardián de tenant: extendido a `src/services/*.service.ts` (antes solo repositories) | 2026-08-05 | ✅ |
| 36 | Filtro `?bloqueado=1` en Jugadores: link muerto del KPI "Familias bloqueadas" ahora funciona | 2026-08-05 | ✅ |
| 37 | Descuentos con regla: reglas de descuento reusables (Hermano, Beca) aplicadas solas al generar la cobranza | 2026-08-05 | ✅ |
| 38 | Acceso parcial del jugador bloqueado: solo mensajes con el DT, resto del panel sigue bloqueado | 2026-08-05 | ✅ |
| 39 | Perfil del DT con estadísticas: evaluaciones, resultados de partidos y plantilla pendiente | 2026-08-05 | ✅ |
| 40 | Staff más allá del DT: registro administrativo del cuerpo técnico (coordinador, preparador físico, utilero), sin rol nuevo | 2026-08-06 | ✅ |
| 41 | Curva etapa 2 (parte 1/4): Rendimiento → progreso — goles/asistencias/rojas empiezan a mover el MEN | 2026-08-06 | ✅ |
| 42 | Curva etapa 2 (parte 2/4): vista de seguimiento del DT — desglose de MEN por jugador dentro de `/dt/perfil` | 2026-08-06 | ✅ |
| 43 | Curva etapa 2 (parte 3/4): línea de proyección punteada en el hub del jugador | 2026-08-06 | ✅ |
| 44 | Curva etapa 2 (parte 4/4, última): pesos de la curva overrideables por escuela — cierra el paquete "Progresión etapa 2" | 2026-08-06 | ✅ |

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

## 21. Limpieza de riesgo (2026-08-01)

Dos ítems chicos de `PENDIENTES.md`, cerrados juntos por ser mecánicos y de bajo
riesgo.

**`importarJugadores` — la auditoría ya no se salteaba.** Mismo defecto que se
había corregido en `importacion-evaluaciones.service.ts` (hito 20): el `throw`
por exceso de filas estaba **dentro** del loop, así que salía sin pasar por
`registrarAuditoria`. Con hasta 500 jugadores creados antes del corte, quedaba
la escritura más grande sin ninguna entrada de auditoría. Se movió la validación
de `filas.length` antes del loop, mismo patrón ya usado en el hermano.

**Fechas de servidor → `FechaLocal`.** Cinco Server Components seguían formateando
fechas con `toLocaleDateString("es")`/`toLocaleString("es")` en el servidor:
`jugador/page.tsx`, `admin/page.tsx`, `dt/solicitudes/page.tsx`,
`escuela/codigos/page.tsx`, `admin/auditoria/page.tsx`. El SSR corre en UTC
(Vercel) y Colombia es UTC-5, así que una fecha de la tarde se mostraba con el
día siguiente. Se reemplazaron por `<FechaLocal iso={…} formato="…" />`, que
formatea en cliente. Se confirmó primero que los cinco campos ya llegaban como
`string` ISO desde sus DTOs (`.toISOString()` en el servicio) — sin conversión
de tipos, solo el componente de render.

**`importarJugadores` — el mismo acceso ambiental que ya se había cerrado en su
hermano.** Detectado por la revisión al aplicar el fix anterior: `escuelaObjetivo`
tenía `assertTenant`, pero no `assertSoportePuedeEscribir` ni
`assertMotivoSoporte`. Una sesión de soporte en **solo lectura** podía crear
hasta 500 jugadores en el tenant, y el `AuditLog` solo guardaba conteos, nunca
el motivo. Mismo patrón que `importacion-evaluaciones.service.ts` (hito 18):
`motivo` pedido en `ImportarJugadoresDialog` (solo con `escuelaId`, es decir
solo al SA), sanitizado con `textoSeguro({ max: 200 })`, encabezando el `motivo`
del `AuditLog`.

Verificación: `typecheck`/`lint`/`test` limpios, 263 tests en verde (sin tests
nuevos: `importarJugadores` no tiene infraestructura de mocks para Prisma en
este repo, mismo criterio que su hermano; las fechas son reemplazo mecánico de
componente ya probado).

## 22. Badge de deuda por jugador (2026-08-01)

`estadoCuenta` (hito 18) ya alimentaba el agregado del dashboard
(`resumenMembresias`); faltaba verlo al lado de cada jugador en la lista de
gestión.

- `cuotasImpagasDeJugadores(escuelaId, jugadorIds)` (nuevo repo): mismo shape
  que `cuotasImpagas`, pero acotado a los IDs de la página actual (20, no toda
  la escuela) — evita traer el tenant completo para pintar una lista paginada.
- `JugadorGestionDTO` gana `enMora`/`montoVencido`. Se completan **después**
  de mapear las filas (`aDTO` no tiene las cuotas a mano) con una segunda
  consulta agrupada por jugador, mismo patrón de `resumenMembresias`.
- **La deuda solo se calcula para `ESCUELA_ADMIN`.** Se verificó primero que
  ningún servicio de `membresia.service.ts` es accesible para el SUPER_ADMIN,
  ni con sesión de soporte activa (comentario explícito en `resumenMembresias`:
  "el SUPER_ADMIN no tiene acceso ambiental al tenant"). Exponer mora en el
  panel del SA habría cruzado esa frontera ya decidida; para SA, `enMora`
  queda en `false` por defecto y la consulta ni se ejecuta.
- Badge `Debe {monto}` en `JugadoresGestion.tsx`, con `formatearMonto` (ya
  existente en `src/lib/cobranza.ts`).
- Verificado contra la base real (solo lectura): 10 cuotas impagas sobre 13
  jugadores de la escuela demo, mezcla `PENDIENTE`/`VENCIDA`.

**La ficha del DT — resuelto con el usuario, sin monto.** Se preguntó
explícitamente antes de construirlo: el DT ve *que* una familia tiene pagos
pendientes (contexto social), **nunca la cifra**. `jugador.service.ts` no
importa `membresia.service.ts` — llama directo al repositorio
(`cuotasImpagasDeJugadores`) y a la función pura `estadoCuenta`, bajo el
guard de tenant+categoría que la ficha del DT ya tenía
(`categoriasDelDt`). `estaEnMora` pasa `monto: null` a propósito: `enMora`
no depende del monto, así que ni hace falta convertir el `Decimal`.
Detalle de la decisión en `DECISIONES.md` §64-65.

Verificación: `typecheck`/`lint` limpios, 263 tests en verde (sin test nuevo
para la consulta agregada — mismo criterio que `resumenMembresias`, que
tampoco lo tiene; `estadoCuenta`, la función pura que hace el cálculo, ya
está cubierta en `tests/unit/cobranza.test.ts`). `estaEnMora` se corrió con
`tsx` contra la base real con un jugador conocido en mora (`true`) y uno sin
deuda (`false`).

## 23. Ficha administrativa y médica (2026-08-01)

Primer ítem "Grande" del ERP: datos sensibles de salud de menores
(`DECISIONES.md` §66-72, `HABEAS-DATA.md` actualizado en el mismo cambio que
el schema — antes, no después).

**Schema** (13 columnas nuevas en `Jugador`, todas opcionales): `tipoDocumento`,
`numeroDocumento`, `autorizaDatosSalud` + `autorizacionDatosSaludEn`
(consentimiento específico, mismo patrón que `consentimientoFoto`), `eps`,
`rh`, `alergias`, `condicionesMedicas`, `aptoMedicoVence`,
`contactoEmergenciaNombre/Telefono/Parentesco`, `autorizaTraslado`. Migración
aplicada a producción (27 filas en `Jugador`, `ADD COLUMN` puro, sin romper
código desplegado).

**Consentimiento más estricto que el de fotos.** La foto solo gatea su
*exhibición*; los datos de salud gatean también su *guardado* —
`actualizarFichaMedica` descarta `eps`/`rh`/`alergias`/`condicionesMedicas`/
`aptoMedicoVence` si `autorizaDatosSalud` viene en `false`, sin importar lo
que llegue. Verificado contra la base real con una transacción con
`ROLLBACK`: sin consentimiento esos campos quedan `null`; con consentimiento
se guardan y `autorizacionDatosSaludEn` se sella. El contacto de emergencia y
el documento NO son datos de salud — no dependen de este consentimiento.

**Acceso por rol:** `ESCUELA_ADMIN`/`SUPER_ADMIN` ven la ficha completa
(auditada en `AuditLog`, `LEER_FICHA_MEDICA`/`EDITAR_FICHA_MEDICA`); el DT ve
solo contacto de emergencia, autorización de traslado, alergias y apto
médico — nunca documento ni EPS. La vista del DT NO se audita por consulta
(mismo criterio que `enMora`, hito 22): es contexto incidental de una página
que se abre decenas de veces por sesión.

**UI:** modal en `escuela/jugadores` (no página — el proxy asigna un rol fijo
por prefijo de ruta y este componente se comparte con `/admin/escuelas/[id]`
para el SA; una página bajo `/escuela` no habría sido alcanzable para el SA
sin duplicarla). La ficha se trae **on-demand** al abrir el modal
(`obtenerFichaMedicaAction`), no precargada con la lista paginada — evita
auditar 20 lecturas por cada carga de la página. Primer uso en el repo de una
Server Action de **lectura** bajo demanda desde un cliente.

En la ficha del DT, sección "Emergencia" nueva en `dt/jugadores/[id]`, con
badge de apto médico vencido si corresponde.

Verificación: `typecheck`/`lint` limpios, 272 tests en verde (9 nuevos para
el validador). En el commit original no había navegador disponible en el
entorno; se verificó entonces (a) la regla de consentimiento contra la base
real con rollback, y (b) que las páginas `/escuela/jugadores` y
`/dt/jugadores/[id]` renderizan sin error del lado del servidor con sesión
real. Con `chrome-devtools` MCP agregado después, se probó el flujo completo
de punta a punta contra la escuela demo: login `escuela@demo.app`, botón
"Ficha" abre el modal con fetch on-demand, el checkbox de autorización
habilita/deshabilita EPS/RH/apto médico/alergias/condiciones en vivo, guardar
persiste y se confirma reabriendo la ficha, cero errores de consola. Datos
del jugador de prueba restaurados a su estado original al terminar.

## 24. KPI de aptos médicos vencidos + export de contactos de emergencia (2026-08-04)

Los dos ítems chicos que quedaron colgando del hito 23.

**KPI.** `contarAptosMedicosVencidos` (repositorio, nuevo): cuenta jugadores
`ACTIVO` con `autorizaDatosSalud: true` y `aptoMedicoVence` en el pasado — el
consentimiento vigente es parte de la condición, no solo el vencimiento, para
no contar fichas que nunca se autorizaron a guardar la fecha. Servicio
`contarAptosMedicosVencidosEscuela` en `gestion-jugadores.service.ts`: conteo
agregado, no expone fichas individuales, mismo criterio que `enMora` (hito
22) — no se audita por consulta. Tile nuevo en la sección "Administración"
del dashboard de escuela, sin `href`: hoy `/escuela/jugadores` no tiene un
filtro por vencimiento de apto médico, así que no hay a dónde navegar
todavía (quedaría para cuando se necesite).

**Export.** `export-contactos.service.ts` suma tres columnas (contacto de
emergencia, parentesco, teléfono) leyendo directo de `listarJugadoresGestion`,
que ya trae esos campos por `include`. Sin lógica de consentimiento nueva: el
contacto de emergencia no es dato de salud (DECISIONES.md §67), así que no
depende de `autorizaDatosSalud`.

Verificación: `typecheck`/`lint`/`test` limpios (272 tests, sin casos nuevos —
son un conteo Prisma envuelto en guards y tres columnas de export, sin lógica
propia que amerite un test unitario). Sin smoke manual en browser para este
incremento puntual.

## 25. Localización a Colombia: voseo → tuteo neutro (2026-08-04)

El estimado viejo de "~18 archivos" con voseo rioplatense se auditó de
nuevo desde cero (el plan original ya no existe en el repo, por convención
de este doc) y resultó en **27 archivos** genuinos: 26 de copy de
UI/acciones/servicios + `src/lib/email/plantillas.ts` aparte. Reemplazo
contextual (no mecánico): "tenés/podés/vos/guardá" → "tienes/puedes/tú/
guarda", con atención a la acentuación en formas con enclítico
("avisanos" → "avísanos", "ignoralo" → "ignóralo", no solo cambiar la
desinencia). `plantillas.ts` se revisó con más cuidado por ser email
transaccional (un error ahí no se corrige con un redeploy): 7 funciones
corregidas en sus tres variantes (subject/html/text); `confirmacionLead` y
`avisoLeadEquipo` ya estaban en tuteo neutro, no se tocaron.

De paso, el mismo barrido encontró 3 violaciones de la regla `FechaLocal`
(AGENTS.md §6) sin relación con el voseo: `ThreadView.tsx` formateaba con
`toLocaleString` (con hora) directo en un Server Component — bug real de
desfase horario UTC-5/hydration, no solo de tono. `ThreadList.tsx` y
`ObjetivosList.tsx` mismo patrón con `toLocaleDateString` (solo fecha,
menor severidad). Los tres migrados a `<FechaLocal>`; el dato de origen ya
era string ISO en los tres DTOs, sin conversión adicional.

Se confirmó además que el `"es-AR"` suelto que el plan viejo señalaba como
pendiente **ya se había corregido** en una sesión anterior (queda solo un
comentario en `escuela/page.tsx` documentando el fix).

Verificación: `typecheck`/`lint`/`test` limpios (272 tests). Sin smoke en
browser para este lote — es texto más un fix de formateo ya cubierto por el
patrón `FechaLocal` existente.

## 26. Caja / egresos (2026-08-04)

Cierra el módulo de dinero: hasta acá solo se modelaba lo que entra
(`Membresia`, Track A). Modelo nuevo `Egreso` (tabla propia con relación
Prisma a `Escuela`, a diferencia de `Membresia` que filtra a mano): `monto`
**obligatorio** (un egreso sin monto no es un gasto, al revés de la cuota que
puede crearse sin precio resuelto), `fecha` del gasto separada de `createdAt`
(cuándo se cargó el registro) para que la caja del período ubique el gasto en
su fecha real aunque se cargue tarde. Concepto cerrado: `CANCHA`, `ARBITRO`,
`INDUMENTARIA`, `TRANSPORTE`, `MANTENIMIENTO`, `SUELDOS`, `OTRO` — decisión de
producto validada con el usuario antes de escribir código. Sin edición de
campos (solo crear/eliminar, igual que `Membresia`) y **sin acceso de
`SUPER_ADMIN`**: es una herramienta interna de la escuela, mismo alcance que
`membresia.service.ts` completo, así que no hereda la inconsistencia del
patrón de motivo de soporte (`DECISIONES.md` §72) — no hay SA en la ecuación.

**Caja neta**: `sumaIngresosDelPeriodo` (nueva, en `membresia.repository.ts`)
suma `monto − descuento` de cuotas `PAGADA` por **`pagadaEn`**, no por
`periodo` — son conceptos distintos: `periodo` es el mes que la cuota
factura, `pagadaEn` es cuándo entró la plata de verdad, y una caja de flujo
real tiene que mirar lo segundo. `resumenCaja` en `egreso.service.ts` combina
esa suma con `sumaEgresosDelPeriodo` del mismo rango. Dos KPIs nuevos en el
dashboard de escuela: "Egresos del mes" y "Caja neta del mes" (con alerta si
da negativo).

**Hallazgo corregido en la misma sesión, más tarde ese día**: al verificar
`sumaIngresosDelPeriodo` contra la base real, las membresías `PAGADA` de la
escuela demo curada tenían `pagadaEn: null` — el seed
(`prisma/seed-academia-elite.ts`) las crea directo por Prisma sin pasar por
`cambiarEstadoMembresiaEscuela`, así que nunca sellaba esa fecha. Efecto:
"Caja neta del mes" daba siempre $0 de ingresos en la demo. Dos partes del
arreglo:

1. **Script fuente**: el `map`/`push` que arma las `Membresia` del seed ahora
   sella `pagadaEn` (acotado a `[inicioDeMes, ahora]`, nunca en el futuro) y
   `medioPago` cuando `estado === "PAGADA"`; las `VENCIDA` quedan explícitas
   en `null`/`null`. Corrige cualquier `db:reset` futuro.
2. **Datos ya en producción**: `npm run db:seed` **borra toda la base**
   (`seed.ts` §"Idempotente: limpia y recrea... solo entorno local") — correrlo
   contra producción habría sido destructivo. En su lugar, un script puntual
   (`npx tsx`, no commiteado) hizo `update` fila por fila **solo** sobre las 5
   `Membresia` `PAGADA` de `elite-escuela` con `pagadaEn: null` (encontradas
   primero en modo lectura, sin tocar nada), replicando la misma lógica de
   fecha del seed corregido. Verificado después: `sumaIngresosDelPeriodo` pasó
   de `0` a `225000` para el período actual.

Implementación delegada a un sub-agente con el plan aprobado como instrucción
exacta (patrón ya usado en este mismo día para ficha médica y tuteo neutro);
revisión de diff, migración a producción y smoke test contra la base real con
`ROLLBACK` hechos directamente, sin delegar, por tratarse de una migración de
schema y datos de dinero. Verificación: `typecheck`/`lint`/`test` limpios (281
tests, 9 nuevos). Migración `20260804120000_egreso` aplicada a producción
(`CREATE TABLE` puro, sin tocar tablas existentes). Smoke test con
transacción y `ROLLBACK`: confirmó que `sumaEgresosDelPeriodo` acota
correctamente por mes (dos egresos en meses distintos, la suma del período
solo cuenta el que corresponde), sin dejar datos de prueba persistidos.

## 27. Guardián de tenant: cobertura de `create`/`createMany` y `tx.` (2026-08-04)

Primer ítem del paquete "Riesgo de plataforma". El test guardián
(`tests/unit/aislamiento-tenant.test.ts`) solo cubría métodos con `where`
(`find*`, `update*`, `delete*`, `count`, `aggregate`, `groupBy`, `upsert`) y
solo llamadas `db.`, nunca `tx.` — dentro de un `db.$transaction(async (tx)
=> ...)` cualquier query quedaba invisible para el guardián, sin importar el
método.

Antes de tocar el test se auditaron a mano los ~30 `create`/`createMany` de
`src/repositories/` contra el schema: de los modelos-tenant (con
`escuelaId`), todos menos uno ya pasaban `escuelaId` explícito en el bloque
`data`. La única excepción real: `crearProgresoSemana`
(`progreso.repository.ts`) recibía `data: CrearProgresoInput` completo y lo
pasaba opaco (`create({ data })`) — type-safe (la interfaz exige
`escuelaId`), pero invisible para un chequeo estático de texto. Se
desestructuró `escuelaId` explícito en la firma, mismo patrón ya usado en
el resto de los repos (`categoria`, `codigo`, `arancel`, `evento`,
`objetivo`, `egreso`, `jugador`).

Dos hallazgos que **no** eran huecos reales, a pesar de estar mencionados en
el ítem original de `PENDIENTES.md`: `notificacion` y `jugadorConvocado` no
tienen columna `escuelaId` en el schema (se acotan por relación —
`userId`/`eventoId`), así que nunca estuvieron dentro del alcance de este
guardián en particular; no había nada que arreglar ahí.

Implementación: `METODOS` suma `create|createMany`; una función nueva
`tenantEnData` (análoga a `tenantFiltrado` pero mirando `data:` en vez de
`where:`, porque Prisma no acepta `where` en un create) decide si el bloque
de escritura es seguro; el regex de detección pasa de `db\.` a
`(?:db|tx)\.`. Se auditaron a mano los `tx.` ya existentes en transacciones
(`evento.repository.ts`, `registro.repository.ts`, `escuela.repository.ts`)
para confirmar que ya estaban bien filtrados o anotados — cero sorpresas al
correr el test extendido.

Verificación: además de `typecheck`/`lint`/`test` (281 tests), se probó el
guardián con un caso negativo deliberado (un archivo temporal
`scratch-negativo.repository.ts` con un `create` sin `escuelaId`) para
confirmar que SÍ lo atrapa, con archivo y línea exactos en el mensaje de
falla — no alcanza con que la suite quede en verde, hay que ver al guardián
fallar antes de confiar en que funciona. Archivo de prueba borrado después.

## 28. Planilla del simulador: layout derivado (2026-08-04)

Segundo y último ítem de código puro del paquete "Riesgo de plataforma"
(el resto — Auth, backups, observabilidad, CI — quedó diferido a producción
100%, `DECISIONES.md` §74). `plantilla-simulador.service.ts` escribía la
hoja "Parametros" del Excel con `GRUPOS.forEach`/`POSICIONES.forEach`, pero
las fórmulas de la hoja "Jugadores" apuntaban a rangos **literales**
(`Parametros!$A$2:$A$6`, `$A$10:$A$13`, escalares en `$B$16..$B$19`). Sumar
un `GrupoEdad` o una `Posicion` nueva compilaba igual y la planilla generada
quedaba mal en silencio — mismo modo de falla que ya se había cerrado para
`COLUMNA_MEDIDA` en el mismo archivo.

Fix: el layout completo (dónde empieza cada bloque — grupos, título de
posiciones, cabecera, posiciones, escalares) se extrajo a un módulo nuevo,
puro y sin Prisma: `src/lib/plantilla-simulador-layout.ts` (mismo principio
que `stats-engine`/`cobranza.ts` — testeable sin `db`). Cada bloque se
calcula 2 filas después de que termina el anterior (fila en blanco +
encabezado); con los arrays de hoy (5 grupos, 4 posiciones) da exactamente
el layout de siempre (grupos 2-6, posiciones 10-13, escalares 16-19) — cero
cambio de comportamiento, solo deja de estar hardcodeado.

Se intentó primero un test que importaba directo del servicio, y falló: el
servicio importa (transitivamente) `@/lib/db`, que instancia el cliente
Prisma en el import y explota sin `DATABASE_URL` en el entorno de test. Es
la razón real por la que el layout se separó a `src/lib/` en vez de solo
exportar las constantes desde el servicio — no es una preferencia de
organización, es lo que lo hace testeable sin base de datos.

Verificación: `tests/unit/plantilla-simulador.test.ts` (4 tests nuevos)
fija tanto la relación derivada (ancho de rango = longitud del array, cada
bloque a +2 filas del anterior) como el layout numérico concreto de hoy —
si alguien rompe cualquiera de las dos cosas, falla acá y no en un Excel
generado en silencio. `typecheck`/`lint`/`test` limpios (285 tests). Sin
smoke de generación real del `.xlsx` (requiere una sesión SUPER_ADMIN
autenticada contra la base real) — se confirmó por lectura cuidadosa que
cada referencia migró a la constante derivada correspondiente.

## 29. Aranceles: cerrar el ciclo de precios (2026-08-04)

Cuatro gaps reportados en uso real y verificados contra el código antes de
tocar nada (`arancel.repository.ts`, `arancel.service.ts`,
`validators/arancel.ts`, `ArancelesPanel.tsx`).

**Editar.** `actualizarArancel` nueva en el repo (`updateMany` acotado por
`escuelaId`, mismo patrón que `desactivarArancel`); `editarArancelEscuela`
en el service (valida la categoría del tenant, igual que crear; audita
`"ARANCEL_EDITAR"`); `EditarArancelModal.tsx` nuevo, mismo patrón
Modal+form+`useActionState` que `FichaMedicaModal`/`JugadorBloqueoModal` —
a diferencia de la ficha médica, acá no hace falta fetch on-demand: el
`ArancelDTO` de la fila ya trae todo, no es un dato sensible.

**Duplicados con aviso, no bloqueo ciego.** A propósito el modelo `Arancel`
sigue sin `@@unique` por (categoría, concepto) — varias filas con distinto
`vigenteDesde` son historial de precios, un unique lo rompería. La detección
del duplicado quedó del lado del **cliente**: `ArancelesPanel.tsx` ya tiene
la lista completa de aranceles como prop, así que antes de enviar el alta
busca localmente si hay uno activo con la misma categoría+concepto y, si lo
hay, `window.confirm(...)` con el monto y la fecha del que se va a reemplazar
— si cancela, no se envía nada. Si confirma, viaja un `reemplazarId` oculto
en el `FormData`. El servicio, al recibir `reemplazarId`, abre una
transacción (`db.$transaction`, `tx.arancel.updateMany` + `tx.arancel.create`
directo desde el service — patrón ya existente en `entrenador.service.ts`,
no una desviación nueva) que desactiva el viejo y crea el nuevo, auditando
las dos acciones por separado.

**Descripción libre**, sobre todo para el concepto `OTRO`: columna nueva
(`descripcion String?`, migración `20260804130000_arancel_descripcion`, pura
`ALTER TABLE`, sin bloque RLS — no crea tabla, `Arancel` ya la tiene) con
`textoSeguro()` en el validador.

**Navegación**: "Precios" sumado al `NAV` de `src/app/escuela/layout.tsx`
(ícono `Tag` nuevo en `Sidebar.tsx`), resolviendo el reclamo de "no hay forma
de volver" — la ruta ahora vive en el sidebar como cualquier otra.

**Hallazgo colateral, no corregido acá** (anotado en `PENDIENTES.md`): el
guardián de tenant extendido en el hito 27 solo escanea
`src/repositories/*.repository.ts`. El `db.$transaction` de
`arancel.service.ts` (igual que el ya existente en `entrenador.service.ts`)
queda fuera de ese barrido — hoy está bien escrito, pero el guardián no lo
vería si algún día no lo estuviera.

Implementación delegada a un sub-agente con el plan ya diseñado como
instrucción exacta; ese mismo sub-agente hizo una segunda pasada de
revisión propia antes de entregar. Revisión de diff, migración a producción
y smoke test contra la base real con `ROLLBACK` (probó el flujo completo de
reemplazo: crear, desactivar+crear en transacción, confirmar que el viejo
queda inactivo y la columna `descripcion` persiste) hechos directamente, sin
delegar. Se sumaron 4 tests a `tests/unit/aranceles.test.ts` (descripción
sanitizada, `editarArancelSchema` exige `id`) — el sub-agente no los había
escrito. `typecheck`/`lint`/`test` limpios (289 tests).

## 30. Membresías operativas (2026-08-04)

Tres gaps reportados en uso real, sobre las cobranzas acumulándose:
paginación, filtro por período/jugador, export desconectado del filtro.

**El problema de fondo, no solo "agregar paginación".** El `estado` que ve
el usuario es DERIVADO (`estadoEfectivo` en `cobranza.ts`): una cuota
`PENDIENTE` cuyo período ya cerró se muestra como "Vencida" sin que nadie la
haya marcado (A.3). Un `where: { estado: "VENCIDA" }` literal en la base
habría mostrado de menos justo el filtro que la escuela usa para cobrar —
una regresión real, no solo un detalle. Se resolvió con una función pura
nueva, `condicionEstadoEfectivo(estado, periodoActual)` en `cobranza.ts`,
que traduce el estado derivado a la condición real equivalente (`PAGADA`
directo; `VENCIDA` = guardada `VENCIDA` **o** `PENDIENTE` con período
cerrado; `PENDIENTE` = guardada `PENDIENTE` con período todavía abierto).
Testeada con un verificador cruzado: para una tabla de filas de prueba,
filtrar "a mano" por la condición tiene que dar exactamente el mismo
subconjunto que filtrar llamando a `estadoEfectivo` fila por fila — si las
dos lógicas alguna vez divergen, el test lo detecta.

**Repositorio**: `listarMembresias`/`contarMembresias` arman el `where` como
un `AND` explícito (`condicionesMembresia`, helper compartido), no un spread
de objetos — un spread habría dejado que el `periodo: { lt: ... }` de
`condicionEstadoEfectivo("VENCIDA", ...)` pisara un filtro de `periodo`
exacto si el usuario combina ambos al mismo tiempo (período + pestaña
Vencida). Mismo shape que `PaginatedJugadoresDTO`/`Paginacion` ya
existentes — reusado tal cual, no se inventó un componente de paginación
nuevo.

**Contadores de las pestañas** (`contarMembresiasPorPestana`, nueva):
4 counts en paralelo (Todas/Pendiente/Pagada/Vencida), independientes de
cuál pestaña está activa, respetando el período/jugador filtrado — ya no se
calculan filtrando en memoria un array que ahora es solo una página parcial.

**Filtro de jugador** (`FiltroJugadorMembresias.tsx`, nuevo): mismo patrón
de búsqueda-mientras-escribís que `ComboboxJugador`, pero navega
(`router.push`) en vez de setear un campo de formulario — reusa la lista de
jugadores que la página ya cargaba para el combobox de alta, sin fetch
nuevo. Cambiar cualquier filtro (pestaña, período, jugador) resetea `page`
a 1; las pestañas de estado preservan período/jugador activos.

**Export**: el link de "Descargar cobranza" arma su querystring con
`estado`/`periodo` activos (el backend ya los soportaba, solo faltaba
conectar la UI). `jugadorId` queda fuera del export a propósito — el
backend no lo soporta y no era parte del alcance de este paquete.

Implementación delegada a un sub-agente con el plan (incluida la traducción
`condicionEstadoEfectivo`) como instrucción exacta. Revisión de diff propia,
más un chequeo de solo lectura contra la base real (`elite-escuela`): los 3
contadores de estado suman exacto el total (68 = 52+6+10), y `take` limita
la paginación correctamente. Sin mutaciones, no hizo falta `ROLLBACK`.
`typecheck`/`lint`/`test` limpios (293 tests, 4 nuevos para
`condicionEstadoEfectivo`).

## 31. Bloqueo por mora: acción directa y masiva (2026-08-04)

El usuario lo marcó explícitamente como "corrección grande" al usar la app.
Hasta acá el bloqueo por falta de pago (`bloqueo.service.ts`) funcionaba
de a un jugador por vez, alcanzable solo desde su ficha — nada conectaba
la lista de cuotas vencidas ni el dashboard con la acción de bloquear.

**Atajo directo** (decisión tomada con el usuario entre dos opciones: se
eligió la de menor superficie de código, no el modal embebido). Cada fila
`VENCIDA` de `MembresiasPanel.tsx` suma un link "Bloquear" hacia
`/escuela/jugadores?jugadorId=<id>` — la lista de Jugadores queda filtrada
a ese único jugador, donde el botón de bloqueo (que ya abre
`JugadorBloqueoModal` con el `JugadorGestionDTO` completo) funciona sin
tocarlo. Requirió sumar `id?` a los filtros de
`listarJugadoresGestion`/`contarJugadoresGestion` (repo y servicio) — un
filtro más del mismo tipo que `categoriaId`, no una feature nueva.

**Vista "Morosos"** (`/escuela/morosos`, nueva): `listarMorosos(ctx)`
**no reimplementa** el cruce cuotas↔jugador — llama a
`listarJugadoresGestion(ctx, { estado: "ACTIVO", limit: 5000 })` (el mismo
que ya calcula `enMora`/`montoVencido` para toda la app) y filtra el
resultado a `enMora === true`. Evita que la definición de "estar en mora"
viva en dos lugares que puedan divergir. `MorososPanel.tsx` calca el
patrón de selección de `ProgresoMasivo.tsx` (único precedente de
lista-con-checkboxes-y-acción-en-lote del repo): `Set<string>` de ids,
"marcar todos visibles", un solo `FormData` con los ids serializados. Los
jugadores ya bloqueados se siguen mostrando (badge "Ya bloqueado") pero
quedan fuera de "marcar todos" — bloquear de nuevo no tiene efecto y solo
confunde si aparece seleccionable.

**Bloqueo en lote sin auditoría agregada.** Nueva
`bloquearAccesoJugadores` en `bloqueo.service.ts` reusa
`bloquearAccesoJugador` en un loop **secuencial** (no `Promise.all`): un
jugador sin cuenta de familia vinculada no aborta el lote entero, se
reporta aparte en `fallidos` (usa `instanceof DomainError` para distinguir
un fallo de validación esperado de uno inesperado). Cada bloqueo sigue
auditando individualmente — se descartó a propósito el patrón de
auditoría agregada de `generarCuotasDelPeriodo`: bloquear el acceso de una
familia es una acción sensible por jugador, no un registro administrativo
barato, y tiene que quedar trazable uno por uno.

**Hallazgo colateral, no corregido acá** (anotado en `PENDIENTES.md`): el
KPI "Familias bloqueadas" del dashboard enlaza a
`/escuela/jugadores?bloqueado=1`, pero ese filtro nunca estuvo
implementado — preexistente, no introducido por este paquete. Sumarlo no
es trivial como el filtro `id` (bloqueado vive en `padre`/`cuentaUser`, no
en `Jugador`, y colisiona con el `OR` de búsqueda por texto ya existente).

Implementación delegada a un sub-agente con el plan (aprobado tras resolver
con el usuario la disyuntiva del atajo directo) como instrucción exacta.
Revisión de diff propia, más un chequeo de solo lectura contra la base real
(`elite-escuela`): `listarMorosos` da 8 jugadores ACTIVO en mora, igual que
el cálculo de `jugadoresEnMora` que ya usa el dashboard. Sin schema nuevo,
sin migración. `typecheck`/`lint`/`test` limpios (293 tests, sin casos
nuevos — es wiring y un loop sobre una función ya auditada/testeada por
otros caminos).

## 32. Eventos: día programado, duración, sin "minutos jugados" (2026-08-05)

Pedido puntual del usuario para validar en producción vía push. Tres
cambios relacionados sobre el mismo flujo (entrenamiento y partido),
investigados a fondo antes de tocar código (dos agentes de exploración en
paralelo: schema/creación/Modo Sesión por un lado, `minutos` por otro).

**Aviso al iniciar sesión un día distinto al programado.** Antes,
`ModoSesion.tsx` arrancaba el cronómetro solo, en un `useEffect`, sin mirar
si `evento.inicio` era de hoy. Ahora compara el día de `evento.inicio`
contra "hoy" en hora LOCAL del navegador (mismo criterio que `FechaLocal`
— nunca en el servidor, que en Vercel corre en UTC) y, si no coincide y la
sesión todavía no arrancó, muestra `AjustarFechaEventoModal` en vez de
arrancar en silencio. "Ajustar y arrancar" reprograma el evento al momento
real (`reprogramarEventoAAhora`, preserva la duración original) y recién
ahí inicia; "Cancelar" no toca nada. Sin guard de fecha en el servidor a
propósito: no es control de acceso, es calidad de dato, y ya se resolvió en
el cliente.

**Duración en vez de hora fin, y un bug de zona horaria corregido de paso.**
`CrearEventoDialog`/`EditarEventoDialog` pasan de dos `datetime-local`
(inicio/fin) a fecha + hora/minuto de inicio (franjas de 15') + duración en
horas/minutos (franjas de 15', mínimo 15'). Hallazgo no pedido pero
directamente relacionado, corregido en el mismo cambio: el código viejo
mandaba el string crudo del `datetime-local` sin zona horaria, y
`z.coerce.date()` en el servidor (UTC en Vercel) lo reinterpretaba mal —
una hora tipeada en Colombia podía guardarse corrida. Ahora el cliente arma
el `Date` con el constructor de componentes locales
(`new Date(año, mes-1, día, hora, minuto)`) y manda `.toISOString()`; las
actions/servicios/repos de evento no cambiaron, siguen recibiendo
`inicio`/`fin` como siempre. El refine `mismoDía()` de
`eventoSchema`/`editarEventoSchema` se sacó (quedó obsoleto bajo el modelo
de duración, y además tenía el mismo bug de zona horaria); se sumó en su
lugar un tope de 8 horas de duración del lado del servidor — hallazgo de
una revisión fresca del propio sub-agente que implementó el cambio: sin
`mismoDía()`, que antes limitaba la duración a <24h como efecto colateral,
un POST directo a la Server Action habría quedado sin techo real.

**"Minutos jugados" sale de toda la app — la columna de la base se
conserva.** Decisión de producto: el dato generaba más ruido que valor
(percepción del padre de "juega poco/mucho" sin base confiable); solo la
asistencia debe sumar. Se sacó de captura (`CierreSesion.tsx`, tabla del
detalle del evento), parseo, DTOs, pantallas (hub del jugador, detalle de
evento) y export — **sin migración de schema**: `EstadisticaPartido.minutos`
sigue en `prisma/schema.prisma` con su `@default(0)`, con un comentario
explicando que es intencional (decisión ya tomada con el usuario: hay
partidos reales con minutos cargados y ese dato no se pierde). Detalle
completo en `DECISIONES.md` §75-78.

**Hallazgo colateral, corregido porque bloqueaba la validación:** al correr
`npm run test:e2e` para probar el cambio, el `global-setup` ni siquiera
llegaba a levantar el server — `prisma/seed.ts` fallaba en `limpiar()` por
una FK violation de `Arancel`/`Egreso` contra `Escuela` (esas dos tablas,
sumadas en los hitos 26 y 29, nunca se agregaron al orden de borrado del
seed). Corregido sumando `arancel.deleteMany()`/`egreso.deleteMany()` antes
de `escuela.deleteMany()`. No es un bug de producción — el seed principal
no se corre ahí — pero sin este fix ningún e2e podía correr desde hoy.

**Verificación**: `typecheck`/`lint`/`test` limpios (293 tests, sin
regresión). `npm run test:e2e`: 8/10 specs en verde, incluidos los dos que
ejercitan directo el cambio de hoy (`05-sesion-entrenamiento`,
`06-sesion-partido`). Los dos specs que fallan (`02-flujo-carta`, el cierre
de `03-semana-operativa`) se confirmó con `git log` que tocan código sin
commits de hoy — no son causados por este hito, quedaron anotados en
`PENDIENTES.md` sin investigarlos más a fondo (fuera de alcance de este
pedido). Los specs `03`, `05` y `06` se reescribieron para interactuar con
los selects nuevos en vez de los `datetime-local` viejos (`tests/e2e/helpers.ts`
ganó `eventoFuturo()` en reemplazo de `futuroInput()`); se sumó
`aria-label` a los inputs de fecha y duración que no lo tenían, tanto para
que los tests los pudieran ubicar como por accesibilidad.

Implementación delegada a un sub-agente con el plan (investigado con dos
Explore en paralelo) como instrucción exacta; ese mismo sub-agente hizo una
segunda pasada de revisión propia y encontró los dos temas reales que no
había resuelto (specs e2e rotos, tope de duración sin techo) — corregidos
directamente en la revisión final antes de commitear, junto con el fix del
seed que apareció al intentar correr e2e.

## 33. Fix de 2 specs e2e rotos, sin relación con el hito 32 (2026-08-05)

Los dos specs que el hito 32 dejó anotados en `PENDIENTES.md` sin
investigar (ya confirmado ahí, vía `git log`, que no los causó ese hito).
Un agente de exploración diagnosticó la causa raíz exacta de cada uno antes
de tocar nada; los dos resultaron ser bugs del test, no de la app.

**`02-flujo-carta.spec.ts`**: el form de registro ganó un campo
`confirmacion` (repetir contraseña) en un hito anterior a este
(`CamposPassword.tsx`, `required minLength={8}`); el test solo llenaba
`password`, así que el navegador bloqueaba el submit por validación HTML5
nativa antes de que la Server Action corriera — de ahí que la URL nunca
saliera de `/registro/<código>`. El auto-login en sí (`signIn` server-side
+ `router.push` a `/jugador`) funciona correctamente. Fix: el test llena
también `input[name="confirmacion"]`.

**`03-semana-operativa.spec.ts`**: al convocar jugadores (paso 1 del test),
`evento.service.ts` dispara una notificación de prioridad alta a los
padres. `AvisoImportante.tsx` (montado en `PanelShell.tsx`, para todo panel
autenticado) muestra un modal full-screen ante cualquier notificación no
leída de prioridad alta/crítica — comportamiento intencional ("interrumpe
a propósito"), agregado en un hito posterior a la creación de este spec.
El overlay tapaba el botón "Confirmar" real. Fix: el test cierra el modal
(botón "Aceptar") antes de confirmar la asistencia.

**Verificación**: `typecheck`/`lint` limpios. `npm run test:e2e` completo:
10/10 specs en verde (antes 8/10).

Investigación delegada a un agente Explore (solo lectura); fix de los dos
specs y verificación hechos directamente.

## 34. Motivo de soporte: se mantienen los dos patrones (2026-08-05)

Cierra la pregunta abierta en `DECISIONES.md` §72. Decisión del usuario: un
import masivo (200 filas) es una acción bien distinta a editar un campo, y
amerita un motivo propio registrado aparte en el `AuditLog` — no el motivo
genérico de la sesión de soporte. `importarJugadores`/`importarEvaluaciones`
siguen pidiendo su propio motivo por import; `editarJugador`,
`actualizarFichaMedica` y el resto de las ediciones puntuales del SA siguen
reusando `ctx.soporte?.motivo`. Sin cambio de código — decisión documentada
en `DECISIONES.md` §79, paquete sacado de `PENDIENTES.md`.

## 35. Guardián de tenant: cobertura de `services` (2026-08-05)

Hallazgo del hito 29 (Aranceles), anotado entonces en `PENDIENTES.md`:
`tests/unit/aislamiento-tenant.test.ts` solo escaneaba
`src/repositories/*.repository.ts`, pero algunos services
(`entrenador.service.ts`, `arancel.service.ts`) abren
`db.$transaction(async (tx) => ...)` directo desde el service, sin pasar
por un repositorio — quedaban fuera del barrido. Se generalizó el test
para recorrer también `src/services/*.service.ts` (mismo mecanismo, un
segundo directorio en vez de uno hardcodeado).

Al extenderlo apareció un caso real, no antes visible:
`evaluacion.service.ts:174` — `tx.logroJugador.updateMany({ where: { id:
{ in: consumidos } } })` sin `escuelaId` explícito. Investigado: `consumidos`
son ids que vienen de `bonusPendientes(jugador.id)`
(`evaluacion.repository.ts`), que ya lleva la misma anotación
`// tenant-global:` documentando que el `jugador` fue verificado
tenant-scoped aguas arriba (`obtenerJugador(escuelaId, ...)`) antes de
llegar a `evaluarJugadorCore` — confirmado en sus dos únicos llamadores
(`crearEvaluacion` y la importación masiva). No era una fuga real: se
anotó con `// tenant-global:` (mismo criterio que su vecino en el
repositorio), no se tocó el filtro.

**Verificación**: `typecheck`/`lint`/`test` limpios (293 tests).

## 36. Filtro `?bloqueado=1` en Jugadores (2026-08-05)

Hallazgo colateral del hito 31 (Bloqueo por mora), anotado en `PENDIENTES.md`:
el KPI "Familias bloqueadas" (`src/app/escuela/page.tsx`) enlaza a
`/escuela/jugadores?bloqueado=1`, pero nada leía ese query param — link
muerto. `jugador.repository.ts` ya tenía un `OR` para la búsqueda por texto
(`condSearch`), y bloqueado vive en `padre.bloqueado`/`cuentaUser.bloqueado`
(no en `Jugador`), así que sumarlo tal cual habría colisionado con ese `OR`
existente. Se restructuraron `listarJugadoresGestion`/`contarJugadoresGestion`
alrededor de un `condicionesJugadorGestion()` que arma un array `AND`
explícito (mismo patrón que `condicionesMembresia` del hito 30) — cada
filtro (búsqueda, bloqueado) agrega su propio elemento al `AND`, sin pisarse.
Encadenado hasta la página: `gestion-jugadores.service.ts` gana `bloqueado?:
boolean`, y `escuela/jugadores/page.tsx` lee `searchParams.bloqueado === "1"`.

**Verificación**: `typecheck`/`lint`/`test` limpios (293 tests). Chequeo
extra contra la base real: dentro de una transacción con ROLLBACK forzado,
se bloqueó temporalmente el `User` padre de un jugador y se confirmó que
`contarJugadoresGestion(..., {bloqueado:true})` lo cuenta y
`listarJugadoresGestion` lo devuelve — nada persistido.

## 37. Descuentos con regla (2026-08-05)

Paquete "Medio" de `PENDIENTES.md`. Antes `Membresia.descuento` se tipeaba
a mano cuota por cuota; ahora se pueden definir reglas de descuento
reusables por categoría (`DescuentoRegla`) que se aplican solas al generar
la cobranza masiva del mes. Decisiones de producto cerradas antes de
diseñar (`DECISIONES.md` §80): reglas por categoría (no escuela completa),
gana la de mayor descuento si un jugador califica para varias (no se
combinan), "Hermano" se asigna manual (sin detección automática).

**Diseño**: mirrorea el patrón ya existente de `Arancel` (precio por
categoría) y su función pura `resolverArancel`. Dos modelos nuevos:
`DescuentoRegla` (categoría, nombre, `tipo` PORCENTAJE/MONTO_FIJO, valor,
baja lógica) y `JugadorDescuento` (m2m jugador↔regla, mismo shape que
`EntrenadorCategoria`). Nueva función pura `resolverDescuento`
(`src/lib/cobranza.ts`): compara el descuento resultante EN PESOS de cada
regla aplicable, no el `valor` crudo — un 10% y un fijo de $5000 no se
comparan directo. Enganchada en `generarCuotasDelPeriodo`
(`membresia.service.ts`): un solo query extra de reglas activas, resolución
en memoria por jugador (filtrada defensivamente por
`categoriaId` del jugador, por si cambió de categoría después de la
asignación), solo si el arancel resolvió un monto — mismo criterio que
`sinPrecio`. Nuevos repo/service/validator/actions (`descuento.*`) y UI
(`/escuela/descuentos`, `DescuentosPanel`, `EditarDescuentoReglaModal`,
`AsignarJugadoresDescuentoModal` con checklist tipo convocados).

**Hallazgo colateral, corregido de paso**: `prisma/seed.ts` tenía el MISMO
tipo de bug de FK que el hito 32 (Arancel/Egreso) — `JugadorDescuento`/
`DescuentoRegla` faltaban en el orden de `limpiar()`, y `jugador.deleteMany()`
habría roto por la FK. Corregido antes de que bloqueara el e2e.

**Verificación**: `typecheck`/`lint`/`test` limpios (299 tests, 6 nuevos
para `resolverDescuento`, incluido el caso de comparación mixta
porcentaje/fijo). `npm run test:e2e`: 10/10. Chequeo real contra la base de
producción: se creó un arancel y una regla de descuento temporales, se
asignó a un jugador real, se corrió `generarCuotasDelPeriodo` con un
período sintético (`2099-01`, imposible que colisione con datos reales), se
confirmó que la cuota nació con el descuento correcto (10% de 100.000 =
10.000), y se borró todo (arancel, regla, asignación, cuota, audit logs) —
nada quedó persistido. Migración (`20260805190415_descuento_regla`,
puramente aditiva) aplicada a producción.

Implementación delegada a un sub-agente con el plan (investigado y
aprobado en modo plan) como instrucción exacta; revisión de diff propia
línea por línea antes de verificar y aplicar la migración.

## 38. Acceso parcial del jugador bloqueado (2026-08-05)

Paquete "Medio" de `PENDIENTES.md`, marcado como sensible por tocar
funciones centrales de autenticación (datos de menores, AGENTS.md §5). Pedido
real de uso: una familia bloqueada por mora podía seguir entrando pero solo
a `/jugador/mensajes`, para hablar con el DT, en vez de un bloqueo total.

Decisiones cerradas antes de diseñar (`DECISIONES.md` §81): guard nuevo más
laxo en vez de un allowlist de rutas dentro de los guards existentes; el
aviso convive como banner arriba de mensajes, no reemplaza la pantalla.

**Diseño**: `requirePanelUser`/`requireAuthContext`
(`src/lib/auth/session.ts`) ganaron un parámetro opcional
`{ permitirBloqueado: true }` — sin el parámetro (todos los demás
call-sites de la app) el comportamiento es idéntico al de siempre.
Confirmado por grep: solo 3 lugares lo usan — el layout de `/jugador`
(necesita dejar pasar para que algo renderice, y filtra `NAV` a solo
"Mensajes" si `user.bloqueado`) y las dos páginas de mensajes
(`mensajes/page.tsx`, `mensajes/[id]/page.tsx`, que además muestran
`AvisoAccesoLimitado` nuevo con el mensaje real de
`mensajeDeBloqueo`/`obtenerEstadoBloqueo`, ambos ya existentes). Las otras
9 páginas de `/jugador` no se tocaron: cada una ya llama su propio
`requireAuthContext()` sin el flag, así que se siguen auto-bloqueando
solas apenas el layout deja pasar. `AuthContext` no ganó un campo
`bloqueado` a propósito — es preocupación de UI de una sola pantalla, no
de las funciones de servicio que lo reciben en toda la app.

**Verificación**: `typecheck`/`lint`/`test` limpios (299 tests, sin
cambios en unitarios — es lógica de guard de página). `grep` confirmó que
ningún otro call-site de `requirePanelUser`/`requireAuthContext` pasa el
parámetro nuevo. `npm run test:e2e`: 11/11 (se sumó un caso nuevo a
`tests/e2e/04-bloqueo.spec.ts` — familia bloqueada entra directo a
`/jugador/mensajes` sin redirigir, ve el aviso, el nav solo ofrece
"Mensajes", y cualquier otra ruta la sigue mandando a `/bloqueado`). Un
primer intento del test falló por una aserción floja (`getByRole("link",
{name:"Progreso"})` matcheaba por substring contra el ASUNTO de una
conversación real, "Progreso de Lucas", no un link de nav) — corregido
acotando la búsqueda al `<nav>` del Sidebar.

Implementado directamente, sin delegar a un sub-agente, por tocar
autenticación.

## 39. Perfil del DT con estadísticas (2026-08-05)

Paquete "Medio" de `PENDIENTES.md`. No existía ninguna pantalla de "mis
resultados" para el DT. Decisiones cerradas antes de diseñar
(`DECISIONES.md` §82): tres secciones (evaluaciones del período, resultados
de partidos, plantilla evaluada vs. pendiente) con período elegible (mes
actual / temporada completa); "temporada completa" = sin filtro de fecha,
no hay concepto de temporada en el modelo de datos.

**Diseño**: mayoría del backend YA EXISTÍA y se reusó tal cual —
`categoriasDelDt` (scope del DT), `listarPlantillaDt` (`card === null` ya
distinguía evaluado de pendiente), `listarEventosPaginado` (filtrado
`{tipo: "PARTIDO", estado: "FINALIZADO", desde}`). Solo se creó
`listarEvaluacionesPorEntrenador` (`evaluacion.repository.ts`, no existía
ninguna función que filtrara evaluaciones por entrenador) y el service
nuevo `dt-perfil.service.ts` que combina las tres fuentes en paralelo.
Página server component en `/dt/perfil`, UI en `PerfilDt.tsx` (selector de
período por links `?periodo=`, sin JS de cliente), nueva entrada de nav
"Mi perfil" (reusa el ícono `perfil` que ya usaba el jugador).

**Hallazgo corregido antes de commitear**: el helper puro `inicioDeMes`
(nuevo, `src/lib/dt-perfil.ts`) usaba `getFullYear()/getMonth()` del
proceso — el mismo bug de zona horaria que `periodoDe` (`cobranza.ts`) ya
documenta: en Vercel el server corre en UTC, así que cerca de medianoche en
Colombia "Este mes" habría mostrado el mes siguiente hasta 5 horas antes de
que empezara de verdad. Corregido con el mismo patrón `OFFSET_ESCUELA_HORAS`
ya establecido. De paso, el test unitario original comparaba con getters
locales de `Date` (dependientes de la zona horaria de la máquina que corre
el test) — reescrito con ISOs UTC explícitos y comparación de `.toISOString()`,
mismo patrón robusto que `cobranza.test.ts` usa para `periodoDe`.

**Verificación**: `typecheck`/`lint`/`test` limpios (303 tests, 4 nuevos
para `inicioDeMes` incluido el borde de medianoche en Colombia). `npm run
test:e2e`: 11/11 (se corrió igual pese a no ser obligatorio por AGENTS.md
§7, por tocar el nav compartido del DT).

Implementación delegada a un sub-agente con el plan (investigado y
aprobado en modo plan) como instrucción exacta; el bug de zona horaria y
la fragilidad del test se encontraron y corrigieron en la revisión propia
antes de commitear.

## 40. Staff más allá del DT (2026-08-06)

Último paquete "Medio" pendiente de este bloque. Decisión de producto ya
cerrada desde el hito 32/`DECISIONES.md` §73 (sin rol nuevo — los cuatro
roles del sistema quedan fijos). Se modela `Staff` como registro
puramente administrativo (coordinador, preparador físico, utilero, otro):
sin `userId`, sin login, gestionado por `ESCUELA_ADMIN` — una libreta de
contactos del cuerpo técnico, no una cuenta.

**Diseño**: mirrorea `Categoria` (el CRUD más simple del panel de escuela)
sumándole `update`/`delete`, que `Categoria` no tiene. Campo `cargo`, no
`rol` (para no confundirlo con `User.rol`, que sí es de autenticación).
**Borrado físico, sin baja lógica**: a diferencia de `Arancel`/
`DescuentoRegla`, `Staff` no tiene ninguna relación entrante desde otra
tabla, así que no hay nada que preservar ni que se rompa al borrar — ni
siquiera necesita el chequeo de "en uso" que sí tiene `eliminarFondo`.
Sin `registrarAuditoria`: dato administrativo sin impacto financiero ni de
acceso, a diferencia de Arancel/Membresía/bloqueos.

CRUD completo (`staff.repository.ts`/`staff.service.ts`/
`validators/staff.ts`/`staff.actions.ts`) + panel nuevo en
`/escuela/staff` con tabla y modal de edición, reusando `telefonoOpcional`
(`validators/cuenta.ts`) para el campo teléfono en vez de reinventar la
validación.

**Verificación**: `typecheck`/`lint`/`test` limpios (303 tests, sin
nuevos — CRUD directo sin lógica pura que testear). Migración
(`20260806140838_staff`, puramente aditiva) aplicada a producción.
Chequeo real contra la base: create → read → update → delete de un
registro de prueba, confirmado y limpiado, sin dejar residuos.

Implementación delegada a un sub-agente con el plan (investigado y
aprobado en modo plan) como instrucción exacta; revisión de diff propia
antes de verificar y aplicar la migración.

## 41. Curva etapa 2 (parte 1/4): Rendimiento → progreso (2026-08-06)

Primera de las cuatro piezas de "Progresión del jugador — etapa 2"
(gateado en `PENDIENTES.md`). La curva de desarrollo (etapa 1, en
producción desde antes) premiaba solo la presencia — un goleador sumaba
exactamente igual que un suplente que no jugó. Decisiones cerradas antes
de diseñar (`DECISIONES.md` §83, cierran las 4 preguntas abiertas de
`CURVA-DE-DESARROLLO.md` §9): sin minutos jugados (coherente con §75),
solo la roja resta (chico y recuperable), tope propio separado del de
asistencia, sin normalizar por categoría.

**Diseño**: `src/lib/curva.ts` gana `calcularRendimientoBonus` (función
pura, mismo estilo que `calcularMenBonus`) + 4 constantes nuevas en
`CURVA` (`GANANCIA_GOL`, `GANANCIA_ASISTENCIA_GOL`, `PENAL_ROJA`,
`TOPE_RENDIMIENTO_BONUS`). Nueva query `estadisticasRecientesGlobal`
(`evento.repository.ts`, mirror de `asistenciasRecientesGlobal`).
`recalcularMenDiario` (`curva.service.ts`, el cron diario) agrega
`estadisticasRecientesGlobal` a su `Promise.all` existente, agrega una
segunda agregación en memoria por jugador, y persiste
`bonusAsistencia + bonusRendimiento` (cada uno ya topado por separado)
como el nuevo `Jugador.menBonus` total — sin cambio de schema ni de
firma de `actualizarMenBonus`.

**Verificación**: `typecheck`/`lint`/`test` limpios (308 tests, 5 nuevos
para `calcularRendimientoBonus`). Chequeo real contra producción:
`recalcularMenDiario()` es idempotente por diseño (recalcula desde cero,
mismo cálculo que corre el cron a diario), así que se corrió de verdad —
confirmado que un jugador con 4 goles en la ventana subió su `menBonus`
en exactamente +2.0 (4 × `GANANCIA_GOL` 0.5) y otro con 1 gol en +0.5,
coincidiendo exacto con lo esperado.

Implementado directamente (sin delegar a un sub-agente): cambio chico y
acotado a 3 archivos + tests, con contexto ya investigado a fondo en el
plan aprobado.

## 42. Curva etapa 2 (parte 2/4): vista de seguimiento del DT (2026-08-06)

Segunda pieza de "Progresión etapa 2". El progreso de cada jugador
(asistencia + rendimiento, hito 41) no tenía ninguna pantalla que lo
mostrara desglosado — se agregó como sección nueva **dentro** de
`/dt/perfil` (hito 39), no una pantalla separada: mismo scope (categorías
del DT), mismo tono visual. La sección usa SIEMPRE la ventana móvil fija
de 30 días de la curva, no el selector `?periodo=` de la página — el
número que importa es el mismo que ya está en `Jugador.menBonus` (lo que
ve la familia en la carta), no otro derivado de "temporada completa".

**Diseño**: se extrajo el loop de agregación que vivía inline en
`recalcularMenDiario` a una función pura reusable,
`agregarInsumosPorJugador` (`src/lib/curva.ts`, junto con
`inicioVentanaCurva`), para que el cron global y esta vista (acotada a la
plantilla de un DT) compartan la misma lógica sin duplicarla. Nuevas
queries `asistenciasRecientesDeJugadores`/`estadisticasRecientesDeJugadores`
(`evento.repository.ts`, mirror de las versiones `*Global` del hito 41
pero acotadas por `jugadorId: {in: jugadorIds}`). `obtenerPerfilDt`
(`dt-perfil.service.ts`) gana `progresoMen: ProgresoMenDTO[]`. UI: sección
"Progreso del mes" en `PerfilDt.tsx` con dos barras por jugador (asistencia
y rendimiento, cada una con su propio tope) y el detalle crudo debajo.

**Bug real encontrado y corregido en la revisión propia** (no del plan,
criterio del sub-agente que implementó): la lista filtraba jugadores por
`bonusTotal > 0` para decidir si mostrarlos — pero un jugador con SOLO
faltas (sin entrenos/partidos presentes) da `bonusTotal = 0` (el piso es
0, nunca negativo) y quedaba oculto, justo el caso que más le importa ver
a un DT en una vista de seguimiento. Corregido: el filtro ahora es "algún
registro en la ventana" (entrenos+partidos+ausencias+goles+asistencias+
rojas > 0), no "bonus positivo". De paso se encontró que el filtro de
vacío y la lista renderizada usaban criterios distintos (uno filtraba,
el otro no) — unificados en un solo cálculo.

**Verificación**: `typecheck`/`lint`/`test` limpios (311 tests, 3 nuevos
para `agregarInsumosPorJugador`). Confirmado que la refactorización de
`recalcularMenDiario` es equivalente línea por línea a la versión
anterior (diff revisado). Chequeo real contra producción: se corrió
`recalcularMenDiario()` (idempotente) y `obtenerPerfilDt` para un DT
real — el `bonusTotal` calculado por la vista nueva coincidió EXACTO con
`Jugador.menBonus` persistido (1.2 = 1.2), y se confirmó que un jugador
con solo 1 falta (bonus 0) aparece correctamente en la lista tras el fix.

Implementación delegada a un sub-agente con el plan (investigado y
aprobado en modo plan) como instrucción exacta; el bug del filtro se
encontró y corrigió en la revisión propia antes de commitear.

## 43. Curva etapa 2 (parte 3/4): línea de proyección (2026-08-06)

Tercera pieza de "Progresión etapa 2" (`CURVA-DE-DESARROLLO.md` §6). El
hub del jugador ya mostraba una línea sólida (`EvolutionChart`) con el OVR
real de cada evaluación pasada; faltaba la punteada — "hacia dónde va el
OVR si mantiene el esfuerzo".

**Sin cálculo nuevo**: `obtenerHub` (`player.service.ts`) ya calculaba
exactamente ese número — `card.ovr`, los stats duros de la última
evaluación + el `Jugador.menBonus` actual (asistencia+rendimiento, hitos
41-42) vía `ovrConMen`. Solo hizo falta exponerlo como
`HubDTO.proyeccionOvr: {fecha, ovr} | null`. Dos puntos nada más (última
evaluación real + "hoy"), sin inventar una curva/pendiente que el
documento de diseño no pide.

`EvolutionChart.tsx` gana una prop `proyeccion` opcional: una segunda
`<Line>` de Recharts (`strokeDasharray="5 5"`, `connectNulls` para saltar
los `undefined` de los puntos intermedios y conectar directo el último
real con el sintético de hoy), visible **solo en la métrica OVR** — nunca
en RIT/TIR/etc., por el principio de integridad no negociable del
documento (§2/§7): los stats físicos/técnicos nunca se proyectan, solo se
mueven con una evaluación real. Debajo del gráfico, un texto fijo aclara
que la punteada es una proyección que se confirma en la próxima
evaluación (mismo principio, etiquetado explícito).

**Verificación**: `typecheck`/`lint`/`test` limpios (311 tests, sin
nuevos — se reusa `ovrConMen`, ya testeado, cero cálculo duplicado).
Chequeo real contra producción: `obtenerHub` para un jugador con
evaluaciones confirmó `proyeccionOvr.ovr === card.ovr` exacto (76 = 76),
mayor al último punto real (75), reflejando el bonus de MEN vigente.
**Limitación declarada**: sin herramienta de automatización de navegador
disponible en esta sesión, no se pudo confirmar visualmente el render del
gráfico (línea punteada, tooltip, desaparición al cambiar de métrica) —
verificado por lectura cuidadosa del código y por los datos reales que
recibe el componente, no por interacción en pantalla.

Implementado directamente (sin delegar a un sub-agente): cambio acotado a
3 archivos, con el diseño de Recharts ya resuelto en el plan aprobado.

**Hallazgo de Guardian Angel, corregido antes de commitear (deuda
preexistente desde el Sprint 5, no de este cambio, pero bloqueaba el
commit por revisar el archivo completo):** `src/services/player.service.ts`
era el único service de los 49 del proyecto nombrado en inglés (viola
AGENTS.md §6). No era un rename directo: ya existe `jugador.service.ts`
con otro dominio (gestión de plantilla/solicitudes del DT, sin ninguna
colisión de nombres exportados con el hub). Renombrado con `git mv` a
`hub-jugador.service.ts` (preserva historial), actualizados los 7
imports que lo consumían (`jugador/page.tsx`, `jugador/perfil/page.tsx`,
`jugador/logros/page.tsx`, `EvolutionChart.tsx`, `NoticiasList.tsx`,
`LogrosVitrina.tsx`, `ObjetivosList.tsx`). Contenido sin tocar, cero
cambio de comportamiento — confirmado con `typecheck`/`lint`/`test`
limpios tras el rename.

---

## 44. Curva etapa 2 (parte 4/4, última): pesos por escuela (2026-08-06)

Cierra el paquete completo "Progresión del jugador — etapa 2". `CURVA`
(`src/lib/curva.ts`) eran 10 constantes globales; se exponen 5 como
overrideables por escuela, reusando la infraestructura de
`ParametroEscuela` que ya resolvía exactamente este problema para rangos
físicos y umbrales de nivel. Decisiones cerradas antes de diseñar
(`DECISIONES.md` §84): solo 5 de las 10 son overrideables
(`GANANCIA_ENTRENO`, `GANANCIA_PARTIDO`, `TOPE_MEN_BONUS`,
`TOPE_RENDIMIENTO_BONUS`, `UMBRAL_AUSENCIAS`); las edita el **SUPER_ADMIN**
desde `/admin/parametros` — investigado que ese panel es hoy exclusivo del
SUPER_ADMIN (no existe self-service de ESCUELA_ADMIN sobre
`ParametroEscuela` en ningún lado del proyecto), así que "reusar la
infraestructura" significa seguir ese mismo modelo de acceso.

**Diseño**: el patrón global+override (`claveOverrideable`,
`mezclarParametros`, `resolverParametros` en `src/lib/parametros.ts`; las
Server Actions de escritura y el componente `MetricaCampoAdmin`) ya era
100% genérico — solo hizo falta sumar el prefijo `CURVA_` al gate y
escribir las funciones de lectura/resolución específicas
(`listarMetricasCurvaEscuelaAdmin`, `resolverCurvaEscuela` en
`parametro-escuela.service.ts`), sin tocar ninguna acción ni componente de
escritura. `calcularMenBonus`/`calcularRendimientoBonus`
(`src/lib/curva.ts`) ganan un segundo parámetro `curva` opcional con
default `CURVA` — retrocompatible, ningún call-site existente cambia de
comportamiento. El cron (`recalcularMenDiario`) agrupa los jugadores
activos por escuela y resuelve la curva una sola vez por escuela, no por
jugador. Por consistencia (obligatorio, no opcional): `obtenerPerfilDt`
(hito 42, "Vista de seguimiento del DT") también resuelve la curva por
escuela para sus cálculos y expone los topes resueltos en el DTO, así
`PerfilDt.tsx` calcula las barras contra el tope REAL de la escuela, no
contra la constante global hardcodeada — si no se hacía este ajuste, el
"Progreso del mes" del DT habría mostrado números distintos a los
realmente persistidos en `Jugador.menBonus` para cualquier escuela con
override.

**Fuera de alcance a propósito, documentado**: `proyeccionMen`
(`hub-jugador.service.ts`, el mensaje motivacional "tu próximo entreno
suma X" del hub) sigue usando el `CURVA` global sin resolver por escuela.
No es el número que se persiste (`card.ovr`/`Jugador.menBonus` sí quedan
correctos vía el cron) — es solo texto motivacional no crítico; resolverlo
agregaría una consulta más a un hot path por un texto secundario.

**Ajuste de tipos necesario (TypeScript, no de diseño)**: `typeof CURVA`
(el objeto `as const`) tiene tipos literales (`0.6`, `12`, etc.), así que
un objeto armado con valores `number` sueltos desde la DB
(`resolverCurvaEscuela`) no es asignable ahí. Se agregó un tipo ancho
`Curva = { [K in keyof typeof CURVA]: number }` y se usó en las firmas en
vez de `typeof CURVA` — misma forma, sin literales, mismo diseño aprobado.

**Verificación**: `typecheck`/`lint`/`test` limpios (317 tests, 6 nuevos
confirmando que `calcularMenBonus`/`calcularRendimientoBonus` con una
`curva` custom cambian el resultado, y que sin pasarla el comportamiento
es idéntico al de antes). Chequeo real contra producción: se fijó un
override `CURVA_GANANCIA_ENTRENO = 6.0` (10× el default 0.6) para una
escuela, se corrió el cron, y el `menBonus` de un jugador de esa escuela
saltó de 5 a 10.4 exacto — mientras que otra escuela sin override siguió
resolviendo `GANANCIA_ENTRENO = 0.6`. Se borró el override y se re-corrió
el cron: `menBonus` volvió exacto a 5, sin residuos.

Implementación delegada a un sub-agente con el plan (investigado y
aprobado en modo plan, incluida una pregunta de alcance cerrada con el
usuario sobre quién edita los pesos) como instrucción exacta; revisión de
diff propia línea por línea antes de verificar.

**Hallazgo de seguridad de Guardian Angel, corregido antes de commitear
(deuda preexistente desde Sprint M, no de este cambio, pero bloqueaba el
commit por revisar el archivo completo):**
`listarMetricasEscuelaAdmin`/`fijarMetricaEscuelaAdmin`/
`quitarMetricaEscuelaAdmin` en `parametro-escuela.service.ts` (y mi
función nueva `listarMetricasCurvaEscuelaAdmin`, que replicaba el mismo
patrón) recibían `escuelaId` del request sin `assertTenant` — un
SUPER_ADMIN podía leer/editar los parámetros de CUALQUIER escuela sin
tener nunca una sesión de soporte abierta para ella, exactamente el
acceso ambiental que AGENTS.md §5/M2 prohíbe. El archivo hermano
`parametro.service.ts` (`obtenerConfigSimuladorEscuela`) ya resolvía el
mismo escenario correctamente, con un comentario que describe este mismo
bug ya ocurrido antes ("el guard va ACÁ, en el punto de paso... puesto
arriba cerraba una puerta y dejaba la otra abierta"). Corregido: las 4
funciones ganan `assertTenant(ctx, escuelaId)`; las 2 de escritura
(`fijarMetricaEscuelaAdmin`/`quitarMetricaEscuelaAdmin`) ganan además
`assertSoportePuedeEscribir(ctx)` + `assertMotivoSoporte(ctx, motivo)`,
con `motivo` como parámetro nuevo que `admin.actions.ts` completa con
`ctx.soporte?.motivo` (el motivo de la sesión de soporte, capturado una
vez al abrirla — mismo patrón exacto que `editarJugador`/
`actualizarFichaMedica` en `gestion-jugadores.service.ts`), y el
`AuditLog` pasa a registrar ese motivo real en vez de solo `clave → valor`.

---

## 45. Categorías: selector de años acotado + categorías sin edad (2026-08-07)

El usuario reportó dos cosas sobre categorías: la creación de años era un
`<input type="number">` libre (sin límite real más allá de un rango de 110
años en Zod), y no había forma de crear una categoría "libre" sin filtro de
edad (ej. "Masculina"/"Femenina"). Investigado y corregido: la creación de
categorías vive en `/escuela/categorias` (ESCUELA_ADMIN), no en el perfil
del DT como se pensaba en un principio — corregido en la documentación
antes de diseñar.

`SelectorAnioCategoria.tsx` (nuevo) reemplaza los inputs libres por dos
`<select>` acotados (año actual − 20 a año actual + 1) más un checkbox
"Categoría sin edad" que deshabilita los selects — un `<select disabled>`
no viaja en el `FormData` al enviar, mismo mecanismo que ya usaba
`FichaMedicaModal` para su checkbox de autorización de datos de salud.
`Categoria.anioDesde`/`anioHasta` pasan a `Int?` (migración
`20260807000000_categoria_anios_opcionales`), `categoriaSchema` acepta
`sinEdad` y hace los años opcionales con `z.preprocess` (un valor ausente
del form es `null`, se trata como "no llegó"), y transforma a
`{anioDesde, anioHasta}` como `number | null`. Confirmado sin impacto en el
motor de evaluación: `GrupoEdad` (calibración física) se deriva de
`Jugador.fechaNacimiento`, nunca de `Categoria.anioDesde/anioHasta`.

Backup completo de las 40 tablas de producción (517 filas, `findMany` por
modelo a JSON) tomado ANTES de aplicar la migración — no había `pg_dump`
disponible en el entorno, así que se armó `scripts/backup-db.ts` (mismo
patrón de conexión que `seed-prod.ts`: `PrismaPg` + `DIRECT_URL`, sin pasar
por `@/lib/db`) escribiendo a una carpeta fuera del repo (datos de menores,
nunca se commitea). Con la migración ya aplicada y estable, no hizo falta
usarlo.

Implementación delegada a un sub-agente con el plan (investigado y
diseñado en modo plan) como instrucción exacta; revisión de diff propia
línea por línea, typecheck/lint/test verificados dos veces (por el
sub-agente y por mí) antes de aplicar la migración con
`prisma migrate deploy`. 321/321 tests verdes, 4 casos nuevos para
`categoriaSchema`. Primera de dos piezas del mismo plan — la calibración
física por categoría real (paquete grande, ya diseñado y con decisiones
cerradas en DECISIONES.md §85) sigue en construcción.

---

## 46. Calibración física por categoría real, no por franja etaria fija (2026-08-07)

Segunda y última pieza del plan de categorías (ver #45). `/admin/parametros`
organizaba los rangos físicos por `GrupoEdad` (Sub8/10/12/14/16, franja fija
y global), sin relación con la `Categoria` real de cada escuela — de ahí la
confusión reportada de "me trae categorías que no existen". Decisiones de
arquitectura cerradas con el usuario antes de diseñar (`DECISIONES.md` §85):
`GrupoEdad` pasa a ser solo la SEMILLA de una categoría nueva; de ahí en más
cada categoría vive con sus propios rangos en una tabla dedicada (no
reusar `ParametroEscuela`, pensado para global-con-override — una categoría
no tiene "global"); el simulador del SA y la plantilla Excel migran también
a categoría real (el modo global de ambos, sin escuela elegida, se queda en
`GrupoEdad`); y editar los rangos de una categoría pasa a ser **self-service
del ESCUELA_ADMIN** (ya crea/nombra sus propias categorías sin gate del
SUPER_ADMIN hoy) — el SUPER_ADMIN mantiene acceso vía sesión de soporte,
mismo criterio que el resto de M2.

Tabla nueva `CategoriaRangoFisico` (1:1 con `Categoria`, `onDelete: Cascade`
— no tiene sentido propio sin su categoría; `escuelaId` denormalizado para
el tenant-scoping, aunque también se llegue vía `categoriaId`). `evaluacion.
service.ts` deja de resolver rangos por `grupoEdadPorEdad(edadEnAnios(...))`
y pasa a `obtenerRangosFisicosDeCategoria(escuelaId, jugador.categoriaId)`
— `OpcionesComputo.grupoEdad` pasa a opcional en el motor puro (queda
vestigial cuando se pasa `rangos` explícito, que es siempre el caso real
desde ahora). `crearCategoriaEscuela` siembra la categoría y su fila de
rangos en una sola transacción (`db.$transaction`, patrón ya usado en
`arancel.service.ts`/`entrenador.service.ts`), calculando el `GrupoEdad`
semilla desde el rango de años de la categoría (o SUB16 si es "sin edad",
pieza anterior) más los valores efectivos (global + overrides) de la
escuela. Backfill de las 6 categorías preexistentes con
`scripts/backfill-categoria-rangos.ts` (molde `seed-prod.ts`, idempotente,
con `--dry-run`).

**Hallazgo real durante la verificación, no un bug:** después del backfill
comparé, para los 24 jugadores reales, el rango físico que les tocaría por
el camino VIEJO (edad propia exacta vía `fechaNacimiento`) contra el camino
NUEVO (`CategoriaRangoFisico` de su categoría asignada) — 16/24 coinciden,
8/24 dan un rango distinto. Investigado: en los 8 casos, el jugador está
asignado a una categoría cuyo rango de años NO coincide con su fecha de
nacimiento real (ej. Santino Romero, 10 años hoy — SUB10 por edad propia —
está en `demo-cat-sub12`, sembrada SUB12). Es exactamente el cambio de
diseño buscado: antes la calibración ignoraba a qué categoría pertenecía el
jugador (comparaba SIEMPRE contra su edad exacta); ahora compara contra la
categoría real en la que el DT lo evalúa. Confirmado en datos demo/e2e, sin
impacto retroactivo (`Evaluacion`/`StatsCalculados` son inmutables, nunca
leyeron esta tabla) — el cambio rige solo evaluaciones NUEVAS de acá en
más. Vale la pena que cualquier escuela real revise sus asignaciones de
categoría si le importa que calcen con la edad, ahora que sí determinan la
calibración física.

Verificación completa: typecheck/lint/test limpios (344/344, +23 tests
nuevos), `tests/unit/aislamiento-tenant.test.ts` pasó SIN modificarlo sobre
el modelo nuevo (detección automática por `escuelaId`). Backup completo de
las 40 tablas antes de migrar (mismo `scripts/backup-db.ts` de #45).
Migración + backfill corridos contra producción con verificación puntual:
las 6 filas backfilleadas coinciden exacto con `RANGOS_POR_GRUPO` del grupo
semilla correspondiente a cada categoría.

Implementación delegada a un sub-agente con el plan detallado (investigado
con 3 agentes de exploración en paralelo + 1 agente de diseño, en modo
plan) como instrucción exacta; revisión de diff propia línea por línea de
los 17 archivos modificados + 12 nuevos antes de aplicar nada contra la
base. Decisiones que el sub-agente tuvo que resolver sin especificación
100% cerrada (revisadas y aceptadas): validación `.positive()` vs.
`.nonnegative()` según si 0 es una marca físicamente posible por prueba;
`SimuladorCarta`/plantilla Excel caen a SUB16 con aviso visible si una
escuela no tiene (todavía) ninguna categoría con rango configurado, en vez
de romper.

Con esto se cierran los 2 paquetes de categorías documentados en #45 —
solo queda gateado "Vigencia y bloqueo automático" en `PENDIENTES.md`.

---

## Observaciones abiertas (no bloquean, registradas para no perderlas)

> Sin observaciones abiertas. La de `auth.ts` (mover el provider Credentials a
> `buscarCredencialesPorEmail`) ya está resuelta en código (`src/auth.ts` usa el
> repositorio). Las de CSP (`cdn.jsdelivr.net`) y extender credenciales por link
> se resolvieron o se movieron a `PENDIENTES.md`. Este archivo registra lo hecho,
> no lo que falta.
