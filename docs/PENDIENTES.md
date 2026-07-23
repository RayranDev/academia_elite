# Pendientes — backlog de producto

> **Qué es este archivo.** El backlog de **features de producto** pendientes: qué
> falta construir a nivel funcionalidad. Es el primer lugar donde buscar "qué hay
> por hacer".
>
> Para lo de **infraestructura / migración a producción** (base de datos, auth,
> storage, hosting) ver **[HOJA-DE-RUTA.md](HOJA-DE-RUTA.md)**. Para el **historial**
> de lo ya hecho ver **[TRAZABILIDAD.md](TRAZABILIDAD.md)**.
>
> Convención: cada ítem lleva estado (`PENDIENTE` / `EN PROGRESO` / `BLOQUEADO`),
> una línea de qué y por qué, y enlaces a su plan o PRs si existen.
>
> Última actualización: 2026-06-30.

---

## En progreso

### Motor de efectos para el creador de fondos — `EN PROGRESO`

Hoy el creador de fondos obliga a escribir CSS a mano y los efectos visuales
(grano foil, brillo metálico) están atados al nivel de la carta, no se pueden
elegir por fondo. Se agrega un **motor de efectos** configurable: `METALICO`,
`HIELO`, `TRAMA`, `HOLOGRAFICO` (con tinte / patrón / intensidad), más un
catálogo de plantillas clickeables para no tipear CSS.

- **Entrega:** 2 PRs encadenados.
  - **PR 1 — datos + plumbing** (`feat/fondos-efectos-datos`): campos `efecto` +
    `efectoParams` en `FondoCarta`, DTOs/validadores/servicios, presets y seed.
    Sin cambio visual todavía.
  - **PR 2 — motor visual:** `src/lib/cartas/efectos.ts`, refactor de
    `PlayerCard`, UI del creador (selects + galería + preview), tests y
    `docs/GUIA-FONDOS.md`.
- **Archivos clave:** `src/lib/cartas/efectos.ts`, `src/lib/cartas/fondos-presets.ts`,
  `src/components/cards/PlayerCard.tsx`, `src/components/admin/FondosAdmin.tsx`.
- **Guía de uso (al cerrar PR 2):** `docs/GUIA-FONDOS.md`.

---

## Ronda de testing en Vercel (2026-07) — bugs y mejoras

> Reportados probando en `academia-elite.vercel.app`. ✅ = arreglado en esta
> ronda · ⬜ = pendiente. Los de partido salieron del Modo Sesión (PR-4).

### SUPER_ADMIN
- ✅ **Modal de fondos se desbordaba.** Al crear/editar un fondo, el modal
  excedía el viewport y no se podía navegar (había que bajar el zoom). Fix:
  `max-h-[90dvh] overflow-y-auto` en `src/components/ui/Modal.tsx` (aplica a
  todos los modales).
- ✅ **Auditoría: filtros + paginación.** La vista ahora filtra por entidad,
  acción y actor (form GET, sin JS) y pagina de a 50 con total y navegación. El
  repo suma `where` + `skip/take` + `count` + facetas (valores distintos para
  los selects). Falta (opcional): filtro por rango de fechas.

### DT — Modo PARTIDO
- ✅ **La lista no muestra los jugadores (partido sin convocatoria).** Era el gap
  (a): un partido creado sin convocados dejaba la lista vacía. Ahora cae a la
  categoría completa, como en un entrenamiento (`obtenerSesionDt`).
- ✅ **Selección/duplicación rara.** Era colisión de `key`: un jugador sumado en
  cancha reaparecía en `sesion.convocados` al revalidar y quedaba DOS veces
  (misma `key` + marcas compartidas por `jugadorId` → tocar uno movía dos).
  `ModoSesion` ahora dedup­a `filas` por `jugadorId`.
- ✅ **Quitar tarjeta sin esperar al cierre + 2 amarillas = roja.** Estado de
  tarjetas absoluto: se agrega Y se quita amarilla/roja en vivo desde la hoja del
  jugador de `PartidoVivo`; dos amarillas implican roja automáticamente
  (`fijarTarjetasJugador`).
- ⬜ **El partido debería empezar 0-0.** No reproducido en código (un partido
  nuevo calcula 0-0 desde `resultadoLocal/Visitante = null`). Probablemente dato
  residual de pruebas; confirmar con un partido recién creado.
- ⬜ **Tarjeta azul.** No existe en el schema. Requiere migración de
  `EstadisticaPartido` (campo `azules`/`azul`) + UI. Se difiere a un PR propio
  (cambio de schema sobre datos de menores; no se mete de apuro).
- ⬜ **Estructura del partido: 2 tiempos, penales, alargue.** El cronómetro no
  tiene períodos (el plan lo dejó para v2). Agregar fin de tiempo, alargue y
  definición por penales. Feature grande, PR dedicado.

### TODOS
- ✅ **Iconos del calendario centrados y más grandes.** En `MonthGrid` estaban
  chicos (`h-3.5`) y pegados abajo (`mt-auto`). Ahora centrados y `h-5 w-5`.

### JUGADOR
- ✅ **Notificaciones no se refrescan al leerlas.** La lista se copiaba a
  `useState` (se sembraba solo al montar): ni llegaban las nuevas ni el marcado
  se reflejaba. Ahora la fuente de verdad es el prop del server, con overlay
  local solo para el tilde instantáneo, y las actions revalidan el layout.
- ⬜ **Confirmar convocatoria — el estado ya refresca.** `confirmarConvocatoriaAction`
  ya revalida `/jugador`, `/jugador/calendario` y el detalle, y la tarjeta pasa a
  “Asistencia confirmada”. Lo que quedaba “ahí” era la **notificación** sin
  depurar (resuelto arriba). Reabrir solo si aparece una superficie puntual que
  no refresque.
- ⬜ **Color de stats no coincide con el fondo configurado.** Investigado: el
  color SÍ fluye a los stats — `obtenerHub` setea `card.fondoTexto` desde
  `fondo.colorTexto` y en `PlayerCard` TODO el texto (OVR, nombre, stats) hereda
  `textoCarta`. Sin bug reproducible en código. Hipótesis: (a) el fondo equipado
  tiene `colorTexto = null` (fondo previo al campo) y cae al color del nivel; o
  (b) se compara con otro listado de stats del dashboard que usa tokens del
  tema, no el color de la carta. Necesita el fondo/pantallazo puntual.

---

## Pendiente

_(Agregá acá las próximas features.)_
