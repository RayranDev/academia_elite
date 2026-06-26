# Hoja de ruta — Academia Elite

> **Qué es este archivo.** El documento *forward-looking*: dónde estamos, qué
> sigue y cómo es la migración a producción. Para el historial de lo ya hecho ver
> `TRAZABILIDAD.md`; para el estado integral, `ESTADO-DEL-PROYECTO.md`.
>
> Última actualización: 2026-06-26.

---

## 1. Dónde estamos

- **Código**: listo en lo arquitectónico (capas estrictas, seguridad de menores,
  multi-tenant con test guardián, motor de stats puro y testeado). Auth por correo
  y email transaccional (Resend) ya integrados.
- **Calidad**: `typecheck` / `lint` / `test` (138 unit) / `build` / `e2e` en verde.
- **Infraestructura**: **NO lista para producción**. Corre sobre **SQLite** local
  y **fotos en disco local** — ambos efímeros en serverless. Auth.js en **beta**.
- **Veredicto** (del análisis técnico): el código puede facturar desde el día 1;
  la infraestructura está en modo desarrollo. El camino corto y seguro a
  producción es el **Sprint 8** (migración).

---

## 2. Próximos pasos — organización previa (antes de migrar)

Pequeños y de bajo riesgo; dejan la app ordenada para encarar la migración.

1. **Documentación** *(en curso)* — consolidar historial en `TRAZABILIDAD.md`,
   esta hoja de ruta, y mantener vivos `ESTADO-DEL-PROYECTO` / `SEGURIDAD` /
   `HABEAS-DATA` / `DECISIONES`.
2. **Decisión de Auth** *(bloquea parte de la migración)* — elegir entre: (a)
   estabilizar Auth.js v4, (b) migrar a **Supabase Auth**, o (c) mantener v5 beta
   con cobertura E2E y plan de rollback. Afecta cómo se hace el resto.
3. **Resend a producción** — verificar el dominio (`academia-elite.app`), setear
   `RESEND_API_KEY` + `EMAIL_FROM` reales. Hoy funciona en modo dev (consola).
4. **Limpieza CSP** — quitar `cdn.jsdelivr.net` de `next.config.ts` si nada lo usa
   (el modelo de remoción de fondo ya es self-hosted en `/imgly/`).
5. **Extender credenciales por link** — aplicar `emitirSetPassword` también al
   alta de DT y de jugador (hoy solo en alta de escuela).
6. **Variables de entorno** — auditar `.env.example`: `CRON_SECRET` y
   `AUTH_SECRET` seguros, `AUTH_URL`/`NEXTAUTH_URL` al dominio real, env de Resend.

---

## 3. Migración a producción — Sprint 8

### 3a. Bloqueantes (no se lanza sin esto)

- [ ] **SQLite → Supabase PostgreSQL.** Adaptar `schema.prisma` (enums nativos,
      tipos), `DATABASE_URL`, `prisma migrate deploy` + `db:seed`, verificar
      integridad de relaciones. Prisma abstrae el driver; el dominio no se toca.
- [ ] **Fotos en disco → Supabase Storage** (con RLS). Migrar la API de fotos
      (`/api/archivos/foto/[jugadorId]`) manteniendo el control de acceso, EXIF
      strip, WebP y `no-store`. Sin esto, la privacidad de menores no sobrevive a
      un deploy.
- [ ] **Decisión de Auth** (ver §2.2) implementada y probada.
- [ ] **Secretos de producción**: `CRON_SECRET` y `AUTH_SECRET` nuevos y seguros,
      `AUTH_URL`/`NEXTAUTH_URL` al dominio real, dominio de Resend verificado.

### 3b. Importantes (primer mes post-lanzamiento)

- [ ] **CI/CD**: rama `main` protegida + flujo con `develop`; GitHub Actions
      corriendo `typecheck`/`lint`/`test` en cada PR.
- [ ] **Monitoreo**: Sentry (tier gratuito) para errores de Server Actions.
- [ ] **Rate limit persistente**: Upstash Redis (hoy es en memoria — se resetea en
      serverless). Reemplaza `src/lib/rate-limit.ts`.
- [ ] **`error.tsx` global** en el App Router (degradación elegante).
- [ ] **Paginación** en listados que crecen (jugadores, eventos, mensajes).

### 3c. Mejoras (meses 2–3)

- [ ] Backups automáticos / PITR en Supabase.
- [ ] **RLS en Supabase** como segunda capa de aislamiento multi-tenant.
- [ ] Alertas de uptime (UptimeRobot / analytics del host).
- [ ] Feature flags para activar/desactivar módulos sin deploy.
- [ ] Health checks (`/health`, `/ready`).
- [ ] Evaluar estabilizar versiones (Next/React/Prisma) cuando maduren.

---

## 4. Decisiones pendientes

| Decisión | Opciones | Nota |
|---|---|---|
| **Base de datos** | Supabase PostgreSQL | No-negociable para producción (RLS, backups, PITR, tier gratuito generoso). |
| **Auth** | Supabase Auth · Auth.js v4 estable · v5 beta con E2E | El análisis desaconseja v5 beta para menores en prod sin red de pruebas. |
| **Hosting** | **Render** · Vercel | Render si priorizás crons largos + WebSockets nativos; Vercel si priorizás DX + previews por PR. Ambos requieren Supabase. |
| **Storage de fotos** | Supabase Storage | Con RLS; mínimos cambios en la API de fotos. |

> La elección Vercel vs Render es secundaria; lo no-negociable es **Supabase**.
> La arquitectura por capas permite migrar de infra sin tocar el dominio (motor de
> stats, RBAC, multi-tenancy) — esa es la póliza de seguro.

---

## 5. Riesgos a vigilar

- **Versiones bleeding-edge** (Next 16, React 19, Prisma 7, Tailwind v4): posibles
  bugs no documentados; tener plan de rollback.
- **Datos de menores**: cualquier servicio externo nuevo pasa por Habeas Data
  (`HABEAS-DATA.md`) antes de tocar fotos o PII — sin excepciones.
- **Migración de enums SQLite → PostgreSQL**: hoy son `String` validados por Zod;
  en Postgres se puede usar enums nativos, pero hay que migrar con cuidado los
  datos existentes.
