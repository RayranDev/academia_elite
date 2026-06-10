# DECISIONES.md

Registro de adaptaciones respecto al Plan Maestro v4 (regla 0.8: si una librería
cambió de API, se adapta y se documenta aquí).

## Sprint 0 — Setup, datos, auth y RBAC

### Versiones reales instaladas (más nuevas que las del plan)
- **Next.js 16.2.9** (el plan asumía 14+). Implica los cambios de abajo.
- **React 19.2**.
- **Prisma 7.8** (el plan asumía Prisma 5/6).
- **Tailwind CSS v4** (config basada en CSS, no `tailwind.config.ts`).
- **Zod v4**.
- **Auth.js v5 (next-auth beta 31)**, como pide el plan.

### Adaptaciones por Next.js 16
1. **`middleware.ts` → `proxy.ts`**: Next 16 renombró Middleware a Proxy
   (misma funcionalidad). El archivo vive en `src/proxy.ts` y usa una instancia
   de Auth.js *edge-safe* (solo `authConfig`, sin Prisma/bcrypt).
2. `params`, `cookies()`, `headers()` son asíncronos (se usan con `await`).

### Adaptaciones por Prisma 7
3. **Driver adapters obligatorios**: el `url` ya no va en el `datasource` del
   schema; va en `prisma.config.ts` (para Migrate) y el cliente runtime se crea
   con `@prisma/adapter-better-sqlite3` (`src/lib/db.ts`). En Fase 2 se cambia
   el adapter por el de Postgres/Supabase sin tocar el resto.
4. **Generador `prisma-client`** (nuevo, TS) con salida a `src/generated/prisma`
   (gitignored). Import del cliente: `@/generated/prisma/client`.
5. El seed se declara en `prisma.config.ts` (`migrations.seed`), no en
   `package.json`.

### Adaptaciones por Tailwind v4
6. Los design tokens "Noche de estadio" se declaran con `@theme` en
   `globals.css` (no hay `tailwind.config.ts`). Quedan como utilidades:
   `bg-base`, `bg-surface`, `text-muted`, `text-pitch`, `border-subtle`, etc.

### Decisiones de modelado
7. **Cuenta JUGADOR**: el plan dice que "la cuenta JUGADOR la gestiona el padre".
   Para soportar el login de los 4 roles se añadió `Jugador.cuentaUserId`
   (`@unique`, relación `CuentaJugador`) que vincula un `User` de rol `JUGADOR`
   con su `Jugador`. El `AuthContext` de un JUGADOR resuelve su `jugadorId` por
   ahí. `padreUserId` sigue modelando la relación familiar (un padre, varios
   hijos).
8. **`Anuncio.visibleJugador`**: campo añadido (no estaba explícito en el schema
   v3 pero sí en la regla 9.1 "mostrar al jugador" → noticia del club).

### Alcance del seed en Sprint 0
9. El seed (Apéndice B) se implementa por capas: en el Sprint 0 cubre la
   estructura base + los **4 usuarios (uno por rol)** para verificar login/RBAC,
   más categorías, DT, 10 jugadores, catálogo de logros, leads y parámetros.
   Las **evaluaciones con stats, eventos y mensajes** se añadirán en los sprints
   que construyen esos módulos (4, 5 y 6), porque dependen del motor de stats y
   de los servicios de dominio que aún no existen.
