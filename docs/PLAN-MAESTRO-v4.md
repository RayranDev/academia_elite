# ⚽ FÚTBOL CAREER MODE — REAL LIFE
# PLAN MAESTRO v4 — Documento único, completo y autosuficiente

> **Reemplaza a v3.** Este documento está escrito para ser entregado a una IA de
> desarrollo (Antigravity, OpenClaw, Claude Code o similar) y contiene TODO lo
> necesario: arquitectura, seguridad, modelo de datos completo, contratos de API,
> diseño UI estilo FC26, roadmap con checkpoints, protocolo de guía al usuario,
> manual de uso y definición de listo. No requiere ningún documento adicional.

---

## 0. INSTRUCCIONES PARA LA IA IMPLEMENTADORA (LEER PRIMERO)

Eres la IA que construirá este proyecto junto a un usuario humano que trabaja en
**Windows** y puede tener poca experiencia técnica. Reglas obligatorias:

1. **Trabaja por sprints** (Sección 17). Nunca avances al siguiente sprint sin
   que el checkpoint del actual esté verificado por el usuario.
2. **Guía paso a paso** (Sección 18): antes de cada bloque de trabajo, explica en
   1–3 frases QUÉ vas a hacer y POR QUÉ. Después, dile al usuario exactamente qué
   comando ejecutar o qué URL abrir para verificar.
3. **Nunca inventes decisiones de producto.** Todas están cerradas en la Sección 3.
   Si encuentras un vacío real, pregunta al usuario con opciones A/B concretas.
4. **Respeta las capas y responsabilidades** de la Sección 5. Está prohibido:
   - Llamar a Prisma directamente desde componentes o páginas.
   - Lógica de negocio dentro de componentes de UI.
   - Queries sin filtro `escuelaId` (salvo SUPER_ADMIN, y aun así auditado).
5. **Seguridad no es negociable** (Sección 6). Cada endpoint nuevo debe pasar el
   checklist de seguridad antes de marcarse como terminado.
6. **Commits pequeños y descriptivos** al final de cada tarea, en español:
   `feat(dt): evaluación con dimensiones de mentalidad`.
7. **Todo en español**: UI, comentarios de dominio, mensajes de error al usuario.
   Nombres de variables/funciones en inglés (convención estándar de código).
8. Si una librería cambió de API respecto a lo aquí descrito, **adapta** pero
   documenta el cambio en `DECISIONES.md` en la raíz del repo.

---

## 1. VISIÓN

Plataforma web **multi-escuela** que gamifica la formación en fútbol base:
evaluaciones físicas, técnicas y **de mentalidad** reales se transforman en una
carta estilo EA FC con stats 1–99, niveles (Bronce/Plata/Oro/Héroe), evolución
histórica y logros. La experiencia del jugador imita el **Modo Carrera de FC26**:
un *hub* central con su carta, próximos partidos y entrenamientos, calendario de
temporada, bandeja de mensajes/noticias del club, objetivos de desarrollo y
vitrina de logros. Cuatro paneles protegidos por rol + landing pública animada
que capta escuelas.

---

## 2. CAMBIOS Y CORRECCIONES RESPECTO A v3

| # | Corrección / Añadido | Motivo |
|---|---|---|
| 1 | **Nuevo módulo: Mensajería** (Sección 9) | Faltaba. Imita la bandeja de "correo del club" de FC26. Con reglas estrictas de protección al menor. |
| 2 | **Nuevo módulo: Calendario + Eventos unificados** (Sección 10) | v3 tenía `Convocatoria` suelta. Ahora `Evento` unifica PARTIDO / ENTRENAMIENTO / EVALUACION / OTRO, y alimenta calendario, "próximos eventos" y recordatorios. |
| 3 | **Dashboard del jugador rediseñado como hub de Modo Carrera** (Sección 12) | Es el corazón de la semejanza con FC26. |
| 4 | **Prisma + SQLite NO soporta `enum`** | Error latente de v3. Todos los enums se modelan como `String` + validación Zod + constantes TypeScript. Al migrar a Postgres (Fase 2) pueden convertirse en enums nativos si se desea. |
| 5 | **Subida de fotos a `/public` no funciona en Vercel** (filesystem de solo lectura) | En Fase 1 local se usa carpeta `./storage/uploads` servida por un route handler con control de acceso (las fotos de menores **nunca** se sirven como estáticos públicos, ni siquiera en local). Fase 2: Supabase Storage con URLs firmadas. |
| 6 | **Auth.js v5 (NextAuth) + middleware ≠ seguridad suficiente** | El middleware de Next.js es solo la primera barrera (UX). La autorización real vive en la capa de servicios. v3 lo insinuaba; v4 lo hace obligatorio y verificable. |
| 7 | **Nueva tabla `AuditLog`** | Trazabilidad de acciones sensibles (anular evaluación, cambiar consentimiento, eliminar jugador, acceso de SUPER_ADMIN a datos de escuela). |
| 8 | **Nueva tabla `Notificacion`** | Recordatorios in-app (evaluación vencida, convocatoria pendiente, mensaje nuevo) desacoplados del email (Fase 2). |
| 9 | **`Membresia`/pagos se pospone a Fase 2** | Reduce alcance de Fase 1 sin perder demo. La tabla queda en el schema, sin UI. |
| 10 | **Objetivos de desarrollo del jugador** (`ObjetivoJugador`) | Pieza clave del Modo Carrera de FC26: "el DT te pide subir PAS a 70 antes de marzo". Refuerza la gamificación sin rankings entre niños. |
| 11 | Versionado de fórmula se mantiene, pero ahora con tabla `ParametroFormula` editable por SUPER_ADMIN en vez de constantes hardcodeadas | Lo pedía la decisión #7 de v3 ("configurable") pero no tenía soporte de datos. |

Todo lo demás de v3 (decisiones 1–9, motor de stats v1.1, anti-inflación de
bonus, landing, multi-tenant, roadmap base) **sigue vigente** y se integra aquí.

---

## 3. DECISIONES CERRADAS (CONSOLIDADO v4)

| # | Tema | Decisión |
|---|---|---|
| 1 | Alcance | Multi-escuela desde el día 1 (multi-tenant por `escuelaId`) |
| 2 | Landing | Informativa + formulario de captación de escuelas (leads) |
| 3 | Identidad | Diseño "Noche de estadio" + white-label ligero por escuela |
| 4 | Alta de jugadores | Doble vía: registro por DT + auto-registro del padre con código de invitación y aprobación del DT |
| 5 | Evaluación | 4 pruebas físicas + 4 técnicas + 4 dimensiones de mentalidad |
| 6 | Foto en carta | Foto real con consentimiento del padre; fallback automático a avatar |
| 7 | Frecuencia de evaluación | Configurable por escuela (`frecuenciaEvaluacionDias`) |
| 8 | Logros | Mixto: insignias visuales + logros con bonus real (anti-inflación, tope +3) |
| 9 | Entorno | Windows local → GitHub privado → Vercel + Supabase |
| 10 | **Mensajería** | DT/Escuela ↔ **Padre** (nunca chat directo adulto↔menor). Anuncios por categoría. El panel del jugador muestra "Noticias del club" de solo lectura, redactadas por el DT/escuela. |
| 11 | **Calendario** | Modelo `Evento` unificado (partido, entrenamiento, evaluación, otro). Vista mensual + lista "próximos". Confirmación de asistencia del padre por evento. |
| 12 | **Estética del panel jugador** | Hub estilo Modo Carrera FC26: carta protagonista, tiles de próximos eventos, bandeja de noticias, objetivos, evolución. |
| 13 | Rankings | Sin rankings públicos entre niños. Comparación solo contra uno mismo. |
| 14 | Idioma / posiciones / inmutabilidad | Español; POR/DEF/MED/DEL; evaluaciones inmutables (corrección = nueva evaluación + anulación por admin, auditada). |
| 15 | Pagos | Tabla en schema, **sin UI hasta Fase 2**. |
| 16 | Recuperación de contraseña por email | Fase 2 (en Fase 1, el admin de escuela puede regenerar contraseña de sus usuarios; queda auditado). |

---

