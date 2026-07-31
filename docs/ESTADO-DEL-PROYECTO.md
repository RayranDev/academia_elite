# Fútbol Career Mode — Estado del proyecto

Documento **de contexto**: la visión, el stack, la arquitectura y el estado
actual. Última actualización: **2026-07-31**.

> Para el **historial** de lo hecho → [TRAZABILIDAD.md](TRAZABILIDAD.md).
> Para lo que **falta** → [PENDIENTES.md](PENDIENTES.md).

---

## 0. Visión

**Academia Elite** gamifica el fútbol base. El DT toma medidas físicas y técnicas
**reales** de cada chico; el motor de stats las convierte en RIT/TIR/PAS/REG/DEF/
FIS + un sello **MEN** (mentalidad) y un **OVR de 1 a 99**; y el jugador recibe su
**carta estilo EA FC** (Bronce / Plata / Oro / Héroe).

La idea de fondo: **el progreso se gana midiéndose, no jugando a un videojuego**.
Por eso el MEN sube con la asistencia real (la *curva de desarrollo*), las cartas
solo cambian cuando hay una evaluación nueva, y no hay rankings entre escuelas —
son menores, y la comparación pública les haría daño.

Cuatro roles: `SUPER_ADMIN` (plataforma), `ESCUELA_ADMIN` (dueño del club), `DT`
(entrenador en cancha) y `JUGADOR` (la familia). Es **multi-tenant**: cada escuela
ve solo lo suyo.

---

## 1. Resumen ejecutivo

- **Estado:** **en producción** en Vercel, sobre Supabase PostgreSQL.
- **Posicionamiento:** **ERP de escuelas de fútbol**, con la carta gamificada como
  diferencial y no como centro. La carta engancha a la familia; la administración
  es lo que el dueño de la escuela compra (`DECISIONES.md` §49).
- **Mercado objetivo:** **Colombia** (Ley 1581 de habeas data, EPS, "acudiente").
  Queda pendiente pasar el copy de voseo rioplatense a tuteo neutro.
- **Calidad:** `typecheck` + `lint` limpios · **248 tests unitarios** · **6 specs
  E2E** (10 tests, Playwright) en verde · CI en cada push/PR.
- **Datos:** Supabase PostgreSQL (pooler en runtime, conexión directa para
  migraciones) + Supabase Storage para fotos, con **RLS habilitado en todas las
  tablas** del esquema `public`.
- **Riesgo abierto principal:** Auth.js sigue en **v5 beta** y falta observabilidad
  real (ver [PENDIENTES.md](PENDIENTES.md)).

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
| ORM | **Prisma** + adapter `@prisma/adapter-pg` (cliente en `src/generated/prisma`) | 7.8 |
| Base de datos | **Supabase PostgreSQL** (pooler en runtime, directa para migrar) | — |
| Storage | **Supabase Storage** (bucket privado; servido solo por API con auth) | — |
| Rate limit | **Upstash Redis** (ventana deslizante; fallback en memoria en dev) | — |
| Hosting | **Vercel** (deploy desde `main`) | — |
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
  El **portero** tiene derivación propia (`derivaStatsPortero`): sus cuatro notas
  técnicas miden blocaje, distribución, juego aéreo y achique, no control/pase/
  tiro/regate (`DECISIONES.md` §58-62).

> ⚠️ **`plantilla-simulador.service.ts` replica las fórmulas del motor a mano en
> Excel.** Todo cambio en `derivaStats*` o en los pesos tiene que replicarse ahí,
> o la planilla y la app muestran OVR distintos para el mismo jugador.

### Modelos de datos (36)

| Dominio | Modelos |
|---|---|
| Identidad y acceso | `User`, `TokenAuth`, `SoporteSesion` |
| Estructura de la escuela | `Escuela`, `Sede`, `Cancha`, `Categoria`, `Entrenador`, `EntrenadorCategoria` |
| Jugadores | `Jugador`, `CodigoInvitacion`, `ObjetivoJugador`, `ObservacionJugador` |
| Motor de cartas | `Evaluacion`, `StatsCalculados`, `ParametroFormula`, `ParametroEscuela` |
| Calendario y cancha | `Evento`, `JugadorConvocado`, `Asistencia`, `EstadisticaPartido` |
| Progreso y méritos | `ProgresoSemanal`, `Logro`, `LogroEscuela`, `LogroJugador`, `FondoCarta`, `FondoDesbloqueado` |
| Comunicación | `Conversacion`, `Mensaje`, `Anuncio`, `Notificacion` |
| **Administración / ERP** | **`Membresia`, `Arancel`** |
| Comercial y auditoría | `Lead`, `LeadNota`, `AuditLog` |

