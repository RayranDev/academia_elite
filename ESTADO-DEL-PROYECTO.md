# Fútbol Career Mode — Estado del proyecto

Documento integral del estado actual: qué tiene, qué falta, stack tecnológico,
arquitectura, fases y sprints. Última actualización: **2026-06-12**.

> Plataforma web multi-tenant que gamifica el fútbol base: evaluaciones reales →
> cartas de jugador estilo EA FC (stats 1–99, niveles Bronce/Plata/Oro/Héroe,
> sello MEN de mentalidad). 4 paneles por rol + landing pública.

---

## 1. Resumen ejecutivo

- **Estado:** funcional de extremo a extremo en local (build de producción OK).
- **Calidad:** `typecheck` + `lint` limpios · **88 tests unitarios** · **8 E2E**
  (Playwright) en verde.
- **Datos:** SQLite en desarrollo (listo para migrar a Postgres/Supabase en
  Fase 2).
- **Pendiente principal:** despliegue productivo, base de datos gestionada + RLS,
  emails/WhatsApp reales y rate limiting distribuido (ver §8).

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | **Next.js** (App Router, RSC, Turbopack, `proxy.ts`) | 16.2.9 |
| UI | **React** | 19.2 |
| Lenguaje | **TypeScript** (estricto) | 5.x |
| Estilos | **Tailwind CSS v4** (`@theme`, tokens), tema claro/oscuro | 4.x |
| Animación | **framer-motion** + `canvas-confetti` | 12.x |
| Iconos | **lucide-react** | 1.x |
| Gráficas | **recharts** | 3.x |
| ORM | **Prisma** + adapter `better-sqlite3` (cliente en `src/generated/prisma`) | 7.8 |
| Base de datos | **SQLite** (dev) → Postgres/Supabase (Fase 2) | — |
| Auth | **Auth.js / NextAuth v5** (JWT), **bcryptjs** (factor 12) | 5 beta |
| Validación | **Zod** | 4.x |
| Avatares | **DiceBear v10** (`@dicebear/core` + `@dicebear/styles`, `toon-head`) | 10.2 |
| Imágenes | **sharp** (server) · **react-easy-crop** + canvas (cliente) | — |
| Excel | **exceljs** (importación/plantilla de jugadores) | 4.4 |
| Tests | **Vitest** (unit) · **Playwright** (E2E) | 4 / 1.6 |

Requisitos: **Node 22+** (DiceBear v10). Probado en Node 24.

---

## 3. Arquitectura

Capas estrictas, sin saltos:

```
app | components  →  actions  →  services  →  repositories  →  prisma
   (UI/RSC)        (server      (lógica de    (acceso a       (DB)
                    actions)     negocio)      datos)
```

- **Multi-tenant**: cada entidad lleva `escuelaId`; el cruce de tenant devuelve
  **404** (no 403) para no filtrar existencia.
- **Seguridad por dos barreras**: el `proxy.ts` es UX (Barrera 1); la seguridad
  real vive en los **servicios** (Barrera 2) con `requireRole`, `assertTenant`,
  `requireEscuela`, scoping por categorías del DT.
- **DTOs planos** siempre (nunca se devuelven modelos Prisma).
- **AuditLog** para acciones sensibles. **Rate limiting** en memoria (Fase 1).
- **Motor de stats puro** (`src/lib/stats-engine`): mismas entradas → mismas
  salidas, sin Prisma ni React. Reutilizado por evaluaciones y simulador.

### Modelos de datos (30)

Escuela, Sede, Cancha, Categoría, Entrenador, User, Jugador, CódigoInvitación,
Evaluación, StatsCalculados, Evento, JugadorConvocado, Asistencia, Conversación,
Mensaje, Anuncio, Notificación, Lead, AuditLog, ObjetivoJugador, Logro,
LogroEscuela, LogroJugador, ProgresoSemanal, ParametroFormula, ParametroEscuela,
FondoCarta, FondoDesbloqueado, etc.

### Migraciones (6)

`init` → `avatar_config` → `progreso_semanal` → `gestion_bloqueo_logros` →
`parametro_escuela` → `fondos_carta`.

---

## 4. Funcionalidades — qué TIENE ✅

