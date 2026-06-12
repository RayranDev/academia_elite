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

## Sprint 7 — Endurecimiento

12. **Proxy: redirect con host real.** Con `AUTH_URL` fijo, el wrapper de Auth.js
   ponía `req.nextUrl.origin` = AUTH_URL, así que los redirects del proxy
   apuntaban siempre a ese host/puerto (rompía en cualquier puerto distinto, p.
   ej. en E2E). El proxy ahora construye las URLs absolutas desde el header
   `Host` (+ `X-Forwarded-Proto`). Portabilidad correcta sin depender de AUTH_URL.

13. **E2E contra build de producción.** Playwright levanta `next build && next
   start -p 3100` (no el dev server, que compila on-demand y es lento/flaky).
   Las pruebas comparten `dev.db` y corren en serie (`workers: 1`).

14. **CSP**: `script-src` incluye `'unsafe-inline'` (Next inyecta scripts inline)
   pero **nunca** `'unsafe-eval'` en producción (solo en dev para el HMR).
   `style-src 'unsafe-inline'` por Tailwind v4.

## Sprint 4 — Motor de stats v1.1

10b. **Derivación de los 6 stats de carta (vacío de v3 resuelto).** El plan
   referencia "las ponderaciones v1" del motor de v3, que no acompañaba al
   documento. Se definió una derivación explícita y testeada (en
   `src/lib/stats-engine/weights.ts`) a partir de las medidas normalizadas:
   - Físicas → VEL (sprint), POT (salto), AGI (agilidad), RES (yoyo) en [40,99].
   - Técnicas (1-10) → CTRL, PAS, TIR, REG en [1,99] (nota × 9.9).
   - `RIT = 0.65·VEL + 0.35·AGI` · `TIR = 0.75·TIR + 0.25·POT` ·
     `PAS = 0.75·PAS + 0.25·CTRL` · `REG = 0.55·REG + 0.25·AGI + 0.20·CTRL` ·
     `DEF = 0.45·RES + 0.30·POT + 0.25·CTRL` · `FIS = 0.50·RES + 0.35·POT + 0.15·VEL`.
   Cada fila suma 1.0 (queda en rango). `MEN` = promedio de las 4 dimensiones de
   mentalidad. `OVR = (1−pesoMen)·Σ(peso_posición·stat) + pesoMen·MEN`, con
   `pesoMen` desde `ParametroFormula("PESO_MEN_EN_OVR")`.

10c. **Rangos físicos por edad embebidos** (`ranges.ts`) con valores iniciales
   razonables (SUB8–SUB16). El motor acepta override por `opts.rangos`; la
   edición desde `ParametroFormula` por el SUPER_ADMIN queda como refinamiento.

10d. **Piso físico 40 / técnico 1.** Las medidas físicas normalizan a [40,99]
   (un niño nunca "vale 1" físicamente); técnicas y mentalidad a [1,99].

### Alcance del seed en Sprint 0
9. El seed (Apéndice B) se implementa por capas: en el Sprint 0 cubre la
   estructura base + los **4 usuarios (uno por rol)** para verificar login/RBAC,
   más categorías, DT, 10 jugadores, catálogo de logros, leads y parámetros.
   Las **evaluaciones con stats, eventos y mensajes** se añadirán en los sprints
   que construyen esos módulos (4, 5 y 6), porque dependen del motor de stats y
   de los servicios de dominio que aún no existen.

### Sprint V.1 (mejoras visuales post-V)
11. **Avatar con DiceBear local.** Se sustituye el SVG propio por
    `@dicebear/core` + `@dicebear/collection` (estilo "adventurer") por pedido
    del usuario. La generación es **en el propio proceso** (toDataUri síncrono),
    nunca contra la API pública de DiceBear: no sale ningún dato de menores.
    La `AvatarConfig` existente (género/piel/peinado/cabello) se mapea a
    opciones del estilo; el editor del jugador no cambia.
12. **Progreso personal independiente del deportivo.** `ProgresoSemanal`
    (validación semanal del responsable, hábitos boolean) alimenta XP/nivel y
    los atributos Mentalidad/Disciplina (50–99, ventana de 12 semanas) vía el
    motor puro `src/lib/progreso/engine.ts`. No toca OVR ni la carta.
13. **Tema claro/oscuro por tokens.** `html.light` sobreescribe los tokens
    `--color-*` de Tailwind v4; preferencia en `localStorage` (`fcm-tema`) con
    script inline anti-FOUC. Las cartas conservan sus materiales premium en
    ambos temas.

### Sprint G (gestion y administracion)
14. **Bloqueo de acceso a nivel de cuenta de familia.** Se marca User.bloqueado
    del padre/cuenta (no del jugador), porque el acceso es de la familia. El
    guard de sesion (requireAuthContext/requirePanelUser) desvia al JUGADOR
    bloqueado a la pagina de bloqueo. Cuatro motivos (PAGO, COMPORTAMIENTO,
    CONTACTA_DT, PERSONALIZADO) con mensajes predefinidos en lib/bloqueo.
15. **Eliminacion de jugadores SOLO logica.** Estado ELIMINADO (reversible, solo
    SUPER_ADMIN), nunca borrado fisico: preserva evaluaciones e historial y
    permite restaurar. Los repos filtran ELIMINADO de las listas.
16. **Logros con posicion + disponibilidad por escuela.** Logro.posicion
    (null=general), Logro.escuelaId (null=catalogo global; con valor=propio del
    DT) y Logro.activo. La tabla LogroEscuela activa/programa ventanas
    (desde/hasta) por escuela. La disponibilidad es una funcion pura (lib/logros)
    reutilizada al otorgar y al consumir bonus en evaluaciones.
17. **Rangos fisicos por edad editables en BD (G8).** Migrados de ranges.ts a
    ParametroFormula con claves RANGO_<PRUEBA>_<GRUPO>_<MIN|MAX>. El motor sigue
    siendo puro: evaluacion.service lee los valores y arma los rangos con
    rangosDesdeParametros (fallback al embebido). El simulador (G7) usa el mismo
    helper, asi reproduce exactamente el OVR de una evaluacion real.
18. **Despachador de notificaciones (G9).** lib/notify/dispatcher define
    CanalNotificacion; hoy se registra solo el canal INAPP (desde
    notificacion.service). notificar() despacha a INAPP/EMAIL/WHATSAPP; los
    canales sin implementacion se ignoran en silencio. Email/WhatsApp se suman en
    Fase 2 sin tocar a los llamadores.
