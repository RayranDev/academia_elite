# ⚽ Fútbol Career Mode

**ERP para escuelas de fútbol base**, con una vuelta de tuerca: el DT toma
medidas reales de cada chico y el motor las convierte en una carta estilo Modo
Carrera con stats, nivel y evolución.

La carta es lo que engancha a la familia; la **administración** —plantel,
asistencia, cobranza— es lo que sostiene a la escuela. La app cubre las dos.

El contexto del proyecto (visión, arquitectura, estado) está en
[docs/ESTADO-DEL-PROYECTO.md](docs/ESTADO-DEL-PROYECTO.md); las reglas para
trabajar en el repo, en [AGENTS.md](AGENTS.md).

## Stack
Next.js 16 (App Router) · TypeScript estricto · Tailwind v4 · Prisma 7 +
**Supabase PostgreSQL** (driver adapter) · Supabase Storage · Upstash Redis ·
Auth.js v5 (Credentials + JWT) · Zod v4 · Vitest + Playwright. Desplegado en
Vercel.

## Puesta en marcha (local)

Requiere una base **PostgreSQL** (un proyecto Supabase "dev" gratuito alcanza)
con `DATABASE_URL` y `DIRECT_URL` en `.env` — ya no hay SQLite local.

```bash
npm install
npx prisma migrate deploy   # aplica las migraciones
npm run db:seed             # datos demo deterministas (idempotente)
npm run dev                 # http://localhost:3000
```

> Si el puerto 3000 está ocupado, Next usará el 3001 (lo indica en consola).

## Usuarios demo

Las credenciales de las cuentas demo son de **uso interno del equipo** y viven
en [docs/ACADEMIA-ELITE-DEMO.md](docs/ACADEMIA-ELITE-DEMO.md), fuera de este
README. No se documentan cuentas de acceso en la portada pública del repo.

## Scripts

| Comando             | Qué hace                                  |
|---------------------|-------------------------------------------|
| `npm run dev`       | Servidor de desarrollo                    |
| `npm run build`     | Build de producción                       |
| `npm run typecheck` | TypeScript sin emitir                     |
| `npm test`          | Tests unitarios (Vitest)                  |
| `npm run test:e2e`  | E2E con Playwright (build + flujos críticos) |
| `npm run db:seed`   | Re-siembra la base demo (idempotente)     |
| `npm run db:reset`  | Resetea la BD y vuelve a migrar+sembrar   |

## Arquitectura (capas, dependencias solo hacia abajo)

`app | components → actions → services → repositories → prisma`

- **Presentación** (`src/app`, `src/components`): renderiza, sin lógica ni BD.
- **Aplicación** (`src/actions`): autentica, valida (Zod), autoriza (RBAC).
- **Dominio** (`src/services`, `src/lib/stats-engine`): reglas de negocio puras.
- **Datos** (`src/repositories`, `prisma`): acceso a datos con `escuelaId`.

Seguridad: ver §5 de [AGENTS.md](AGENTS.md), `SEGURIDAD.md`, `HABEAS-DATA.md` y
`DECISIONES.md`.

## Estado

En producción (Supabase + Vercel): landing con captación de leads, panel por
rol (SUPER_ADMIN / ESCUELA_ADMIN / DT / JUGADOR), evaluaciones → carta con
stats/nivel/evolución, eventos + calendario + Modo Sesión (entrenamiento y
partido en vivo), mensajería y anuncios, notificaciones in-app, **curva de
desarrollo** (la asistencia mueve el MEN a diario vía cron) y el módulo de
**cobranza**: lista de precios por categoría, generación de las cuotas del mes de
un click, registro del pago y deuda derivada.

Mercado objetivo: **Colombia**.

Para no tener dos versiones de la verdad, la historia y el estado no se narran
acá:

- **Estado integral** (qué hay, qué falta, fases): [docs/ESTADO-DEL-PROYECTO.md](docs/ESTADO-DEL-PROYECTO.md)
- **Historial completo** de lo hecho: [docs/TRAZABILIDAD.md](docs/TRAZABILIDAD.md)
- **Pendientes**: [docs/PENDIENTES.md](docs/PENDIENTES.md)