## 4. STACK TECNOLÓGICO

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Server Components por defecto; `"use client"` solo donde hay interacción/animación. |
| Lenguaje | **TypeScript estricto** | `"strict": true`, sin `any` salvo justificado con comentario. |
| Estilos | **Tailwind CSS** | + tokens de diseño en `tailwind.config.ts` (Sección 12). |
| Animación | **Framer Motion** + canvas-confetti + count-up | Lottie opcional. Presets centralizados en `lib/motion-presets.ts`. |
| ORM | **Prisma** | SQLite local → Supabase Postgres en Fase 2. Sin enums nativos (ver Sección 2.4). |
| Auth | **Auth.js v5 (NextAuth)** con Credentials + sesión JWT | RBAC propio encima (Sección 6.2). Hash con **bcrypt** (factor 12). |
| Validación | **Zod** | Toda entrada externa (formularios, API, params) se valida con Zod. Esquemas compartidos en `lib/validators/`. |
| Gráficos | **Recharts** | Evolución de OVR y stats. |
| Fechas | **date-fns** (locale `es`) | Calendario y recordatorios. |
| Sanitización | Mensajes en **texto plano** (sin HTML) | Elimina XSS por diseño; ver Sección 9.4. |
| Tests | **Vitest** (unitario: motor de stats, RBAC) + **Playwright** (E2E de flujos críticos) | Sección 19. |

Un solo repo, una sola app: landing + 4 paneles + API.

---

## 5. ARQUITECTURA POR CAPAS Y RESPONSABILIDADES