### Migraciones (12)

`init` → `token_cambio_email` → `terminos_aceptacion` → `enable_rls` →
`modos_sesion_asistencia_viva` → `enable_rls_observacion` →
`contactos_telefono_parentesco` → `partido_periodos` →
`anuncio_autor_caducidad` → `estadistica_tarjeta_azul` →
`membresia_cobranza` → `arancel`.

> Las migraciones que **crean tablas** llevan el bloque idempotente de
> re-habilitación de RLS (patrón de `enable_rls_observacion`): en Supabase una
> tabla nueva no hereda RLS y nacería expuesta a la Data API.

### Trabajos programados (`vercel.json`)

| Cron | Horario (UTC) | Qué hace |
|---|---|---|
| `/api/cron/men-diario` | 06:00 | Recalcula el bonus de MEN por asistencia (curva de desarrollo). Idempotente. |
| `/api/cron/limpiar-notificaciones` | 06:30 | Borra notificaciones leídas de más de 7 días. |

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
- **Cobranza (el módulo ERP):**
  - **Lista de precios** (`/escuela/aranceles`) por categoría y concepto
    (mensualidad, matrícula, indumentaria, torneo, transporte), con vigencia
    programable e historial: el precio de la categoría gana sobre el general y,
    dentro del mismo alcance, el más reciente ya vigente.
  - **Generación de la cobranza del mes de un click** para todos los jugadores
    activos. Idempotente: repetirla no toca las cuotas existentes ni pisa un pago.
  - **Registro real del pago**: fecha, medio (efectivo, transferencia, Nequi,
    Daviplata) y comprobante. Descuentos por beca o hermano.
  - **Estado y deuda derivados**: una cuota pendiente de un mes cerrado se marca
    vencida sola; el dashboard muestra monto vencido y jugadores en mora.
  - Export de cobranza a Excel con neto y total.

### Súper Admin — acceso a un tenant
- El SUPER_ADMIN **no** tiene acceso ambiental a los datos de una escuela: entra
  por una **sesión de soporte** (`SoporteSesion`) explícita, temporal y auditada.
  Nace en solo lectura; escribir requiere habilitarla y exige un motivo que va al
  `AuditLog`.

### DT (Director Técnico)
- Plantilla con filtros por categoría; solicitudes; evaluaciones (carta "nace").
- Calendario y eventos (entrenos/partidos), convocatorias, asistencia,
  resultados → noticias.
- **Modo Sesión**: corre el entrenamiento o el partido como flujo guiado en
  cancha — asistencia viva, observaciones por jugador, y en partido los períodos,
  goles y tarjetas (`EstadisticaPartido`).
- Logros: configurar ventanas y **otorgar**; credenciales/reset de familias.
- **Validación masiva del progreso** semanal de sus jugadores.

### Curva de desarrollo (progreso entre evaluaciones)
Está **construida y corriendo en producción** (`src/lib/curva.ts`,
`curva.service.ts`, cron `men-diario`). Diseño conceptual en
[CURVA-DE-DESARROLLO.md](CURVA-DE-DESARROLLO.md).

- La asistencia real mueve el **MEN** día a día: **+0.6** por entrenamiento y
  **+1.2** por partido, con tope de **+12** y penalización de −1.5 por ausencia a
  partir de la tercera.
- Ventana móvil de 30 días **recalculada desde cero**: idempotente (el cron puede
  correr varias veces sin desviar) y recuperable (las ausencias envejecen y salen).
- El hub del jugador aplica el bonus **en vivo** sobre la carta y recalcula el
  OVR. Ranking, exports y evolución histórica siguen usando el OVR **medido**, así
  que la comparabilidad no se rompe.
- **Los stats físicos y técnicos (RIT, TIR, PAS, REG, DEF, FIS) solo cambian con
  una evaluación real.** Es la tesis del producto: un Oro inflado por tiempo no
  vale lo que un Oro medido.
- Lo que **falta**: hoy cuenta la presencia, no el rendimiento —
  `EstadisticaPartido` (goles, asistencias, minutos) no alimenta la curva, así que
  un jugador que marca tres goles suma lo mismo que uno que fue y no jugó. Ver
  [PENDIENTES.md](PENDIENTES.md).

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

