# PLAN MEJORAS 2 — Sprint M (mejoras post-Sprint G)

> Documento vivo para revisión. Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecho.

## Contexto

Sprints V, V.1 y G completos y en verde (64 unit, 8 E2E). Esta fase cubre los
10 puntos pedidos por el usuario: 1 bug real (simulador congelado), pulido de
carta/landing, calendario para el jugador, validación de progreso por DT,
carga masiva de jugadores, curva de niveles ajustable, métricas por escuela,
filtro de usuarios y migración del avatar a DiceBear v10 (toon-head).

Decisiones ya tomadas con el usuario:
- **Métricas por escuela**: las configura el **ESCUELA_ADMIN** en su panel
  (`/escuela/metricas`); lo global del Súper Admin queda como default/fallback.
- **Carga masiva**: **CSV** (plantilla descargable que se abre en Excel; sin
  dependencia nueva). **Solo jugadores** (las familias se vinculan luego con
  código de invitación, como hoy).
- **Umbrales de nivel**: se mantienen 65/75/85 como default, pero pasan a ser
  **editables** (global y por escuela).
- **Avatar**: migrar a `@dicebear/core@^10` + `@dicebear/styles@^10`, estilo
  **toon-head**, exponiendo TODAS sus opciones en el editor.

Principios transversales (obligatorios, como en los sprints anteriores):
seguridad checklist 6.8 (`AuthContext` de sesión, `requireRole`/`assertTenant`/
scoping por categorías del DT, Zod en la frontera, AuditLog en acciones
sensibles, DTOs — nunca modelos Prisma), capas
`app|components → actions → services → repositories → prisma`, componetizado
(~150 líneas por archivo), commits en español, no romper la suite E2E.

---

## M1. Bug: simulador congelado (CountUp)

`src/components/cards/CountUp.tsx`: con `reveal=false`, `display` se fija en el
`useState` inicial y el efecto retorna temprano → nunca se actualiza al cambiar
`value` (por eso el OVR/stats no se mueven en `/admin/simulador`).

- [x] **Fix**: renderizar `value` directo cuando no hay reveal:
      `return <>{reveal ? display : value}</>;` (el efecto queda solo para reveal).

## M2. Carta: 4 esquinas iguales

- [x] `src/components/cards/PlayerCard.tsx`: eliminar la constante `CLIP`
      (clip-path que muerde la esquina inferior derecha) y sus ~7 usos en las
      capas. Queda `rounded-[14px]` uniforme en las 4 esquinas. Ya sin clip, el
      drop-shadow puede volver a box-shadow si se ve mejor — decidir visualmente.

## M3. Landing: foto real `nino_carta.png` en las cartas demo

- [x] El archivo existe en la **raíz del proyecto** (2.2 MB). Optimizarlo con
      sharp (resize ~700px, compresión) y guardarlo como `public/nino_carta.png`.
- [x] `src/lib/demo-card.ts`: poner `fotoUrl: "/nino_carta.png"` en los 4
      niveles demo → `Hero.tsx` y `LiveDemo.tsx` (landing) muestran la foto
      fundida con la máscara en vez del avatar. No se toca nada más.

## M4. /admin/usuarios: filtro por escuela

- [x] `src/components/gestion/UsuariosGestion.tsx`: `<select>` de escuela junto
      al filtro de rol. Filtrado **en cliente** por `escuelaNombre` (el DTO ya
      lo trae); la lista de escuelas se deriva de los propios datos + opción
      "Sin escuela". No hace falta tocar el servicio.

## M5. Calendario del jugador

- [x] `src/services/evento.service.ts`: nueva `listarCalendarioJugador(ctx)` —
      `requireRole(["JUGADOR"])`, hijo vía `listarHijos(ctx.userId)` (primero),
      eventos de su categoría en el mismo rango que `listarCalendarioDt`
      (reutilizando el repositorio de eventos). Devuelve `EventoCalendarioDTO[]`.
- [x] `src/components/calendar/MonthGrid.tsx`: prop opcional
      `eventoHref?: (id: string) => string`. El DT pasa
      `(id) => "/dt/eventos/" + id`; el jugador no pasa nada → el item del panel
      lateral se renderiza sin `<Link>` (solo hora + título). Ajustar
      `src/app/dt/calendario/page.tsx`.
- [x] Nueva página `src/app/jugador/calendario/page.tsx` (server) con
      `<MonthGrid />`.