### Acceso y seguridad
- Login (Auth.js v5, JWT, bcrypt 12), registro con código de invitación.
- RBAC de 4 roles + redirecciones; cabeceras de seguridad (CSP, HSTS, etc.).
- Bloqueo de acceso de familias con motivos y página `/bloqueado`.
- AuditLog de acciones sensibles; rate limiting básico.

### Landing pública
- Hero + demo en vivo de la carta (interpola niveles) usando `nino_carta.png`.

### Súper Admin
- Gestión de leads y conversión a escuela.
- Parámetros de fórmula globales: pesos, **rangos físicos por edad** y
  **umbrales de nivel** (Plata/Oro/Héroe) editables.
- **Simulador de carta** (mismo motor que las evaluaciones, en vivo).
- Gestión global de usuarios (con **filtro por escuela**) y escuelas.
- Catálogo global de logros; auditoría.

### Escuela (Admin)
- Branding (color, escudo PNG), categorías, sedes/canchas, DTs (alta + reset).
- Códigos de invitación, anuncios.
- Gestión de jugadores: editar, inactivar/reactivar, bloquear familia, reset de
  contraseña; **eliminación lógica** (solo SA) y restaurar.
- **Importación masiva por Excel (.xlsx)** con plantilla por escuela.
- **Métricas configurables por escuela** (override de rangos y umbrales).

### DT (Director Técnico)
- Plantilla con filtros por categoría; solicitudes; evaluaciones (carta "nace").
- Calendario y eventos (entrenos/partidos), convocatorias, asistencia,
  resultados → noticias.
- Logros: configurar ventanas y **otorgar**; credenciales/reset de familias.
- **Validación masiva del progreso** semanal de sus jugadores.

### Jugador / Familia
- Hub estilo "Modo Carrera": carta premium (foil/reflejos/bisel), evolución,
  objetivos, insignias, noticias.
- **Carta**: foto (recortada 3:4) o **avatar DiceBear v10** editable con todas
  las opciones; stats en **6 columnas**; sello MEN; las 4 esquinas iguales.
- **Foto del menor**: compresión + recorte 3:4 en cliente; consentimiento;
  servida por API protegida (nunca pública).
- **Progreso personal** (hábitos semanales → XP, Mentalidad/Disciplina),
  validable por el padre **o** el DT.
- **Calendario** propio (eventos de su categoría).
- **Fondos de carta por méritos**: galería con desbloqueo por logro / nivel de
  carta / nivel personal; equipar el fondo activo.
- Mensajería, logros, "Mi cuenta", PWA (manifest).

### Transversal
- Tema claro/oscuro persistente; splash de carga; búsquedas; notificaciones
  in-app (despachador con stubs de email/WhatsApp).

---

## 5. Qué NO tiene todavía ❌ (pendiente)

- **Despliegue productivo** (hosting, dominio, variables de entorno gestionadas).
- **Base de datos gestionada** (Postgres/Supabase) y **RLS** replicando las
  reglas de tenant (hoy la app es el único guardián).
- **Rate limiting distribuido** (Upstash/Redis) — hoy es en memoria.
- **Emails y WhatsApp reales** — el despachador existe pero solo INAPP está
  conectado.
- **Pagos / facturación** de cuotas (los bloqueos por PAGO son manuales).
- **Rankings/competiciones** entre escuelas (excluidos a propósito por
  privacidad de menores).
- **App móvil nativa** (hoy es PWA responsive).
- **Internacionalización** (la app está en español).
- **Observabilidad** (logs centralizados, métricas, alertas).

---

## 6. Fases y sprints

### Fase 1 — Producto base (completada)
Construcción del núcleo: arquitectura por capas, multi-tenant, auth/RBAC, motor
de stats, evaluaciones y cartas, paneles por rol, calendario, mensajería,
auditoría y la batería de tests (unit + E2E).

### Sprint V — Identidad visual (✅)
Fuente display, lucide, shell/sidebar, `PlayerCard` (bugs MEN/proporción, foto
fundida, materiales, escudo), avatar SVG editable, escudo PNG, iconos de
calendario, login pulido, filtros por categoría, hub "Modo Carrera".
*(38 unit / 7 E2E)*

