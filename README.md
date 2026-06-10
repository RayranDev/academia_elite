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
- [ ] Sprint 1 — Landing + leads + PlayerCard.
- [ ] Sprint 2 — Panel Súper Admin.
- [ ] … (ver roadmap en el Plan Maestro, Sección 17).
