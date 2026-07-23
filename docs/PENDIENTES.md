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
- ⬜ **Auditoría: filtros + paginación.** La vista de auditoría debería tener
  pestañas/filtros por tipo de entidad, acción y actor, más paginación. Hoy hay
  pocos eventos, pero el log crece sin techo. Tocar `src/app/admin/auditoria`,
  `listarAuditoria` (agregar filtros + `skip/take`) y `listarAuditGlobal`.

### DT — Modo PARTIDO
- ⬜ **La lista no muestra los jugadores + selección/duplicación rara.** Al tocar
  un jugador se selecciona ese y otro; sospecha de duplicación. Hipótesis a
  verificar (necesita reproducción): (a) partido creado SIN convocados → la
  lista sale vacía [gap de diseño: caer a toda la categoría como en
  entrenamiento]; (b) colisión de `key` si `filas` trae un `jugadorId` repetido.
  Revisar `ModoSesion`/`ListaViva` y `obtenerSesionDt` (rama PARTIDO).
- ⬜ **El partido debería empezar 0-0.** No reproducido en código (un partido
  nuevo calcula 0-0 desde `resultadoLocal/Visitante = null`). Puede ser dato
  residual de pruebas; confirmar con un partido recién creado.
- ⬜ **Quitar tarjeta sin esperar al cierre.** Hoy en vivo solo se AGREGA
  amarilla/roja; para corregir un toque errado hay que esperar al cierre.
  Agregar “quitar tarjeta” en la hoja del jugador de `PartidoVivo`
  (`marcarTarjeta` solo setea → falta la baja). Reglas: **2 amarillas = roja**
  (automatizar), y contemplar **tarjeta azul** (no existe en el schema:
  `EstadisticaPartido` + UI).
- ⬜ **Estructura del partido: 2 tiempos, penales, alargue.** El cronómetro no
  tiene períodos (el plan lo dejó para v2). Agregar fin de tiempo, alargue y
  definición por penales.

### TODOS
- ✅ **Iconos del calendario centrados y más grandes.** En `MonthGrid` estaban
  chicos (`h-3.5`) y pegados abajo (`mt-auto`). Ahora centrados y `h-5 w-5`.

### JUGADOR
- ⬜ **Confirmar convocatoria no refresca.** Al confirmar sale “asistencia
  confirmada” pero el botón/estado sigue ahí. Falta revalidar/actualizar la UI
  tras `confirmarConvocatoriaAction`.
- ⬜ **Notificaciones no se refrescan al leerlas.** Se marcan leídas pero siguen
  en la lista; al volver a entrar no llega la nueva pero se ven las viejas
  acumuladas. Riesgo de saturación. Revisar `NotificacionesMenu` +
  `marcarNotificacionLeida` (revalidar y/o depurar leídas viejas).
- ⬜ **Color de stats no coincide con el fondo configurado.** En el hub del
  jugador, el color de los stats de la carta no respeta el `colorTexto` del
  fondo equipado. No reproducido en código (todo hereda `textoCarta` en
  `PlayerCard`); verificar que el fondo equipado guarde/cargue `colorTexto` y
  que el hub lo pase. Revisar `obtenerHub` + `PlayerCard` (bloque de stats).

---

## Pendiente

_(Agregá acá las próximas features.)_
