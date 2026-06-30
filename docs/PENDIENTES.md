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

## Pendiente

_(Sin otros ítems registrados todavía. Agregá acá las próximas features.)_
