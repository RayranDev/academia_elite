# Correcciones — Sprint M.4 (jornada de medición, fondos completos, contraste, marca de agua)

Fecha: 2026-06-12 · ✅ typecheck + lint limpios · 91 unit · 8 E2E · build OK.

---

## 1. Jornada de medición — carga masiva de evaluaciones

Cómo empezar: igual que la carga de jugadores, pero subiendo **medidas**. Una
fila por jugador; sirve para **evaluar existentes** y **evaluar nuevos** (se
crean en el acto). Reutiliza `crearEvaluacion` (mismo motor, parámetros de la
escuela, bonus y transacción): la carta "nace" idéntica al alta manual.

- **Nuevo** `src/services/importacion-evaluaciones.service.ts`:
  - `generarPlantillaEvaluaciones(ctx)` — .xlsx con cabeceras + hoja de ayuda con
    **tus jugadores (código — nombre)** y **categorías**.
  - `importarEvaluaciones(ctx, buffer)` — por fila: si hay `codigoJugador` evalúa
    al existente (de tus categorías y ACTIVO); si no, valida y **crea** el jugador
    (ACTIVO) y lo evalúa. Errores por fila sin detener el resto. Auditado.
- **Plantilla** `lib/xlsx.ts` → `plantillaXlsx` genérico (cabeceras + ejemplo +
  instrucciones).
- **Columnas**: `codigoJugador, nombre, apellido, fechaNacimiento, posicion,
  categoria, sprint30m, saltoCm, agilidadSeg, yoyoNivel, control, pase, tiro,
  regate, actitud, concentracion, trabajoEquipo, resiliencia`.
- **Route** `GET /api/plantilla-evaluaciones` (DT). **Action**
  `importarEvaluacionesAction` (DT, .xlsx ≤5 MB, rate limit 5/h).
- **UI** `src/components/dt/ImportarEvaluacionesDialog.tsx` → botón **"Jornada de
  medición"** en `/dt`; muestra evaluados / nuevos / errores por fila.

> Quién: el **DT** (sobre sus categorías). Para evaluar a alguien de otra
> categoría, lo hace su DT. Los nuevos quedan ACTIVO con su carta recién nacida.

## 2. El fondo afecta a TODA la carta (no solo detrás de la foto)

Antes el fondo equipado solo pintaba detrás del jugador. Ahora **es el fondo/
estilo de toda la carta** (como las versiones Cobre, Dorada, etc.).

- `src/components/cards/PlayerCard.tsx` — `bgCarta = data.fondoEstilo ?? material.bg`
  se aplica al contenedor de material (toda la carta); se quitó el overlay que lo
  ponía solo tras la foto. El retrato sigue transparente encima.
- Catálogo (seed) revampeado a **skins de carta**: Clásico, Cobre, Esmeralda,
  Plata lux, **Dorada**, Rubí, Leyenda (morado de Héroe), cada uno con su
  requisito por méritos.

## 3. Color de letra adaptado al fondo (contraste)

- **Schema** (+migración `fondo_color_texto`): `FondoCarta.colorTexto`.
- `PlayerCardData.fondoTexto` + `PlayerCard` usan ese color para la tipografía
  (claro sobre fondos oscuros, oscuro sobre Dorada/Plata) → siempre legible. Los
  materiales por nivel ya traían su color.
- El simulador del SA y el hub propagan `fondoTexto` del fondo seleccionado/equipado.

## 4. Marca de agua en la descarga (fix)

- `src/components/jugador/HubHero.tsx` — la marca de agua se montaba con
  `opacity-0 → opacity-100` + `transition`, por lo que `html-to-image` la
  capturaba casi transparente. Ahora se **monta solo durante la exportación**
  (opaca, sin transición), así sale nítida en el PNG y sigue sin verse en la web.

---

## Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 91 unit |
| `npm run build` | ✅ |
| `npm run test:e2e` | ✅ 8/8 |

Migración nueva: `fondo_color_texto`. Sin dependencias nuevas. Tras `git pull`:
`npm install` + `npx prisma migrate deploy` (o `db:seed` en dev para el catálogo
de fondos revampeado).
