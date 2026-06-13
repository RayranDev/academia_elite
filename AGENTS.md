<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> Reglas para agentes que trabajan en **Fútbol Career Mode** (`academia_elite`).
> Esto es el contrato operativo. Para el estado integral del producto (qué hay,
> qué falta, fases) leé **[ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md)**.
> `CLAUDE.md` solo reexporta este archivo (`@AGENTS.md`): editá AQUÍ.

---

## 1. Qué es esto

Plataforma web **multi-tenant** que gamifica el fútbol base: un DT evalúa
medidas físicas y técnicas reales → el motor calcula stats (RIT, TIR, PAS, REG,
DEF, FIS, MEN) y un OVR 1–99 → el jugador recibe una **carta** estilo EA FC
(Bronce / Plata / Oro / Héroe). Cuatro roles: `SUPER_ADMIN`, `ESCUELA_ADMIN`,
`DT`, `JUGADOR`.

**Datos sensibles de menores**. La seguridad no es opcional (ver §5).

---

## 2. Next.js 16 — lo que NO sabés de memoria

Esta versión rompe convenciones previas. **Antes de tocar nada de Next, leé la
guía puntual en `node_modules/next/dist/docs/`.** Cambios que te van a morder si
escribís desde memoria pre-16:

- **`middleware.ts` ya no existe → es `proxy.ts`** (`src/proxy.ts`). No crees un
  `middleware.ts`.
- **APIs de request son asíncronas**: `params`, `searchParams`, `cookies()`,
  `headers()` se `await`-ean. En páginas tipá `params: Promise<{ id: string }>`.
- **Turbopack es el default** de `next dev` y `next build`. No hay webpack custom.
- **`next lint` está deprecado**: el script `lint` invoca `eslint` directo.
- **`revalidateTag` requiere segundo argumento**; revisá la doc de caché antes de
  usar revalidación por tags / Cache Components.

Si dudás de una API de Next, la verdad está en `node_modules/next/dist/docs/`,
no en tu entrenamiento.

---

## 3. Comandos

Gestor de paquetes: **npm** (`package-lock.json`). Node **22+** (probado en 24).

```bash
npm install                 # postinstall corre `prisma generate`
npx prisma migrate deploy   # aplica migraciones
npm run db:seed             # datos demo (idempotente)
npm run dev                 # http://localhost:3000

npm run typecheck           # tsc --noEmit  ── debe quedar LIMPIO
npm run lint                # eslint         ── debe quedar LIMPIO
npm run test                # vitest run (unit)
npm run test:e2e            # playwright (build + start:e2e en :3100)
npm run db:reset            # drop + migrate + seed
```

Usuarios demo (pass `Demo1234!`): `admin@demo.app`, `escuela@demo.app`,
`dt@demo.app`, `jugador@demo.app`.

---

## 4. Arquitectura por capas (estricta, sin saltos)

```
app | components  →  actions  →  services  →  repositories  →  prisma
   (UI / RSC)        (use server)  (lógica)     (acceso datos)   (DB)
```

- **Nunca saltes capas.** Un componente no llama a un repositorio; una acción no
  arma queries Prisma. La lógica vive en `src/services/`, el acceso a datos en
  `src/repositories/`.
- **Server Components por defecto.** Marcá `"use client"` solo cuando haga falta
  (estado, eventos, framer-motion, APIs de browser).
- **DTOs planos siempre.** Nunca devuelvas modelos Prisma a la UI; convertí con
  los mappers de `src/lib/mappers/`.
- **Motor de stats puro** (`src/lib/stats-engine/`): mismas entradas → mismas
  salidas, sin Prisma ni React. Lo reusan evaluaciones y simulador. No le metas
  efectos.
- **Alias de imports**: `@/*` → `src/*` (definido en `tsconfig.json`).
- **Cliente Prisma generado** en `src/generated/prisma/`: **es autogenerado, no
  lo edites**. Si cambiás el schema, corré `prisma generate` (lo hace el
  postinstall) y migrá.

---

## 5. Seguridad — reglas NO negociables

Son datos de menores. Esto manda sobre cualquier atajo de conveniencia.

- **Dos barreras.** `src/proxy.ts` es **solo UX** (redirige por rol, Barrera 1).
  La seguridad real vive en los **servicios** (Barrera 2). Nunca confíes en el
  proxy como control de acceso.
