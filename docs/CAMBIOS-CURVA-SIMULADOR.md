# Cambios — Simulador configurable, planilla con fórmulas y curva de desarrollo (MEN diario)

> Resumen de lo implementado en esta tanda. **Sin commitear**: lo subís vos.
> Verificado: `typecheck`, `lint`, `test` (107, +10 de la curva), `build` y
> `test:e2e` (8) en verde. Diseño conceptual de la curva en `CURVA-DE-DESARROLLO.md`.

---

## Parte A — Simulador con parámetros elegibles (global | escuela)

El simulador (`/admin/simulador`, SUPER_ADMIN) ahora simula con los parámetros
**predeterminados (globales)** o los **efectivos de una escuela** (sus overrides),
por grupo de edad (SUB8…SUB16, que es lo que se llamaba "categorías").

- `src/services/parametro.service.ts`: nueva `obtenerConfigSimuladorEscuela(ctx, escuelaId)`
  (combina `resolverParametrosEscuela` + `rangosDesdeParametros` + `umbralesDesdeParametros`;
  `pesoMen` se mantiene global). Se exporta el tipo `ConfigSimulador`.
- `src/app/admin/simulador/page.tsx`: lee `?escuela=`, carga config global o por
  escuela, y muestra el selector + el botón de descarga de la planilla.
- `src/components/admin/SelectorSimulador.tsx` (nuevo): selector global ↔ escuela.

## Parte B — Planilla Excel con fórmulas de OVR/MEN

Botón **"Descargar planilla con fórmulas"** en el simulador. Genera un `.xlsx`
que replica el motor con fórmulas nativas: al cargar las 12 medidas + Posición +
GrupoEdad, calcula RIT…FIS, MEN, OVR y Nivel solo, con los parámetros del objetivo
elegido (global o escuela).

- `src/services/plantilla-simulador.service.ts` (nuevo): hoja **Parametros**
  (rangos por grupo, pesos por posición, `pesoMen`, umbrales) + hoja **Jugadores**
  con una fila de ejemplo y fórmulas (helpers ocultos AA..AR con normalización
  `INDEX/MATCH` por grupo/posición) + hoja **Instrucciones**.
- `src/app/api/plantilla-simulador/route.ts` (nuevo): `GET ?escuela=` opcional.

## Parte C — Crecimiento real de MEN a diario (curva de desarrollo)

El esfuerzo del jugador hace crecer su MEN —y con él su carta— **día a día**, sin
esperar a la evaluación.

**Reglas** (`src/lib/curva.ts`, puro y testeado):
- Cada **entrenamiento** asistido suma **+0.6** de MEN; cada **partido**, **+1.2**.
- **Tope** del bonus: **+12** (acota el efecto a ~10% del OVR vía `PESO_MEN_EN_OVR`).
- **Decaimiento** solo a partir de la **3ª ausencia** (`> 2`), **recuperable**:
  volver a asistir lo vuelve a subir. Piso 0.
- Ventana móvil de **30 días**. El cálculo es **idempotente** (se recalcula desde
  la ventana; correrlo varias veces no desvía).

**Piezas:**
- Schema: `Jugador.menBonus Float @default(0)` + `menBonusActualizado DateTime?`.
  Migración `prisma/migrations/20260613221225_jugador_men_bonus/`.
- `src/lib/stats-engine/compute.ts`: nueva `ovrConMen(stats6, posicion, pesoMen, men)`
  (recalcula el OVR con un MEN distinto, sin re-evaluar). Exportada en el índice.
- `src/repositories/evento.repository.ts`: `contarAsistenciasJugador(...)` y
  `asistenciasRecientesGlobal(desde)` (para el cron).
- `src/repositories/jugador.repository.ts`: `idsJugadoresActivos()` y
  `actualizarMenBonus(...)`.
- `src/services/curva.service.ts`: `recalcularMenDiario()` (agrega asistencia por
  jugador y actualiza el bonus de todos los activos).
- **Cron**: `src/app/api/cron/men-diario/route.ts` (GET, protegido por
  `CRON_SECRET` → `Authorization: Bearer …`). `vercel.json` con el schedule
  diario (`0 6 * * *`). `.env.example` documenta `CRON_SECRET`.
- `src/services/player.service.ts` (`obtenerHub`): la **carta del hub** refleja el
  MEN en vivo (base medido + bonus) y recalcula el OVR. `HubDTO` suma
  `asistenciasCurva` y `proyeccionCurva`.
  **Límite de alcance**: el bonus afecta solo la carta del **hub del jugador**;
  ranking / export / dashboard siguen usando el OVR **medido** (comparabilidad).
- `src/app/jugador/page.tsx`: `CrecimientoTile` — mensaje motivacional con la
  asistencia reciente, el MEN ganado y la proyección.
- `tests/unit/curva.test.ts`: 10 tests (ganancia, tope, decaimiento > 2 ausencias,
  recuperación, `ovrConMen`).

---

## Antes de mergear / desplegar

1. **Migración**: ya aplicada en local (`migrate deploy`). En cada entorno correr
   `npx prisma migrate deploy` + `prisma generate`.
2. **`CRON_SECRET`**: definir un valor real en el entorno (Vercel) para que el
   cron quede protegido.
3. **Abrir la planilla** (`/api/plantilla-simulador`) en Excel/LibreOffice y
   confirmar que las fórmulas calculan OVR/MEN bien por grupo y posición — no es
   verificable por `typecheck`/`build` (si no recalcula, `F9`).
4. **Probar el cron** a mano:
   `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/men-diario` →
   debería responder `{ ok: true, actualizados: N }`; revisar que `menBonus` suba
   con asistencia y baje con > 2 ausencias.
5. **Recordatorio e2e**: el `test:e2e` usa `dev.db` sin reset → correr
   `npm run db:seed` antes de `npm run test:e2e`.
6. Sugerido: **revisión fresca del diff** antes de mergear (la Parte C toca el
   motor de stats y agrega un cron).

## Archivos nuevos
- `src/lib/curva.ts`
- `src/services/curva.service.ts`
- `src/services/plantilla-simulador.service.ts`
- `src/components/admin/SelectorSimulador.tsx`
- `src/app/api/cron/men-diario/route.ts`
- `src/app/api/plantilla-simulador/route.ts`
- `tests/unit/curva.test.ts`
- `vercel.json`
- `prisma/migrations/20260613221225_jugador_men_bonus/migration.sql`

## Archivos modificados
- `prisma/schema.prisma` (Jugador: `menBonus`, `menBonusActualizado`)
- `src/lib/stats-engine/compute.ts` + `index.ts` (`ovrConMen`)
- `src/services/parametro.service.ts` (`obtenerConfigSimuladorEscuela`, `ConfigSimulador`)
- `src/services/player.service.ts` (`obtenerHub`: MEN/OVR en vivo + curva)
- `src/repositories/evento.repository.ts`, `src/repositories/jugador.repository.ts`
- `src/app/admin/simulador/page.tsx`, `src/app/jugador/page.tsx`
- `.env.example`