- [x] Nav jugador: `{ href: "/jugador/calendario", label: "Calendario",
      icon: "calendario" }`.

## M6. Progreso personal: validación por DT + masiva

- [x] `src/services/progreso.service.ts`:
      - `obtenerProgresoPlantillaDt(ctx)`: jugadores ACTIVOS de las categorías
        del DT con flag `semanaValidada` (nuevo en repositorio:
        `listarSemana(escuelaId, semana, jugadorIds)`).
      - `validarSemanaDt(ctx, entradas: { jugadorId, habitos, nota? }[])`:
        scoping por categorías del DT, salta los ya validados (no error), crea
        con `validadoPorId = ctx.userId`, **auditado** por jugador. Máx ~100
        entradas (Zod).
      - La validación sigue siendo **única por semana** (valida quien llegue
        primero: padre o DT).
- [x] `src/actions/progreso.actions.ts`: `validarSemanaDtAction` (array
      serializado JSON en FormData, Zod + rate limit).
- [x] Nueva página `src/app/dt/progreso/page.tsx` + componente cliente
      `src/components/dt/ProgresoMasivo.tsx`: tabla de jugadores (chips por
      categoría), 5 checkboxes por fila + "marcar columna", botón **"Validar
      marcados"**; filas ya validadas con check verde deshabilitado. Resultado:
      "N validados, M ya estaban".
- [x] Nav DT: `{ href: "/dt/progreso", label: "Progreso", icon: "progreso" }`.
- [x] En `/jugador/progreso`, el historial indica "Validada por tu DT" si
      `validadoPorId` no es el responsable (flag nuevo en el DTO).

## M7. Carga masiva de jugadores (CSV)

- [x] **Parser propio** `src/lib/csv.ts` (puro, con unit tests): detecta
      delimitador `,` o `;` (Excel es-CO usa `;`), maneja comillas y BOM UTF-8.
      `parseCsv(texto): string[][]` y `aCsv(filas): string` (con BOM).
- [x] **Plantilla descargable**: `GET /api/plantilla-jugadores?escuelaId=...` —
      sesión + rol (ESCUELA_ADMIN su tenant / SUPER_ADMIN cualquiera) vía
      servicio `generarPlantillaJugadores(ctx, escuelaId)`: CSV con cabeceras
      `nombre;apellido;fechaNacimiento(AAAA-MM-DD);posicion(POR|DEF|MED|DEL);dorsal(opcional);categoria`
      + fila de ejemplo + fila con las categorías válidas de ESA escuela.
      `Content-Disposition: attachment; filename=plantilla-<slug>.csv`.
- [x] **Servicio** `src/services/importacion.service.ts`:
      `importarJugadores(ctx, escuelaId, buffer)` — ESCUELA_ADMIN (su tenant) /
      SUPER_ADMIN; valida CADA fila con Zod (mismas reglas que
      `validators/jugador.ts`), mapea `categoria` por nombre → id de esa
      escuela, duplicado (mismo nombre+apellido+fechaNacimiento) → "omitido",
      crea los válidos (estado ACTIVO) en transacción. Devuelve
      `{ creados, omitidos, errores: [{ fila, mensaje }] }` (máx ~500 filas).
      **Auditado** (`IMPORTAR_JUGADORES` con conteos).
- [x] **Action** `importarJugadoresAction` (File .csv, máx 1 MB, rate limit
      5/h) en `src/actions/gestion.actions.ts`.
- [x] **UI** `src/components/gestion/ImportarJugadoresDialog.tsx`: botón
      "Importar CSV" → modal con (1) "Descargar plantilla", (2) input file,
      (3) resultado detallado. Montado en `/escuela/jugadores` y en
      `/admin/escuelas/[id]`.

## M8. Umbrales de nivel editables (curva ajustable)

- [x] `src/lib/stats-engine/levels.ts`: `UmbralesNivel {plata,oro,heroe}`,
      `UMBRALES_DEFECTO = {65,75,85}`, `nivelPorOvr(ovr, umbrales = defecto)` y
      `umbralesDesdeParametros(valores)` (claves `UMBRAL_PLATA/ORO/HEROE`,
      fallback + sanity plata<oro<heroe). Re-exportar en `index.ts`.
      `computeStats` gana `opts.umbrales?`. Tests existentes siguen verdes.