- **Toda Server Action / route handler / servicio** arranca construyendo el
  `AuthContext` desde la sesión (nunca del body) y aplicando los guards de
  `src/lib/auth/guards.ts`:
  - `requireRole(ctx, [roles])` — 403 si el rol no está permitido.
  - `assertTenant(ctx, recursoEscuelaId)` — cruce de tenant lanza
    `TenantMismatchError`. **El cruce de tenant devuelve 404, no 403**: no
    confirmamos la existencia del recurso. `SUPER_ADMIN` (escuelaId `null`)
    puede cruzar, y se audita aparte.
  - `assertOwnPlayer(ctx, jugadorId, propios)` — el padre/jugador solo opera
    sobre sus jugadores.
  - `requireEscuela(ctx)` — devuelve el `escuelaId` garantizado para acotar
    queries de tenant.
- **Multi-tenant**: toda entidad lleva `escuelaId` y toda query lo filtra. No
  hay query sin scope de tenant (salvo SUPER_ADMIN, auditado).
- **Fotos de menores nunca públicas**: servidas por API protegida
  (`/api/archivos/foto/[jugadorId]`), validadas por magic bytes, EXIF stripped,
  recomprimidas a WebP, nombre UUID, `no-store`. Nunca las pongas en `public/`.
- **Avatares DiceBear** se generan **en proceso** (sin API externa).
- **`.env` jamás se commitea.** Contraseñas temporales son cripto-seguras, se
  muestran una sola vez, nunca se almacenan ni loguean en claro.
- **Contrato de Server Actions** (`src/lib/action-result.ts`): devolvé
  `ActionResult<T>` = `{ ok: true; data? }` | `{ ok: false; error }`. Envolvé
  con `mapError`, que **re-lanza las señales de control de Next** (`NEXT_REDIRECT`,
  `NEXT_NOT_FOUND`) — no las trates como error — y oculta errores inesperados
  tras un mensaje genérico.
- **AuditLog** para acciones sensibles.

Detalle por endpoint en **[SEGURIDAD.md](SEGURIDAD.md)** y **[HABEAS-DATA.md](HABEAS-DATA.md)**.

---

## 6. Convenciones de código

- **Idioma del dominio: español.** Identificadores de negocio, campos de modelo,
  métodos de servicio, comentarios y copy de UI van en español (`jugador`,
  `escuela`, `evaluar`, `obtenerDetalleJugadorDt`, `requireEscuela`). Los
  términos de framework quedan en inglés (`async`, `export`, `interface`).
  **Extendé en español**, no mezcles inglés en el dominio.
- **Archivos**: `kebab-case` (`jugador.service.ts`, `action-result.ts`).
- **Componentes**: `PascalCase.tsx` (`PlayerCard.tsx`, `HubHero.tsx`).
- **Acciones**: `camelCase` + sufijo `Action` (`subirFotoAction`).
- **Servicios**: `camelCase` verbo primero (`obtenerDetalleJugadorDt`).
- **Constantes-unión**: `SCREAMING_SNAKE` (`ROLES`, `POSICIONES`, `NIVELES`).
- **Validación con Zod** (`src/lib/validators/`) en el borde (acciones/handlers).
- **Estilos**: Tailwind v4 vía `@theme` en `src/app/globals.css`. **No hay
  `tailwind.config.js`** ni CSS Modules. Usá tokens del tema, no valores
  hardcodeados. White-label por escuela vía variable CSS `--brand`.

---

## 7. Antes de dar algo por terminado

1. `npm run typecheck` — limpio.
2. `npm run lint` — limpio.
3. `npm run test` — verde (los unit tests cubren guards, motor de stats, rangos,
   umbrales, fondos, progreso, xlsx, sanitización).
4. Si tocaste flujos de acceso/carta/semana/bloqueo: `npm run test:e2e`.
5. Si tocaste el schema: migración creada + `prisma generate` + seed sigue OK.
6. Commits: **conventional commits**, sin atribución de IA.

---

## 8. Mapa de documentación

| Archivo | Para qué |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | **Este contrato** para agentes (CLAUDE reexporta AGENTS). |
| `ESTADO-DEL-PROYECTO.md` | Estado integral: qué hay, qué falta, fases, stack. |
| `README.md` | Puesta en marcha rápida. |
| `MANUAL-DE-USO.md` | Guía de uso por rol. |
| `DECISIONES.md` | Registro de decisiones de arquitectura/producto. |
| `SEGURIDAD.md` | Checklist de seguridad por endpoint. |
| `HABEAS-DATA.md` | Tratamiento de datos personales de menores. |
| `PLAN-MEJORAS-*.md`, `CORRECCIONES-SPRINT-*.md` | Planes y bitácoras de sprint. |
