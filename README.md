# ⚽ Fútbol Career Mode

Plataforma web multi-escuela que gamifica la formación en fútbol base:
evaluaciones reales → carta estilo Modo Carrera con stats, niveles y evolución.

Implementación basada en `PLAN-MAESTRO-v4.md` (en la carpeta raíz del proyecto).

## Stack
Next.js 16 (App Router) · TypeScript estricto · Tailwind v4 · Prisma 7 + SQLite
(driver adapter) · Auth.js v5 (Credentials + JWT) · Zod v4 · Vitest.

## Puesta en marcha (Windows / local)

```powershell
npm install
npx prisma migrate dev      # crea dev.db y aplica el schema
npm run db:seed             # datos demo deterministas
npm run dev                 # http://localhost:3000
```

> Si el puerto 3000 está ocupado, Next usará el 3001 (lo indica en consola).

## Usuarios demo

Contraseña para todos: **`Demo1234!`**

| Email              | Rol           | Panel       |
|--------------------|---------------|-------------|
| admin@demo.app     | SUPER_ADMIN   | `/admin`    |
| escuela@demo.app   | ESCUELA_ADMIN | `/escuela`  |
| dt@demo.app        | DT            | `/dt`       |
| jugador@demo.app   | JUGADOR       | `/jugador`  |

> Credenciales válidas solo en entorno local de demostración.

## Scripts

| Comando             | Qué hace                                  |
|---------------------|-------------------------------------------|
| `npm run dev`       | Servidor de desarrollo                    |
| `npm run build`     | Build de producción                       |
| `npm run typecheck` | TypeScript sin emitir                     |
| `npm test`          | Tests unitarios (Vitest)                  |
| `npm run db:seed`   | Re-siembra la base demo (idempotente)     |
| `npm run db:reset`  | Resetea la BD y vuelve a migrar+sembrar   |

## Arquitectura (capas, dependencias solo hacia abajo)

`app | components → actions → services → repositories → prisma`

- **Presentación** (`src/app`, `src/components`): renderiza, sin lógica ni BD.
- **Aplicación** (`src/actions`): autentica, valida (Zod), autoriza (RBAC).
- **Dominio** (`src/services`, `src/lib/stats-engine`): reglas de negocio puras.
- **Datos** (`src/repositories`, `prisma`): acceso a datos con `escuelaId`.

Seguridad: ver Sección 6 del Plan Maestro y `DECISIONES.md`.

## Estado por sprints

- [x] **Sprint 0** — Setup, schema completo, seed, Auth.js + RBAC (guards + proxy),
      layout base con design tokens. 4 logins → 4 paneles; cruce de rol redirige;
      test de guards en verde.
- [x] **Sprint 1** — Landing animada (Hero con carta 3D, demo en vivo con slider,
      features, formulario de captación), `POST /api/leads` con honeypot +
      tiempo mínimo + rate limit, y el componente firma `PlayerCard` v1.
- [x] **Sprint 2** — Panel Súper Admin: pipeline de leads (kanban con cambio de
      estado), conversión lead→escuela+admin (con contraseña temporal), edición
      de parámetros de fórmula y explorador de AuditLog. Toda acción sensible
      queda auditada.
- [x] **Sprint 3** — Panel Escuela (autogestión): categorías, sedes/canchas,
      DTs (alta con contraseña temporal y categorías asignadas), códigos de
      invitación (generación/desactivación) y branding white-label
      (`colorPrimario` inyectado como `--brand` que tiñe el panel del tenant).
- [x] **Sprint 4** — Núcleo: motor de stats v1.1 puro y testeado (38 tests),
      auto-registro del padre por código, plantilla de mini-cartas, solicitudes
      (aprobar/rechazar), **formulario de evaluación 4+4+4** y snapshot inmutable.
      La carta "nace" con OVR, sello MEN y nivel; los logros BONUS se aplican con
      tope anti-inflación.
- [ ] Sprint 5 — Hub del jugador (carta hero, evolución, logros, objetivos, foto).
- [ ] … (ver roadmap en el Plan Maestro, Sección 17).