- [x] Seed: 3 filas `UMBRAL_*` en `ParametroFormula`.
- [x] `actualizarParametroGlobal` → **upsert** con whitelist de claves
      conocidas (BDs sin re-seed no fallan al editar claves nuevas).
- [x] `/admin/parametros`: sección "Umbrales de nivel". `obtenerConfigSimulador`
      devuelve `umbrales` y `SimuladorCarta` los recibe (leyenda dinámica).
- [x] `evaluacion.service`: leer `UMBRAL_*` y pasar `umbrales` al motor.

## M9. Métricas configurables por escuela

- [x] **Schema** (+migración `parametro_escuela`): `model ParametroEscuela
      { id, escuelaId, escuela, clave, valor Float, updatedAt,
      @@unique([escuelaId, clave]), @@index([escuelaId]) }`.
- [x] **Helper puro** `src/lib/parametros.ts` (con unit tests):
      `CLAVES_ESCUELA` (whitelist = `RANGO_*` + `UMBRAL_*`;
      `PESO_MEN_EN_OVR` queda **solo global** para que el OVR sea comparable
      entre escuelas — documentar), `mezclarParametros(global, override)` y
      `resolverParametros(...)` → `{valorGlobal, valorOverride, valorEfectivo,
      origen}` para la UI.
- [x] **Repositorio** `parametro-escuela.repository.ts`:
      `listarOverrides(escuelaId)`, `upsertOverride`, `eliminarOverride`.
- [x] **Servicio** `parametro-escuela.service.ts`: ESCUELA_ADMIN +
      `requireEscuela`; listar con procedencia, `fijarMetrica` /
      `quitarMetrica` — whitelist obligatoria, Zod (rangos min<max y umbrales
      en orden, validado contra el valor EFECTIVO mezclado), **auditado**
      (`CAMBIO_PARAMETRO_ESCUELA`).
- [x] **UI** `src/app/escuela/metricas/page.tsx`: misma estructura que
      `/admin/parametros` (agrupado por edad + umbrales); cada fila muestra el
      valor global y permite fijar/quitar el override. Nav escuela: "Métricas".
- [x] **`evaluacion.service`**: cargar overrides de la escuela junto a lo
      global, mezclar y derivar `rangos` + `umbrales` efectivos. El simulador
      del Súper Admin queda global (sin selector de escuela).

## M10. Avatar DiceBear v10 — toon-head con TODAS las opciones

- [x] **Deps**: `npm i @dicebear/core@^10.2.0 @dicebear/styles@^10.2.0`;
      **desinstalar** `@dicebear/collection` (único import en
      `PlayerAvatar.tsx`; verificado que nada más lo usa). Node 24 local OK
      (core v10 pide 22+).
- [x] **`src/lib/avatar/toon-head.ts`**: importa
      `definition from "@dicebear/styles/toon-head.json"` y deriva las listas
      en runtime de módulo (única fuente de verdad): `COMPONENTES` — hair 4
      (sideComed, undercut, spiky, bun), rearHair 4 (longStraight, longWavy,
      shoulderHigh, neckHigh), beard 5, eyes 5, eyebrows 5, mouth 5, clothes 5
      (filtrando body/head de 1 variante) — y `COLORES` (skin 5, hair 5,
      clothes 10). Etiquetas en español con fallback al nombre técnico. Primer
      paso: confirmar claves con `definition.components/colors`.
- [x] **`src/lib/avatar/config.ts`**: `AvatarConfigV2` (`{ v:2, hair, rearHair,
      beard, eyes, eyebrows, mouth, clothes, skinColor, hairColor,
      clothesColor }`, `-1` = "ninguno" en rearHair/beard), `mapV1aV2` (mapper
      puro determinista para configs viejas `{genero,piel,peinado,cabello}` —
      migración lazy, sin tocar BD; el editor guarda v2 al primer guardado),
      `parseAvatarConfig(raw)` centralizado (lo importan `player.service.ts` y
      `mappers/player-card.ts`), `avatarDesdeSeed` v2.
- [x] **`PlayerAvatar.tsx`**: `const style = new Style(definition)` a nivel de
      módulo; `new Avatar(style, { seed, hair: [..], hairProbability: 100,
      rearHair/beard como array u OMITIDO con <comp>Probability 0|100, eyes,
      eyebrows, mouth, clothes, skinColor, hairColor, clothesColor })
      .toDataUri()` → `<img>`. Sigue sin "use client" (toString síncrono).