### 5.1 Diagrama de capas (dependencias solo hacia abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1 · PRESENTACIÓN                                       │
│  src/app/** (páginas, layouts) · src/components/**           │
│  Responsabilidad: renderizar, animar, capturar input.        │
│  PROHIBIDO: lógica de negocio, acceso a Prisma, cálculos.    │
├─────────────────────────────────────────────────────────────┤
│  CAPA 2 · APLICACIÓN (API / Server Actions)                  │
│  src/app/api/** · src/actions/**                             │
│  Responsabilidad: autenticar, validar (Zod), autorizar       │
│  (RBAC), orquestar servicios, mapear errores a HTTP.         │
│  PROHIBIDO: queries directas, reglas de dominio.             │
├─────────────────────────────────────────────────────────────┤
│  CAPA 3 · DOMINIO / SERVICIOS                                │
│  src/services/** · src/lib/stats-engine/**                   │
│  Responsabilidad: reglas de negocio (motor de stats, logros, │
│  anti-inflación, estados de jugador, ventanas de evaluación).│
│  Recibe SIEMPRE un `ctx: AuthContext` y aplica scoping       │
│  multi-tenant. PROHIBIDO: conocer HTTP o React.              │
├─────────────────────────────────────────────────────────────┤
│  CAPA 4 · DATOS                                              │
│  src/repositories/** · prisma/**                             │
│  Responsabilidad: acceso a datos. Cada método de repositorio │
│  exige `escuelaId` en su firma (salvo los globales de        │
│  SUPER_ADMIN, marcados con sufijo `Global`).                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Contrato de `AuthContext`

Toda función de servicio recibe como primer argumento:

```ts
// src/lib/auth/context.ts
export type Rol = "SUPER_ADMIN" | "ESCUELA_ADMIN" | "DT" | "JUGADOR";

export interface AuthContext {
  userId: string;
  rol: Rol;
  escuelaId: string | null;   // null SOLO para SUPER_ADMIN
  entrenadorId?: string;       // presente si rol === "DT"
  jugadorId?: string;          // presente si rol === "JUGADOR"
}
```

Reglas:
- La Capa 2 construye el `AuthContext` desde la sesión y **nunca** desde el body.
- La Capa 3 valida pertenencia (`assertTenant(ctx, recurso.escuelaId)`) antes de
  cualquier lectura/escritura.
- Los repositorios no aceptan "buscar por id" sin `escuelaId` acompañante.

### 5.3 Matriz de responsabilidades por módulo

| Módulo | Servicio (Capa 3) | Responsabilidad única |
|---|---|---|
| Identidad | `auth.service` | login, alta de usuarios, regeneración de contraseña, vinculación padre↔jugador |
| Escuelas | `escuela.service` | CRUD escuela, branding, parámetros (frecuencia evaluación) |
| Plantillas | `jugador.service` | alta doble vía, aprobación, estados PENDIENTE/ACTIVO/INACTIVO, consentimiento de foto |
| Evaluación | `evaluacion.service` | crear evaluación inmutable, anular (admin), ventanas de vencimiento |
| Stats | `stats-engine` (lib pura) | normalización, ponderaciones, OVR, MEN, nivel de carta, versión de fórmula. **Funciones puras, 100% testeadas.** |
| Logros | `logro.service` | detección de logros tras cada evaluación/asistencia, aplicación de bonus con tope |
| Eventos | `evento.service` | CRUD eventos, convocatorias, confirmaciones, generación de recordatorios |
| Mensajería | `mensaje.service` | hilos DT↔padre, anuncios, noticias del club, reglas de protección al menor |
| Notificaciones | `notificacion.service` | crear/leer/marcar; consumida por eventos, mensajes y evaluaciones |
| Leads | `lead.service` | captura desde landing (rate-limited), pipeline NUEVO→CONTACTADO→CONVERTIDO/DESCARTADO |
| Auditoría | `audit.service` | registro append-only de acciones sensibles |

### 5.4 Reglas de componetización (Capa 1)

1. **Componentes de presentación puros** en `src/components/ui/` (Button, Card,
   Badge, Modal, Tabs, EmptyState, Skeleton): sin fetch, sin negocio, props
   tipadas, variantes con `class-variance-authority` o equivalente simple.
2. **Componentes de dominio** en `src/components/<dominio>/` (p. ej.
   `cards/PlayerCard.tsx`, `calendar/MonthGrid.tsx`, `messages/ThreadList.tsx`):
   componen UI + reciben datos ya cargados por la página (Server Component).
3. **Un componente = un archivo = una responsabilidad.** Si supera ~150 líneas o
   mezcla dos preocupaciones, se divide.
4. **La carta del jugador (`PlayerCard`) es un componente único reutilizado** en:
   landing (demo), panel DT (mini), panel jugador (hero), histórico (snapshot).
   Variantes por prop: `size: "sm" | "md" | "hero"`, `interactive: boolean`
   (tilt 3D solo en hero/landing), `data: PlayerCardData` (DTO plano, nunca el
   modelo Prisma).
5. **Nada de fetch en cliente salvo necesidad real** (confirmaciones, mensajes
   nuevos): preferir Server Components + Server Actions con revalidación.
6. Animaciones siempre vía presets de `lib/motion-presets.ts` y siempre
   condicionadas a `prefers-reduced-motion`.

---

## 6. SEGURIDAD (OBLIGATORIO, VERIFICABLE POR CHECKLIST)

La plataforma maneja **datos de menores de edad**: nombre, fecha de nacimiento,
fotos y métricas físicas. El estándar de seguridad es el de una app de datos
sensibles, no el de un side-project.

### 6.1 Autenticación

- Auth.js v5, estrategia Credentials (email + contraseña) con sesión JWT
  (cookie `httpOnly`, `secure` en producción, `sameSite=lax`).
- Contraseñas: **bcrypt, factor 12**. Nunca se loguean ni se devuelven.
- Política mínima: 8+ caracteres, no estar en lista de contraseñas comunes
  (validación Zod + lista corta embebida).
- Intentos de login: **rate limit 5/minuto por IP+email**; al exceder, respuesta
  genérica con espera incremental. Los mensajes de error de login son siempre
  genéricos ("credenciales inválidas") para no revelar existencia de cuentas.
- Sesión: expiración 7 días, renovación deslizante. Logout invalida cookie.
- El registro público SOLO existe vía **código de invitación** válido y no
  caducado; crea usuario padre + jugador en estado PENDIENTE.

### 6.2 Autorización (RBAC en dos barreras)

**Barrera 1 — Middleware (UX, no seguridad):** por prefijo de ruta redirige a
`/login` o al panel del rol. `/admin`→SUPER_ADMIN, `/escuela`→ESCUELA_ADMIN,
`/dt`→DT, `/jugador`→JUGADOR.

**Barrera 2 — Capa de aplicación + servicios (la seguridad real):**

```ts
// src/lib/auth/guards.ts — usados al inicio de toda action/route
requireRole(ctx, ["DT", "ESCUELA_ADMIN"]);   // 403 si no
assertTenant(ctx, recurso.escuelaId);         // 404 si cruza tenant
assertOwnPlayer(ctx, jugadorId);              // padre/jugador solo ve lo suyo
```

Reglas duras:
- Cruce de tenant devuelve **404, no 403** (no confirmar existencia del recurso).
- El DT solo opera sobre **sus categorías asignadas** (`EntrenadorCategoria`).
- El rol JUGADOR (cuenta gestionada por el padre) es de **solo lectura** salvo:
  confirmar convocatorias, marcar mensajes leídos, gestionar consentimiento de
  foto y subir foto.
- SUPER_ADMIN puede entrar a datos de una escuela solo vía acciones explícitas
  que escriben en `AuditLog` (motivo incluido).

### 6.3 Multi-tenant

- Todo modelo con datos de escuela lleva `escuelaId` **no nulo** e indexado.
- Repositorios: firma obligatoria `(escuelaId: string, ...)`. Lint rule/test que
  falla si un método de repositorio no-global omite `escuelaId`.
- Fase 2 (Supabase): **RLS activado en todas las tablas** replicando estas
  reglas; la app deja de ser el único guardián.

### 6.4 Protección específica de menores

1. **Fotos:** se almacenan fuera de `/public`; se sirven por
   `GET /api/archivos/foto/[jugadorId]` que verifica sesión + tenant +
   (consentimiento vigente O ser el propio padre/DT de su categoría). Sin
   consentimiento → siempre avatar. Revocación de consentimiento surte efecto
   inmediato (la URL deja de servir la foto). EXIF se elimina al subir; la
   imagen se redimensiona (máx. 800px) y se recomprime (elimina payloads).
   Tipos permitidos: JPEG/PNG/WebP, máx. 5 MB, validados por **magic bytes**,
   no por extensión. Nombre de archivo regenerado (UUID).
2. **Mensajería:** ningún canal de chat directo adulto↔menor (Sección 9).
3. **Sin rankings públicos**; las métricas de un niño solo las ven su padre,
   sus DTs y el admin de su escuela.
4. **Observaciones privadas** de la evaluación: visibles solo para padre y DT,
   nunca en la carta ni en noticias.
5. Datos mínimos: no se piden DNI, dirección ni teléfono del menor.

### 6.5 Validación, inyección y XSS

- **Zod en cada frontera**: body, query params, route params, FormData. Lo que
  no valida, responde 400 con mensaje genérico (detalle solo en dev).
- Prisma parametriza SQL (sin `queryRaw` salvo necesidad justificada y revisada).
- React escapa por defecto; **prohibido `dangerouslySetInnerHTML`**.
- Mensajes y observaciones: texto plano, longitud máxima (2.000 chars),
  recorte de espacios, normalización Unicode.
- IDs públicos: **cuid/uuid**, nunca autoincrementales (evita enumeración).

### 6.6 Cabeceras, CSRF y rate limiting

- `next.config.ts` añade: `Content-Security-Policy` (sin `unsafe-eval`;
  `img-src 'self' data:`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` mínima. HSTS en producción.
- Server Actions de Next ya validan origen; para route handlers de mutación se
  verifica cabecera `Origin`/`Sec-Fetch-Site`.
- Rate limiting (en memoria en Fase 1, Upstash/Redis en Fase 2):
  login 5/min · formulario de leads 3/hora por IP + honeypot + tiempo mínimo de
  llenado · subida de fotos 10/día por usuario · mensajes 30/hora por usuario.

### 6.7 Auditoría y errores

- `AuditLog` append-only: quién, qué acción, sobre qué entidad, cuándo, motivo.
  Acciones auditadas mínimo: anular evaluación, cambiar/revocar consentimiento,
  eliminar/desactivar jugador, regenerar contraseña, acceso SUPER_ADMIN a
  escuela, conversión de lead, cambio de parámetros de fórmula.
- Errores: nunca exponer stack traces ni mensajes de Prisma al cliente. Mapeo
  central de errores de dominio → HTTP en Capa 2.
- `.env` fuera del repo; `.env.example` documentado (Apéndice A). Secrets de
  producción solo en Vercel/Supabase.

### 6.8 Checklist por endpoint (la IA lo verifica antes de cerrar cada tarea)

```
[ ] Sesión verificada y AuthContext construido desde sesión (no del body)
[ ] requireRole aplicado
[ ] Input validado con Zod (body/params/query)
[ ] assertTenant / assertOwnPlayer aplicado sobre cada recurso tocado
[ ] Respuestas de error genéricas (404 en cruce de tenant)
[ ] Sin datos sensibles de más en la respuesta (DTOs, no modelos Prisma)
[ ] Acción sensible → AuditLog
[ ] Rate limit si es endpoint público o de escritura frecuente
```

---

## 7. MODELO DE DATOS — SCHEMA PRISMA COMPLETO (Fase 1, SQLite)

> Nota: SQLite vía Prisma **no soporta enums**; los campos tipo enum son
> `String` validados por Zod y tipados con union types en `src/types/`.
> Comentario `// enum:` documenta los valores permitidos.

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  nombre        String
  rol           String   // enum: SUPER_ADMIN | ESCUELA_ADMIN | DT | JUGADOR
  escuelaId     String?
  escuela       Escuela? @relation(fields: [escuelaId], references: [id])
  entrenador    Entrenador?
  jugadores     Jugador[]        // un padre puede tener varios hijos
  mensajesEnviados   Mensaje[]   @relation("MensajesEnviados")
  notificaciones     Notificacion[]
  activo        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([escuelaId])
}

model Escuela {
  id                       String  @id @default(cuid())
  nombre                   String
  slug                     String  @unique
  logoUrl                  String?
  colorPrimario            String  @default("#4ADE80")
  frecuenciaEvaluacionDias Int     @default(30)
  topeBonusEntreEvals      Int     @default(3)
  activa                   Boolean @default(true)
  users        User[]
  sedes        Sede[]
  categorias   Categoria[]
  entrenadores Entrenador[]
  jugadores    Jugador[]
  eventos      Evento[]
  conversaciones Conversacion[]
  anuncios     Anuncio[]
  codigos      CodigoInvitacion[]
  createdAt    DateTime @default(now())
}

model Sede {
  id        String  @id @default(cuid())
  escuelaId String
  escuela   Escuela @relation(fields: [escuelaId], references: [id])
  nombre    String
  direccion String?
  canchas   Cancha[]
  @@index([escuelaId])
}

model Cancha {
  id      String @id @default(cuid())
  sedeId  String
  sede    Sede   @relation(fields: [sedeId], references: [id])
  nombre  String
  eventos Evento[]
}

model Categoria {
  id        String  @id @default(cuid())
  escuelaId String
  escuela   Escuela @relation(fields: [escuelaId], references: [id])
  nombre    String   // "Sub-12"
  anioDesde Int
  anioHasta Int
  jugadores Jugador[]
  entrenadores EntrenadorCategoria[]
  eventos   Evento[]
  anuncios  Anuncio[]
  @@index([escuelaId])
}

model Entrenador {
  id        String  @id @default(cuid())
  userId    String  @unique
  user      User    @relation(fields: [userId], references: [id])
  escuelaId String
  escuela   Escuela @relation(fields: [escuelaId], references: [id])
  categorias EntrenadorCategoria[]
  evaluaciones Evaluacion[]
  @@index([escuelaId])
}

model EntrenadorCategoria {
  entrenadorId String
  categoriaId  String
  entrenador   Entrenador @relation(fields: [entrenadorId], references: [id])
  categoria    Categoria  @relation(fields: [categoriaId], references: [id])
  @@id([entrenadorId, categoriaId])
}

model Jugador {
  id                 String   @id @default(cuid())
  escuelaId          String
  escuela            Escuela  @relation(fields: [escuelaId], references: [id])
  categoriaId        String
  categoria          Categoria @relation(fields: [categoriaId], references: [id])
  padreUserId        String?
  padre              User?    @relation(fields: [padreUserId], references: [id])
  nombre             String
  apellido           String
  fechaNacimiento    DateTime
  posicion           String   // enum: POR | DEF | MED | DEL
  dorsal             Int?
  estado             String   @default("PENDIENTE") // enum: PENDIENTE | ACTIVO | INACTIVO
  fotoUrl            String?
  consentimientoFoto Boolean  @default(false)
  consentimientoFotoFecha DateTime?
  evaluaciones    Evaluacion[]
  stats           StatsCalculados[]
  asistencias     Asistencia[]
  convocatorias   JugadorConvocado[]
  logros          LogroJugador[]
  objetivos       ObjetivoJugador[]
  createdAt       DateTime @default(now())
  @@index([escuelaId, categoriaId])
  @@index([padreUserId])
}

model CodigoInvitacion {
  id          String   @id @default(cuid())
  escuelaId   String
  escuela     Escuela  @relation(fields: [escuelaId], references: [id])
  categoriaId String
  codigo      String   @unique // 8 chars alfanum, generado cripto-seguro
  usosMaximos Int      @default(1)
  usos        Int      @default(0)
  expiraEn    DateTime
  activo      Boolean  @default(true)
  @@index([escuelaId])
}

model Evaluacion {
  id            String   @id @default(cuid())
  escuelaId     String
  jugadorId     String
  jugador       Jugador  @relation(fields: [jugadorId], references: [id])
  entrenadorId  String
  entrenador    Entrenador @relation(fields: [entrenadorId], references: [id])
  fecha         DateTime @default(now())
  anulada       Boolean  @default(false)   // solo admin, auditado
  // 4 físicas (medidas crudas)
  sprint30mSeg     Float
  saltoVerticalCm  Float
  agilidadIllinoisSeg Float
  resistenciaYoyoNivel Float
  // 4 técnicas (nota 1-10)
  controlBalon  Float
  pase          Float
  tiro          Float
  regate        Float
  // 4 mentalidad (nota 1-10)
  actitud       Float
  concentracion Float
  trabajoEquipo Float
  resiliencia   Float
  observacionesPrivadas String?   // visible solo padre + DT
  statsCalculados StatsCalculados?
  @@index([escuelaId, jugadorId])
}

model StatsCalculados {
  id            String @id @default(cuid())
  escuelaId     String
  jugadorId     String
  jugador       Jugador @relation(fields: [jugadorId], references: [id])
  evaluacionId  String  @unique
  evaluacion    Evaluacion @relation(fields: [evaluacionId], references: [id])
  rit Int
  tir Int
  pas Int
  reg Int
  def Int
  fis Int
  men Int
  ovr Int
  nivel String           // enum: BRONCE | PLATA | ORO | HEROE
  bonusAplicado Int @default(0)   // suma de bonus incluida en esta carta
  versionFormula String @default("v1.1")
  createdAt DateTime @default(now())
  @@index([escuelaId, jugadorId])
}

model Evento {
  id          String   @id @default(cuid())
  escuelaId   String
  escuela     Escuela  @relation(fields: [escuelaId], references: [id])
  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])
  canchaId    String?
  cancha      Cancha?  @relation(fields: [canchaId], references: [id])
  tipo        String   // enum: PARTIDO | ENTRENAMIENTO | EVALUACION | OTRO
  titulo      String   // "vs. Academia Sur" / "Entrenamiento técnico"
  rival       String?  // solo PARTIDO
  esLocal     Boolean? // solo PARTIDO
  inicio      DateTime
  fin         DateTime
  notas       String?
  resultadoLocal     Int?   // carga post-partido (opcional, para el hub)
  resultadoVisitante Int?
  convocados  JugadorConvocado[]
  asistencias Asistencia[]
  createdAt   DateTime @default(now())
  @@index([escuelaId, categoriaId, inicio])
}

model JugadorConvocado {
  eventoId   String
  jugadorId  String
  evento     Evento  @relation(fields: [eventoId], references: [id])
  jugador    Jugador @relation(fields: [jugadorId], references: [id])
  confirmacion String @default("PENDIENTE") // enum: PENDIENTE | CONFIRMADO | RECHAZADO
  confirmadoEn DateTime?
  @@id([eventoId, jugadorId])
}

model Asistencia {
  id        String  @id @default(cuid())
  escuelaId String
  eventoId  String
  evento    Evento  @relation(fields: [eventoId], references: [id])
  jugadorId String
  jugador   Jugador @relation(fields: [jugadorId], references: [id])
  presente  Boolean
  @@unique([eventoId, jugadorId])
  @@index([escuelaId, jugadorId])
}

model Conversacion {
  id          String   @id @default(cuid())
  escuelaId   String
  escuela     Escuela  @relation(fields: [escuelaId], references: [id])
  jugadorId   String   // hilo SIEMPRE anclado a un jugador concreto
  asunto      String
  mensajes    Mensaje[]
  cerrada     Boolean  @default(false)
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
  @@index([escuelaId, jugadorId])
}

model Mensaje {
  id             String   @id @default(cuid())
  conversacionId String
  conversacion   Conversacion @relation(fields: [conversacionId], references: [id])
  remitenteId    String
  remitente      User     @relation("MensajesEnviados", fields: [remitenteId], references: [id])
  cuerpo         String   // texto plano, máx 2000
  leidoPorDestinatario Boolean @default(false)
  createdAt      DateTime @default(now())
  @@index([conversacionId, createdAt])
}

model Anuncio {
  id          String   @id @default(cuid())
  escuelaId   String
  escuela     Escuela  @relation(fields: [escuelaId], references: [id])
  categoriaId String?  // null = toda la escuela
  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  autorRol    String   // DT | ESCUELA_ADMIN
  titulo      String
  cuerpo      String   // texto plano
  fijado      Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([escuelaId, categoriaId, createdAt])
}

model Notificacion {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tipo      String   // enum: EVALUACION_VENCIDA | CONVOCATORIA | MENSAJE | LOGRO | ANUNCIO | SISTEMA
  titulo    String
  cuerpo    String?
  url       String?  // deep-link interno
  leida     Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([userId, leida, createdAt])
}

model Logro {
  id          String @id @default(cuid())
  codigo      String @unique   // "ASISTENCIA_PERFECTA_SEMANA"
  nombre      String
  descripcion String
  tipo        String           // enum: INSIGNIA | BONUS
  statBonus   String?          // enum: RIT|TIR|PAS|REG|DEF|FIS|MEN (solo BONUS)
  valorBonus  Int?             // normalmente 1
  icono       String           // nombre de icono/lottie
}

model LogroJugador {
  id        String  @id @default(cuid())
  escuelaId String
  jugadorId String
  jugador   Jugador @relation(fields: [jugadorId], references: [id])
  logroId   String
  logro     Logro   @relation(fields: [logroId], references: [id])
  otorgadoEn DateTime @default(now())
  bonusConsumido Boolean @default(false) // true cuando ya se aplicó en una evaluación
  @@index([escuelaId, jugadorId])
}

model ObjetivoJugador {
  id         String  @id @default(cuid())
  escuelaId  String
  jugadorId  String
  jugador    Jugador @relation(fields: [jugadorId], references: [id])
  creadoPorEntrenadorId String
  stat       String   // RIT|TIR|PAS|REG|DEF|FIS|MEN|OVR
  valorMeta  Int
  fechaLimite DateTime
  estado     String  @default("ACTIVO") // enum: ACTIVO | CUMPLIDO | VENCIDO
  @@index([escuelaId, jugadorId])
}

model Lead {
  id        String   @id @default(cuid())
  nombreEscuela String
  contactoNombre String
  contactoEmail  String
  telefono   String?
  ciudad     String?
  mensaje    String?
  estado     String  @default("NUEVO") // enum: NUEVO | CONTACTADO | CONVERTIDO | DESCARTADO
  createdAt  DateTime @default(now())
}

model ParametroFormula {
  id     String @id @default(cuid())
  clave  String @unique  // "PESO_MEN_EN_OVR", "RANGO_SPRINT_SUB12_MIN", ...
  valor  Float
  descripcion String?
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  actorRol  String
  accion    String   // "ANULAR_EVALUACION", "REVOCAR_CONSENTIMIENTO", ...
  entidad   String   // "Evaluacion"
  entidadId String
  escuelaId String?
  motivo    String?
  createdAt DateTime @default(now())
  @@index([escuelaId, createdAt])
}

model Membresia {
  id        String  @id @default(cuid())   // Fase 2 — sin UI en Fase 1
  escuelaId String
  jugadorId String
  periodo   String   // "2026-06"
  estado    String   @default("PENDIENTE") // PENDIENTE | PAGADA | VENCIDA
  monto     Float?
}
```

---

## 8. MOTOR DE STATS v1.1 (sin cambios de fondo, ahora con parámetros en BD)

Implementado como **librería pura** en `src/lib/stats-engine/` (sin Prisma, sin
React): `normalize.ts`, `weights.ts`, `compute.ts`, `levels.ts`, `index.ts` +
tests exhaustivos.

1. **Normalización física** a 1–99 con piso(40)/techo(99) por categoría de edad.
   Los rangos viven en `ParametroFormula` (seed con valores iniciales razonables
   por grupo de edad Sub-8/Sub-10/Sub-12/Sub-14/Sub-16) y los edita SUPER_ADMIN.
   Pruebas inversas (sprint, agilidad: menos = mejor) se invierten antes de
   normalizar.
2. **Técnicas y mentalidad** (1–10) → `nota × 9.9`, redondeo y clamp 1–99.
3. **Stats derivados**: RIT, TIR, PAS, REG, DEF, FIS con las ponderaciones v1;
   **MEN** = promedio de actitud, concentración, trabajo en equipo y resiliencia.
4. **OVR** = `0.90 × (suma ponderada por posición de los 6 stats) + 0.10 × MEN`.
   El 0.10 es `ParametroFormula("PESO_MEN_EN_OVR")`.

   Ponderaciones por posición (suma 1.0 cada fila):

   | Pos | RIT | TIR | PAS | REG | DEF | FIS |
   |-----|-----|-----|-----|-----|-----|-----|
   | POR | .10 | .05 | .15 | .10 | .35 | .25 |
   | DEF | .15 | .05 | .15 | .10 | .35 | .20 |
   | MED | .15 | .15 | .30 | .20 | .10 | .10 |
   | DEL | .20 | .30 | .15 | .20 | .05 | .10 |

5. **Niveles**: Bronce <65 · Plata 65–74 · Oro 75–84 · Héroe ≥85.
6. **Bonus de logros**: al calcular una nueva evaluación, el servicio consume
   `LogroJugador` con `bonusConsumido=false`, aplica como máximo
   `Escuela.topeBonusEntreEvals` (+3 por defecto) y persiste `bonusAplicado`
   por separado. El DT siempre ve el desglose "ganado en cancha" vs "por logro".
7. **Snapshot inmutable**: cada `StatsCalculados` guarda `versionFormula`; el
   histórico nunca se recalcula.
8. **Vencimiento**: jugador cuya última evaluación supera
   `frecuenciaEvaluacionDias` aparece en rojo en el panel DT y genera
   `Notificacion(EVALUACION_VENCIDA)` al DT (job perezoso: se evalúa al cargar
   el dashboard del DT, suficiente en Fase 1).

---

## 9. MÓDULO DE MENSAJERÍA (nuevo)

### 9.1 Principio de diseño (protección del menor)

**No existe ningún canal de chat directo entre un adulto y un niño.** La cuenta
JUGADOR la gestiona el padre/tutor. Los tres mecanismos son:

| Mecanismo | Quién escribe | Quién lee | Naturaleza |
|---|---|---|---|
| **Conversación** (hilo privado) | DT o Escuela ↔ **Padre** | DT(s) de la categoría, admin de escuela, padre | Bidireccional, anclada a UN jugador (asunto: lesión, pagos, progreso) |
| **Anuncio** | DT (a su categoría) o Escuela (global) | Padres de la categoría/escuela | Unidireccional, tipo tablón |
| **Noticias del club** (en el hub del jugador) | Derivadas de anuncios marcados "mostrar al jugador" + mensajes automáticos del sistema (logro conseguido, convocatoria, resultado del partido) | Jugador (con su padre) | Solo lectura, lenguaje positivo, estilo bandeja de correo de FC26 |

### 9.2 Reglas de servicio (`mensaje.service`)

- Crear conversación: solo DT (de la categoría del jugador) o ESCUELA_ADMIN.
  El padre responde en hilos existentes y puede iniciar hilo sobre **su** hijo.
- `assertOwnPlayer` en cada lectura/escritura del padre.
- Texto plano, 2.000 chars máx, rate limit 30 mensajes/hora.
- Sin adjuntos en Fase 1 (reduce superficie de ataque).
- Badge de no-leídos por rol; al abrir hilo se marca leído y se notifica.

### 9.3 UI

- **Padre/Jugador** (`/jugador/mensajes`): dos pestañas — "Mensajes" (hilos del
  padre) y "Noticias del club" (bandeja FC26: items con icono, fecha, asunto;
  al abrir, animación de despliegue).
- **DT** (`/dt/mensajes`): lista de hilos por jugador + redactor de anuncios.
- **Escuela** (`/escuela/anuncios`): anuncios globales + ver hilos de su escuela.

### 9.4 Seguridad específica

Texto plano renderizado con escape estándar de React; URLs no se autoenlazan en
Fase 1; validación Zod de longitud y de pertenencia del `jugadorId` al tenant.

---

## 10. MÓDULO CALENDARIO Y EVENTOS (nuevo)

### 10.1 Modelo

`Evento` unificado (Sección 7): PARTIDO | ENTRENAMIENTO | EVALUACION | OTRO,
con categoría, cancha opcional, rival/local y resultado opcional para partidos.

### 10.2 Flujos

1. **DT crea evento** → si es PARTIDO, selecciona convocados → cada padre recibe
   `Notificacion(CONVOCATORIA)` → confirma/rechaza desde su panel → el DT ve el
   semáforo de confirmaciones.
2. **Entrenamientos recurrentes**: el formulario permite "repetir semanalmente
   hasta fecha X" (genera N eventos individuales; sin RRULE compleja en Fase 1).
3. **Pasado el evento**: el DT pasa lista (Asistencia) y, si es partido, carga
   el resultado → aparece como "Último partido" en el hub del jugador y genera
   noticia del club.
4. **Evaluación** como tipo de evento: agenda la sesión de pruebas y enlaza al
   formulario de evaluación ese día.

### 10.3 UI

- **Vista mensual** (`components/calendar/MonthGrid.tsx`): grid construido con
  date-fns, puntos de color por tipo (verde entrenamiento, dorado partido,
  violeta evaluación), navegación mes anterior/siguiente animada
  (slide + fade), clic en día → panel lateral con eventos.
- **Lista "Próximos"** (`UpcomingList.tsx`): tarjetas estilo fixture de FC26 —
  escudo/iniciales del rival, fecha relativa ("en 3 días"), local/visitante,
  estado de confirmación. Reutilizada en hub del jugador y dashboard del DT.
- Padre: botones Confirmar/No asistirá con micro-animación y estado optimista.

---

## 11. GAMIFICACIÓN (consolidado v3 + objetivos)

- **INSIGNIA**: visual (vitrina + confetti al otorgarse).
- **BONUS**: +1 a un stat, aplicado **en la siguiente evaluación**, tope
  configurable +3 acumulado, persistido por separado (`bonusAplicado`).
- **Logros seed**: Asistencia perfecta semanal (+1 FIS) · Mente de acero (MEN
  sube 2 evaluaciones seguidas, insignia) · Primer Oro (insignia) · Capitán de
  vestuario (trabajoEquipo ≥ 9, insignia) · Mejor progreso del mes (+1 al stat
  que más subió) · Debut (primera convocatoria confirmada, insignia) ·
  Temporada de hierro (10 asistencias seguidas, insignia).
- **Objetivos de desarrollo** (`ObjetivoJugador`): el DT fija metas tipo FC26
  ("PAS ≥ 70 antes del 15/03"). El hub muestra barra de progreso animada;
  cumplirlo dispara noticia del club + confetti. Vencido sin cumplir: estado
  VENCIDO, mensaje neutro y motivador (nunca punitivo — son niños).
- **Detección**: `logro.service.evaluarLogros(ctx, jugadorId, trigger)` se
  invoca tras guardar evaluación, asistencia o confirmación; idempotente
  (un logro de código único no se otorga dos veces salvo los repetibles,
  marcados en seed).
- Sin rankings públicos entre niños.

---

## 12. UI/UX — "MODO CARRERA FC26"

### 12.1 Design system ("Noche de estadio")

Tokens en `tailwind.config.ts` + `globals.css`:

```
Fondo base        #070B14   (azul-negro nocturno)
Superficie        #0D1322 / #111A2E (cards, paneles)
Borde sutil       #1E2A44
Texto principal   #F1F5F9 · secundario #94A3B8
Acento cancha     #4ADE80  (CTAs, éxito, líneas de campo)
Bronce #B08D57 · Plata #C7D1DD · Oro #F5C542 · Héroe #A78BFA→#F0ABFC (gradiente)
Alerta #F87171 · Info #60A5FA
Tipografía: display itálica ultra-negra en MAYÚSCULAS (p. ej. Archivo Black /
Inter Black itálica) · cuerpo Inter · números SIEMPRE tabulares (font-variant-
numeric: tabular-nums) para stats y marcadores.
White-label: `colorPrimario` de la escuela se inyecta como CSS variable
`--brand` en el layout del tenant y tiñe CTAs y acentos de sus paneles.
```

### 12.2 El hub del jugador (`/jugador`) — corazón del producto

Layout en grid asimétrico, jerarquía idéntica a la pantalla principal del Modo
Carrera:

```
┌──────────────────────────┬──────────────────────────────────┐
│  [A] CARTA (hero, 3D)    │ [B] PRÓXIMO PARTIDO (tile grande) │
│  tilt + holo + OVR       │     rival · fecha · local/visita  │
│  count-up al cargar      │     botón confirmar (padre)       │
│                          ├──────────────────────────────────┤
│                          │ [C] AGENDA SEMANAL (mini fixture) │
├──────────────────────────┼──────────────────────────────────┤
│ [D] OBJETIVOS DE         │ [E] BANDEJA / NOTICIAS DEL CLUB   │
│     DESARROLLO (barras)  │     estilo correo FC26, no leídos │
├──────────────────────────┴──────────────────────────────────┤
│ [F] EVOLUCIÓN (gráfico Recharts: OVR + stat seleccionable)   │
├──────────────────────────────────────────────────────────────┤
│ [G] VITRINA DE LOGROS (insignias; bloqueadas en silueta)     │
│ [H] ÚLTIMO PARTIDO (resultado + asistencia)                  │
└──────────────────────────────────────────────────────────────┘
```

Detalles de fidelidad FC26:
- Al entrar por primera vez tras una evaluación nueva: secuencia "revelación de
  carta" (carta boca abajo → flip → stats suben con count-up escalonado → si
  cambió de nivel, cross-fade de material + partículas).
- Niveles de carta con materiales distintos: Bronce mate, Plata metálica, Oro
  brillo especular animado, Héroe gradiente animado + partículas sutiles.
- Navegación lateral por iconos (como el menú del modo carrera): Inicio ·
  Calendario · Mensajes · Mi carta · Logros · Perfil.
- `prefers-reduced-motion`: desactiva tilt, partículas y count-up (muestra
  valores finales directamente).

### 12.3 `PlayerCard` — spec del componente firma

```ts
interface PlayerCardData {
  nombre: string; posicion: "POR"|"DEF"|"MED"|"DEL";
  ovr: number; nivel: "BRONCE"|"PLATA"|"ORO"|"HEROE";
  stats: { rit:number; tir:number; pas:number; reg:number; def:number; fis:number };
  men: number;                 // sello circular aparte, marca de la casa
  fotoUrl: string | null;      // null → avatar generado (iniciales + patrón)
  escudoEscuelaUrl?: string; dorsal?: number;
}
// Props: data, size ("sm"|"md"|"hero"), interactive?: boolean
```

- Proporción 3:4, esquinas recortadas estilo carta; nombre en display itálica;
  OVR + posición arriba-izquierda; 6 stats en dos columnas; **sello MEN**
  circular abajo-derecha (diferenciador del producto).
- Tilt 3D: rotación máx 10°, spring suave, brillo holográfico que sigue el
  cursor (gradiente radial en pseudo-capa), solo si `interactive`.
- El mismo componente renderiza snapshots históricos (recibe el DTO del
  snapshot, no "los datos actuales").

### 12.4 Dashboards de los otros roles

- **DT** (`/dt`): fila de KPIs (jugadores activos, evaluaciones vencidas en
  rojo, solicitudes pendientes, próximos eventos) · plantilla como grid de
  mini-cartas con filtros · acceso rápido "Evaluar ahora".
- **Escuela** (`/escuela`): categorías, DTs, códigos de invitación activos,
  anuncios, métricas agregadas (sin datos sensibles individuales innecesarios).
- **Súper Admin** (`/admin`): pipeline de leads (kanban simple), escuelas,
  parámetros de fórmula, AuditLog explorable.

### 12.5 Landing pública

Se mantiene la spec v3 íntegra (8 secciones, carta 3D en hero, demo en vivo con
slider, formulario de leads con honeypot + rate limit, hero < 2.5 s, AA,
reduced-motion). El componente de carta de la landing ES `PlayerCard` con datos
demo — cero duplicación.

---

## 13. ESTRUCTURA DE CARPETAS (definitiva)

```
futbol-career-mode/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                  # escuela demo, 2 categorías, 10 jugadores,
│   │                            #   evaluaciones, eventos, mensajes, leads
│   └── migrations/
├── public/                      # SOLO assets estáticos del producto
├── storage/uploads/             # fotos Fase 1 (gitignored, servidas por API)
├── src/
│   ├── app/
│   │   ├── page.tsx             # landing
│   │   ├── (auth)/login/ · registro/[codigo]/
│   │   ├── admin/    leads/ · escuelas/ · parametros/ · auditoria/
│   │   ├── escuela/  categorias/ · sedes/ · dts/ · codigos/ · anuncios/
│   │   ├── dt/       plantilla/ · solicitudes/ · evaluaciones/ ·
│   │   │             calendario/ · eventos/[id]/ · mensajes/ · asistencia/
│   │   ├── jugador/  (hub) · carta/ · calendario/ · mensajes/ ·
│   │   │             logros/ · evolucion/ · perfil/
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── leads/route.ts             # POST público rate-limited
│   │       └── archivos/foto/[jugadorId]/route.ts  # GET protegido
│   ├── actions/                 # Server Actions por dominio (Capa 2)
│   │   evaluacion.actions.ts · evento.actions.ts · mensaje.actions.ts · ...
│   ├── components/
│   │   ├── ui/                  # Button, Card, Badge, Modal, Tabs, Skeleton...
│   │   ├── cards/               # PlayerCard, CardReveal, LevelMaterial
│   │   ├── calendar/            # MonthGrid, UpcomingList, EventBadge
│   │   ├── messages/            # ThreadList, ThreadView, ClubInbox, Composer
│   │   ├── charts/              # EvolutionChart, StatBar
│   │   ├── landing/             # Hero, LiveDemo, LeadForm, ...
│   │   ├── achievements/        # BadgeGrid, GoalProgress, ConfettiTrigger
│   │   └── forms/               # EvaluationForm, EventForm, PlayerForm
│   ├── services/                # Capa 3 (una clase/módulo por dominio)
│   ├── repositories/            # Capa 4 (firma obligatoria con escuelaId)
│   ├── lib/
│   │   ├── auth/                # auth.config, context, guards, password
│   │   ├── stats-engine/        # PURO + tests
│   │   ├── validators/          # esquemas Zod compartidos
│   │   ├── rate-limit.ts · audit.ts · motion-presets.ts · dates.ts
│   │   └── db.ts                # singleton Prisma
│   └── types/                   # union types (Rol, Posicion, ...), DTOs
├── tests/  unit/ · e2e/
├── .env / .env.example / DECISIONES.md / README.md / MANUAL-DE-USO.md
```

**Regla de imports (verificable):** `app|components → actions → services →
repositories → prisma`. Un import que salte capas hacia abajo (p. ej.
`components` importando `repositories`) es un bug de arquitectura.

---

## 14. CONVENCIONES DE CÓDIGO

- TypeScript estricto; DTOs explícitos entre capas (nunca exponer el modelo
  Prisma a componentes: mapear en el servicio).
- Errores de dominio como clases (`NotFoundError`, `ForbiddenError`,
  `ValidationError`, `TenantMismatchError`) lanzadas en Capa 3 y mapeadas a
  HTTP/estado de formulario en Capa 2.
- Server Actions devuelven `{ ok: true, data } | { ok: false, error: string }`
  (mensaje seguro para UI).
- Nombres: archivos kebab-case; componentes PascalCase; servicios
  `<dominio>.service.ts`; un export principal por archivo.
- Prettier + ESLint (config Next) desde el Sprint 0; CI mínima en Fase 2.

---

## 15. CONTRATOS DE LA CAPA DE APLICACIÓN (resumen)

Mutaciones vía **Server Actions** (auth + Zod + guards dentro). Endpoints HTTP
solo donde hace falta: `POST /api/leads` (público), `GET /api/archivos/foto/...`
(streaming protegido), `auth`. Acciones principales por dominio:

| Dominio | Acciones |
|---|---|
| auth | `login`, `registrarConCodigo`, `regenerarPassword` (admin) |
| escuela | `crearEscuela` (admin, desde lead), `actualizarBranding`, `actualizarParametros` |
| jugador | `crearJugador` (DT), `aprobarSolicitud`, `rechazarSolicitud`, `actualizarConsentimiento` (padre), `subirFoto` (padre), `desactivarJugador` |
| evaluacion | `crearEvaluacion` (DT; calcula stats + logros en la misma transacción), `anularEvaluacion` (admin escuela, con motivo → AuditLog) |
| evento | `crearEvento`, `crearEventosRecurrentes`, `convocar`, `confirmarConvocatoria` (padre), `pasarLista`, `cargarResultado` |
| mensaje | `crearConversacion`, `responder`, `crearAnuncio`, `marcarLeido` |
| objetivo | `crearObjetivo` (DT), evaluación automática de cumplimiento al guardar stats |
| lead | `crearLead` (público), `actualizarEstadoLead`, `convertirLeadEnEscuela` |


---

## 16. SETUP LOCAL EN WINDOWS — PASO A PASO (Etapa A)

> La IA debe ejecutar/dictar estos pasos literalmente, verificando cada uno.

1. **Instalar herramientas**: Node.js LTS (instalador .msi oficial) · Git para
   Windows · VS Code + extensiones *Prisma* y *Tailwind CSS IntelliSense*.
   Verificación: `node -v` (≥ 20), `git --version`.
2. **Crear proyecto**:
   ```powershell
   npx create-next-app@latest futbol-career-mode --typescript --tailwind --eslint --app --src-dir
   cd futbol-career-mode
   npm i prisma @prisma/client next-auth@beta zod bcryptjs framer-motion recharts date-fns canvas-confetti
   npm i -D vitest @types/bcryptjs
   npx prisma init --datasource-provider sqlite
   ```
3. **Schema + migración + seed**: copiar el schema de la Sección 7 →
   `npx prisma migrate dev --name init` → implementar `prisma/seed.ts`
   (Apéndice B) → `npx prisma db seed`.
4. **Verificar**: `npm run dev` → `http://localhost:3000`. Todo funciona sin
   internet ni servicios externos (el archivo `dev.db` vive solo en la máquina;
   está en `.gitignore`).
5. **Git**: `git init` → primer commit → repo **privado** en GitHub → push.
   `.env` jamás en el repo; `.env.example` sí (Apéndice A).
6. **Fase 2 (resumen)**: importar repo en Vercel · crear proyecto Supabase ·
   `provider = "postgresql"` + nueva migración · variables en Vercel ·
   **activar RLS en todas las tablas** · mover fotos a Supabase Storage con
   URLs firmadas (fotos de menores nunca públicas) · rate limit con Upstash ·
   emails transaccionales (recuperación de contraseña, notificaciones).

---

## 17. ROADMAP POR SPRINTS — CON CHECKPOINTS VERIFICABLES

| Sprint | Entregable | Checkpoint (el usuario debe poder verlo) |
|---|---|---|
| 0 | Setup Windows + Prisma + schema completo + seed + Auth.js + RBAC (guards, middleware) + layout base con design tokens | Login con los 4 usuarios del seed redirige a 4 paneles distintos; intentar URL de otro rol redirige; test unitario de guards en verde |
| 1 | Landing animada completa + `POST /api/leads` con honeypot y rate limit + `PlayerCard` v1 (la carta nace aquí) | Landing navegable, demo del slider mueve la carta, lead enviado aparece en BD; reduced-motion verificado |
| 2 | Panel SUPER_ADMIN: bandeja de leads (pipeline), conversión lead→escuela+admin, parámetros de fórmula, AuditLog | Convertir un lead crea escuela funcional con su admin; el cambio de un parámetro queda auditado |
| 3 | Panel ESCUELA: categorías, sedes/canchas, DTs, códigos de invitación, branding (`colorPrimario`) | Escuela autogestionada: crear categoría → DT → código; los paneles del tenant se tiñen con su color |
| 4 | Panel DT (núcleo): plantilla con mini-cartas, solicitudes (alta doble vía), **formulario de evaluación** (4+4+4), motor de stats v1.1 con tests, snapshot inmutable | Flujo demo: padre se registra con código → DT aprueba → DT evalúa → la carta "nace" con OVR y sello MEN; tests del motor en verde |
| 5 | Hub del jugador estilo FC26: carta hero con revelación, evolución (Recharts), vitrina de logros (INSIGNIA + BONUS con anti-inflación), objetivos, foto con consentimiento/avatar | Revelación de carta con count-up y confetti; bonus visible desglosado; revocar consentimiento oculta la foto al instante |
| 6 | **Eventos + calendario + mensajería**: CRUD eventos (incl. recurrentes), convocatorias con confirmación del padre, asistencia, resultados, MonthGrid + UpcomingList, hilos DT↔padre, anuncios, noticias del club, notificaciones in-app | Semana operativa completa: DT crea partido → padre confirma → DT pasa lista y carga resultado → el hub del niño muestra fixture, resultado y noticia; hilo de mensajes funcionando |
| 7 | Endurecimiento: checklist de seguridad sobre TODOS los endpoints, headers, E2E Playwright de los 3 flujos críticos, README + MANUAL-DE-USO finales | Suite E2E en verde; checklist 6.8 firmado endpoint por endpoint |
| 8 | Fase 2: Supabase + Vercel + Storage + RLS + emails | Producción accesible con datos reales de una escuela piloto |

**Flujos críticos E2E (Sprint 7):** (1) lead → escuela → DT → código → registro
padre → aprobación → evaluación → carta; (2) evento → convocatoria →
confirmación → asistencia → resultado → noticia; (3) intento de cruce de tenant
y de rol devuelve 404/redirección.

---

## 18. PROTOCOLO DE GUÍA PASO A PASO (cómo la IA acompaña al usuario)

Para **cada tarea** dentro de un sprint, la IA sigue este ciclo:

1. **Anunciar** — "Voy a crear X porque Y" (1–3 frases, sin jerga innecesaria).
2. **Ejecutar** — generar el código completo, sin placeholders tipo `// TODO`.
3. **Verificar** — dar al usuario UNA instrucción concreta de comprobación:
   un comando (`npm run dev`), una URL (`http://localhost:3000/dt`) y qué debe
   ver exactamente ("debes ver 10 mini-cartas; la de Lucas en rojo por
   evaluación vencida").
4. **Esperar confirmación** del usuario antes de continuar. Si algo falla:
   pedir el mensaje de error literal, diagnosticar, corregir, re-verificar.
5. **Commit** — proponer el mensaje de commit y el comando exacto.
6. Al cerrar cada sprint: resumen de lo construido + checklist del checkpoint +
   pregunta explícita "¿pasamos al Sprint N+1?".

Reglas adicionales: nunca más de un archivo "mágico" sin explicar; ante errores
de Windows (rutas, permisos, PowerShell vs CMD) dar el comando para PowerShell;
si el usuario pide un cambio de alcance, anotarlo en `DECISIONES.md` y evaluar
si afecta a sprints posteriores antes de implementarlo.

---

## 19. TESTING Y CALIDAD

- **Unitario (Vitest), obligatorio desde Sprint 4**: `stats-engine` (normaliza-
  ción con casos borde: mejor/peor marca, valores fuera de rango, inversas;
  ponderaciones suman 1; OVR por posición; niveles en los umbrales 64/65/74/75/
  84/85; tope de bonus +3; versionado), guards de RBAC y `assertTenant`.
- **E2E (Playwright), Sprint 7**: los 3 flujos críticos de la Sección 17.
- **Seed determinista**: mismos datos en cada `db seed` → demos y tests
  reproducibles.
- Criterio de "terminado" por tarea: compila sin warnings de TS, lint limpio,
  checklist de seguridad si tocó endpoints, verificación del paso 3 del
  protocolo superada.

---

## 20. MANUAL DE USO (se entrega también como MANUAL-DE-USO.md en el repo)

### 20.1 Súper Admin
1. Entra en `/login` → redirigido a `/admin`.
2. **Leads**: revisa el pipeline (Nuevo → Contactado → Convertido/Descartado).
   Para incorporar una escuela: abrir lead → "Convertir en escuela" → completar
   nombre, slug y email del administrador → el sistema crea la escuela y su
   cuenta admin (contraseña temporal que debes comunicar por canal seguro).
3. **Parámetros**: ajusta rangos de normalización por edad y el peso de MEN en
   el OVR. Cada cambio queda auditado y solo afecta a evaluaciones futuras.
4. **Auditoría**: consulta acciones sensibles filtrando por escuela y fecha.

### 20.2 Administrador de Escuela
1. `/escuela`: configura logo y color (white-label), sedes y canchas.
2. Crea **categorías** (ej. Sub-12, años 2014–2015) y cuentas de **DT**,
   asignándoles categorías.
3. Genera **códigos de invitación** por categoría (usos y caducidad) y
   compártelos con las familias.
4. Publica **anuncios** globales; revisa hilos de mensajes de tu escuela.
5. Ajusta la **frecuencia de evaluación** (días) de tu escuela.
6. Si una evaluación se cargó mal: anúlala (motivo obligatorio) para que el DT
   cree una nueva.

### 20.3 DT (Entrenador)
1. `/dt`: tu dashboard muestra plantilla, solicitudes pendientes y jugadores
   con **evaluación vencida en rojo**.
2. **Altas**: crea jugadores tú mismo o aprueba solicitudes que llegan por
   código de invitación.
3. **Evaluar**: elige jugador → carga 4 pruebas físicas (medidas reales), 4
   notas técnicas y 4 de mentalidad (1–10) + observaciones privadas para el
   padre → al guardar, la carta se recalcula al instante. Las evaluaciones no
   se editan: si te equivocas, pide anulación al admin y crea una nueva.
4. **Calendario**: crea entrenamientos (con repetición semanal) y partidos;
   convoca jugadores; sigue el semáforo de confirmaciones; el día del evento
   pasa lista y, si fue partido, carga el resultado.
5. **Objetivos**: fija metas de desarrollo por jugador (stat + valor + fecha).
6. **Mensajes**: abre hilos privados con cada familia y publica anuncios a tu
   categoría (puedes marcar "mostrar al jugador" para que aparezca como
   noticia del club).

### 20.4 Familia (padre/tutor y jugador)
1. **Registro**: entra en el enlace/código que te dio la escuela, crea tu
   cuenta y los datos de tu hijo. Quedará "pendiente" hasta que el DT apruebe.
2. **El hub**: la carta de tu hijo con su OVR y nivel, próximos partidos y
   entrenamientos, noticias del club, objetivos y evolución histórica.
3. **Convocatorias**: confirma o declina la asistencia desde el panel o el
   calendario.
4. **Foto**: sube una foto y otorga el consentimiento (puedes revocarlo cuando
   quieras; la carta volverá al avatar de inmediato).
5. **Mensajes**: comunícate con el DT en hilos privados sobre tu hijo.
6. La progresión compara a tu hijo **solo consigo mismo**: no hay rankings.

### 20.5 Preguntas frecuentes
- *¿Por qué la carta no cambió tras un logro?* Los bonus se aplican en la
  **siguiente** evaluación, con un máximo de +3.
- *¿Por qué veo un avatar y no la foto?* Falta el consentimiento o fue revocado.
- *Olvidé mi contraseña* (Fase 1): pídesela al administrador de tu escuela,
  que puede regenerarla (queda registrado).

---

## 21. DEFINICIÓN DE "LISTO" — FASE 1 LOCAL

- [ ] Landing animada navegable (con reduced-motion) y lead llegando al panel admin.
- [ ] Flujo completo: lead → escuela → categoría → DT → código → registro padre
      → aprobación → evaluación (4+4+4) → carta con OVR, nivel y sello MEN.
- [ ] Hub del jugador estilo FC26 operativo: carta hero con revelación,
      próximos eventos, noticias del club, objetivos, evolución, vitrina.
- [ ] Calendario mensual + eventos recurrentes + convocatoria con confirmación
      del padre + asistencia + resultado de partido reflejado en el hub.
- [ ] Mensajería: hilo DT↔padre + anuncio de categoría + noticia visible al niño.
- [ ] Un logro INSIGNIA y uno BONUS demostrables, con desglose anti-inflación.
- [ ] Foto con consentimiento/revocación inmediata y fallback avatar.
- [ ] Checklist de seguridad 6.8 cumplido en todos los endpoints; tests del
      motor de stats y E2E de flujos críticos en verde.
- [ ] Seed reproducible: clonar y levantar en < 5 min en Windows; README y
      MANUAL-DE-USO completos.

---

## APÉNDICE A — `.env.example`

```env
# Base de datos (Fase 1: SQLite local)
DATABASE_URL="file:./dev.db"
# Auth.js
AUTH_SECRET="generar-con: npx auth secret"
AUTH_URL="http://localhost:3000"
# Almacenamiento de fotos (Fase 1: ruta local; Fase 2: Supabase)
UPLOADS_DIR="./storage/uploads"
# Fase 2 (vacíos en local):
# NEXT_PUBLIC_SUPABASE_URL= / SUPABASE_SERVICE_ROLE_KEY= / UPSTASH_REDIS_URL=
```

## APÉNDICE B — Contenido del seed (determinista)

1 SUPER_ADMIN (`admin@demo.app`) · 1 escuela "Academia Demo" (slug `demo`,
color `#4ADE80`, frecuencia 30 días) con su ESCUELA_ADMIN · 2 categorías
(Sub-10, Sub-12) · 1 DT asignado a ambas · 10 jugadores (mezcla de posiciones;
8 ACTIVOS con 2–4 evaluaciones históricas que muestran progresión y al menos
un cambio de nivel; 1 PENDIENTE; 1 con evaluación vencida) · 1 jugador con foto
demo + consentimiento y resto avatar · catálogo completo de logros + 3
otorgados (1 BONUS sin consumir) · 2 objetivos activos y 1 cumplido ·
eventos: 4 entrenamientos futuros, 1 partido futuro con convocatoria a medio
confirmar, 1 partido pasado con asistencia y resultado · 1 conversación
DT↔padre con 3 mensajes · 2 anuncios (1 visible al jugador) · 4 leads en
distintos estados · parámetros de fórmula iniciales por grupo de edad.
Contraseñas demo documentadas en README (solo entorno local).

## APÉNDICE C — Glosario

**OVR**: valoración global 1–99 · **MEN**: stat de mentalidad, sello propio del
producto · **Tenant**: una escuela; sus datos son invisibles para las demás ·
**Snapshot**: foto inmutable de stats ligada a una evaluación · **Hub**: panel
principal del jugador estilo Modo Carrera · **Lead**: escuela interesada
captada por la landing · **DT**: director técnico / entrenador.

---

*Fin del Plan Maestro v4 — documento autosuficiente para la IA implementadora.*