### Sprint V.1 — Carta premium y progreso (✅)
Carta premium (foil/reflejos/bisel), MEN arriba-derecha, avatar DiceBear local
(fallback), nombre en 2 líneas, iconos en celdas del calendario, splash una vez
por sesión, **progreso personal** (motor XP/Mentalidad/Disciplina), tema
claro/oscuro persistente. *(49 unit / 7 E2E)*

### Sprint G — Gestión, CRUD, bloqueos y logros (✅)
Schema de bloqueo + logros + `LogroEscuela`; bloqueo de familias + `/bloqueado`;
CRUD de jugadores/DTs con inactivar/eliminar lógico; gestión global de usuarios
y escuelas; credenciales+reset por DT; catálogo de ~52 logros por posición +
ventanas + otorgar; **simulador de carta**; rangos físicos editables en BD;
despachador de notificaciones (INAPP + stubs); Mi cuenta + manifest + búsquedas.
*(64 unit / 8 E2E)*

### Sprint M — Mejoras post-G (✅)
M1 fix simulador en vivo (`CountUp`) · M2 carta con 4 esquinas iguales · M3
landing con `nino_carta.png` · M4 filtro de escuela en usuarios · M5 calendario
del jugador · M6 validación de progreso por el DT (masiva) · M7 carga masiva por
CSV + plantilla por escuela · M8 umbrales de nivel editables · M9 métricas por
escuela (`ParametroEscuela`) · M10 avatar **DiceBear v10 toon-head** con todas
las opciones. *(87 unit / 8 E2E)*

### Sprint M.1 — Correcciones y mejoras solicitadas (✅)
Fix `Body exceeded 1 MB` (`bodySizeLimit`) · importación migrada a **Excel
(.xlsx)** con exceljs · **reset del modal** de importación al cerrar · stats en
**6 columnas** · **foto con compresión + recorte 3:4** en cliente · **fondos de
carta por méritos** (configurable). *(88 unit / 8 E2E)* — ver
[CORRECCIONES-SPRINT-M1.md](CORRECCIONES-SPRINT-M1.md).

### Próximo — Sprint 8 (producción)
Despliegue, Postgres/Supabase + RLS, Upstash, emails/WhatsApp reales (ver §5).

---

## 7. Cómo ejecutarlo

```bash
cd futbol-career-mode
npm install                 # postinstall genera el cliente Prisma
npx prisma migrate deploy   # aplica migraciones
npm run db:seed             # datos demo (usuarios, fondos, etc.)
npm run dev                 # http://localhost:3000
```

Usuarios demo (contraseña `Demo1234!`): `admin@demo.app` · `escuela@demo.app` ·
`dt@demo.app` · `jugador@demo.app`.

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`,
`db:seed`, `db:reset`.

---

## 8. Seguridad (resumen)

- Fotos de menores **nunca públicas**, siempre con consentimiento; validación
  por magic bytes, strip EXIF, recompresión WebP, nombre UUID, `no-store`.
- Avatares DiceBear generados **en proceso** (sin API externa).
- `.env` nunca commiteado; contraseñas temporales cripto-seguras, mostradas una
  sola vez, nunca almacenadas/logueadas en claro.
- Detalle por endpoint en [SEGURIDAD.md](SEGURIDAD.md).

---

## 9. Documentación del repositorio

| Archivo | Contenido |
|---|---|
| `README.md` | Puesta en marcha rápida. |
| `ESTADO-DEL-PROYECTO.md` | **Este documento** (estado integral). |
| `MANUAL-DE-USO.md` | Guía de uso por rol. |
| `DECISIONES.md` | Registro de decisiones de arquitectura/producto. |
| `SEGURIDAD.md` | Checklist de seguridad por endpoint. |
| `PLAN-MEJORAS-VISUALES.md` | Plan vivo de mejoras visuales + registro. |
| `PLAN-MEJORAS-2.md` | Plan del Sprint M. |
| `CORRECCIONES-SPRINT-M1.md` | Detalle del Sprint M.1. |
| `AGENTS.md` / `CLAUDE.md` | Notas para agentes (este Next tiene cambios). |