- [x] **`AvatarEditor.tsx`**: reescritura — 7 selectores de variante + chip
      "Ninguno" para pelo largo/barba + 3 paletas de color (swatches), preview
      en vivo, guarda v2.
- [x] **Validador** `validators/avatar.ts`: bounds derivados de
      `lib/avatar/toon-head.ts`; `actualizarAvatarAction` envía campos v2. El
      servicio (`foto.service.actualizarAvatar`) no cambia.
- [x] **Tipos**: `AvatarConfig` pasa a unión v1|v2; `GENEROS_AVATAR` se
      conserva solo para el mapper v1.
- [x] **Tests** `tests/unit/avatar-config.test.ts`: mapper v1→v2 (bounds),
      parse de raw inválido, `avatarDesdeSeed` determinista, render con cada
      componente fijado produce SVG no vacío.

---

## Archivos críticos

- **Modificar**: `CountUp.tsx`, `PlayerCard.tsx`, `demo-card.ts`,
  `UsuariosGestion.tsx`, `MonthGrid.tsx`, `dt/calendario/page.tsx`,
  `evento.service.ts`, `progreso.service.ts` (+repo), `progreso.actions.ts`,
  `levels.ts` + `compute.ts` + `index.ts` (stats-engine),
  `parametro.service.ts`, `parametro.repository.ts`, `evaluacion.service.ts`,
  `admin/parametros/page.tsx`, `SimuladorCarta.tsx` + `admin/simulador/page.tsx`,
  `gestion.actions.ts`, `escuela/jugadores/page.tsx`,
  `admin/escuelas/[id]/page.tsx`, `jugador.actions.ts`,
  `validators/avatar.ts`, `types/index.ts`, `player.service.ts`,
  `mappers/player-card.ts`, layouts dt/jugador/escuela (nav), `prisma/seed.ts`,
  `package.json`.
- **Crear**: `jugador/calendario/page.tsx`, `dt/progreso/page.tsx`,
  `components/dt/ProgresoMasivo.tsx`, `lib/csv.ts`,
  `app/api/plantilla-jugadores/route.ts`, `services/importacion.service.ts`,
  `components/gestion/ImportarJugadoresDialog.tsx`, `lib/parametros.ts`,
  `repositories/parametro-escuela.repository.ts`,
  `services/parametro-escuela.service.ts`, `app/escuela/metricas/page.tsx`
  (+componente), `lib/avatar/{toon-head,config}.ts`, `public/nino_carta.png`,
  migración Prisma `parametro_escuela`, tests unit (csv, parametros, umbrales,
  avatar-config).

## Checkpoint M (verificación)

- [x] `npm run typecheck && npm run lint` limpios; `npm test` (64 existentes +
      nuevos) en verde.
- [x] `npm run db:seed` + `npm run test:e2e` → 8 E2E en verde.
- [x] Manual:
      - Simulador: mover sliders actualiza OVR/stats/nivel en vivo; leyenda de
        umbrales dinámica.
      - Carta con 4 esquinas iguales en sm/md/hero.
      - Landing muestra `nino_carta.png` integrada en las cartas demo.
      - `/admin/usuarios` filtra por escuela.
      - La familia ve `/jugador/calendario` con los eventos de su categoría.
      - DT valida progreso masivo en `/dt/progreso`; esa semana ya no la puede
        validar la familia (y viceversa); el historial indica quién validó.
      - Descargar plantilla CSV, llenar 3 filas (1 con error) en Excel,
        importar: 2 creados + 1 error con número de fila; duplicados omitidos;
        auditado.
      - Cambiar `UMBRAL_PLATA` global a 60 → evaluación con OVR 62 sale PLATA.
      - La escuela fija un override en `/escuela/metricas` y la siguiente
        evaluación de ESA escuela lo usa (otra escuela no).
      - Editor de avatar: 7 variantes + 3 paletas + "Ninguno" con preview; un
        avatar v1 guardado se ve razonable y al guardar queda v2.
- [x] Actualizar `PLAN-MEJORAS-VISUALES.md` (registro), `SEGURIDAD.md`
      (importar, plantilla, métricas escuela, validar DT) y `DECISIONES.md`
      (DiceBear v10, ParametroEscuela, PESO_MEN global). Commit + push.

## Registro de avance

| Fecha | Bloque | Estado |
|---|---|---|
| 2026-06-12 | Sprint M (M1–M10) | ✅ completado · 87 unit / 8 E2E verdes · build OK |