## 5. Qué NO tiene todavía ❌

El detalle vive en **[PENDIENTES.md](PENDIENTES.md)** (con tamaño y razón). En
titulares:

- **Riesgo**: la **decisión de Auth** (sigue en v5 beta) y **observabilidad** real.
- **ERP**: ficha administrativa y médica del jugador (documento, EPS, RH,
  alergias, apto médico, contacto de emergencia), descuentos como regla, caja y
  egresos, staff más allá del DT.
- **Progresión**: conectar el rendimiento en partido a la curva y una vista de
  seguimiento para el DT.
- **Localización**: pasar el copy de voseo a tuteo neutro para Colombia.

Fuera de alcance a propósito: **rankings entre escuelas** (privacidad de menores),
**app nativa** e **internacionalización**.

> **Cambio de alcance (2026-07-31):** "pagos/facturación" **dejó de estar fuera
> de alcance**. Con el giro a ERP la cobranza pasó al frente de la fila y su
> primer tramo ya está construido (`DECISIONES.md` §49, hito 18 de
> `TRAZABILIDAD.md`).

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
[TRAZABILIDAD.md](TRAZABILIDAD.md).

### Sprint M.2 — Carta, foto y registro del padre (✅)
Encuadre de la foto (cabeza completa) · reactividad al cambiar foto
(cache-buster) · foto transparente + marco por nivel con **Héroe especial** ·
**registro/vinculación del padre por códigos** (`codigoJugador`, página
`/registro`) · **descarga de la carta con marca de agua** · simulador del SA que
prueba fondos/avatares/fotos. *(91 unit / 8 E2E)* — ver
[TRAZABILIDAD.md](TRAZABILIDAD.md).

### Sprint 8 — Producción (✅)
Despliegue en Vercel, migración a Supabase PostgreSQL con **RLS**, rate limiting
distribuido con **Upstash Redis** (con fallback en memoria para dev/E2E) y correo
transaccional real con **Resend**. E2E en verde sobre Postgres.

### Ronda `mejoras.pdf` (✅)
Onboarding, Apartado Eventos, Entrenamiento dinámico, notificaciones in-app y
endurecimiento de validación (`textoSeguro` en todos los campos de texto libre).

### Giro a ERP — cobranza (✅ primer tramo, 2026-07-31)
Reorientación del producto (§1). Dinero en `Decimal`, registro real del pago,
lista de precios por categoría, generación masiva de la cobranza del mes, y
estado/deuda derivados. Detalle en el hito 18 de
[TRAZABILIDAD.md](TRAZABILIDAD.md).

### Próximo
Cerrar el módulo administrativo (ficha del jugador, descuentos como regla, caja)
y conectar el rendimiento en partido a la curva de desarrollo. Ver
[PENDIENTES.md](PENDIENTES.md).

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

Tres tipos de documento, sin superposición: **contrato**, **contexto** e
**historial/futuro**.

| Archivo | Contenido |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | **Contrato** para agentes: reglas no negociables. |
| `README.md` | Puesta en marcha rápida. |
| `ESTADO-DEL-PROYECTO.md` | **Este documento**: visión, stack, arquitectura, estado. |
| `DECISIONES.md` | Decisiones de arquitectura/producto y su porqué. |
| `SEGURIDAD.md` | Checklist de seguridad por endpoint. |
| `HABEAS-DATA.md` | Tratamiento de datos personales de menores. |
| `CURVA-DE-DESARROLLO.md` | Diseño conceptual de la curva (MEN diario). |
| `GUIA-FONDOS.md` | Cómo funcionan los fondos y efectos de carta. |
| `MANUAL-DE-USO.md` | Guía de uso por rol. |
| `ACADEMIA-ELITE-DEMO.md` | Credenciales y resumen de la escuela demo. |
| `NGROK-PASO-A-PASO.md` | Exponer el dev local (útil para probar en celular). |
| **`TRAZABILIDAD.md`** | **Historial único** de todo lo hecho. |
| **`PENDIENTES.md`** | **Lo que falta** por hacer. |

> Cuando un plan se ejecuta, su resumen va a `TRAZABILIDAD.md` y el documento del
> plan se elimina: el detalle queda en git. Así no conviven dos versiones de la
> verdad. Por eso ya no existen `PLAN-MAESTRO-v4.md`, `PLAN-UX-DT.md` ni
> `HOJA-DE-RUTA.md`.
