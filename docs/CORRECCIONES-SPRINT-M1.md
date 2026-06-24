# Correcciones y mejoras — Sprint M.1

Fecha: 2026-06-12 · Estado: ✅ completado · typecheck + lint limpios · 88 unit ·
8 E2E · build de producción OK.

Resumen de las 5 mejoras solicitadas + el error de `Body exceeded 1 MB limit`.
Todo respeta la arquitectura por capas (`app|components → actions → services →
repositories → prisma`), seguridad (rol + tenant + Zod + auditoría) y
componetización.

---

## 0. Error `Body exceeded 1 MB limit` (bloqueante)

**Causa:** las Server Actions de Next tienen un límite de body de **1 MB** que se
lanza **antes** de ejecutar la acción. La importación (y la subida de foto de
hasta 5 MB) lo superaban, así que ni siquiera llegaba a mi validación interna.

**Solución:** `next.config.ts` →
`experimental.serverActions.bodySizeLimit = "6mb"`.

- `next.config.ts`

---

## 1. Optimización, compresión y recorte de imagen (frontend)

Flujo en el cliente **antes** de subir: comprimir → recortar 3:4 → subir
optimizado. El servidor sigue reprocesando la imagen (magic bytes, strip EXIF,
WebP) como defensa en profundidad.

- **Nuevo** `src/lib/foto/cliente.ts` — `prepararParaRecorte()` (redimensiona a
  ≤1600 px y devuelve dataURL) y `recortarABlob()` (recorta el área a WebP
  ≤800 px). Usan `canvas`/`Image` del navegador.
- **Nuevo** `src/components/jugador/FotoCropper.tsx` — modal con **react-easy-crop**
  (arrastrar + zoom), proporción fija **3:4** (la de la carta) para centrar el
  rostro sin cortar la cabeza.
- **Reescrito** `src/components/jugador/FotoConsentimiento.tsx` — "Elegir foto…"
  → comprime → abre el recortador → al confirmar sube el `Blob` WebP por la
  acción existente.
- **Dependencia nueva:** `react-easy-crop`.

## 2. Limpieza de estado del modal de importación

El modal arrastraba errores/archivo de importaciones anteriores. Ahora el estado
está atado al ciclo de vida del modal y se **reinicia siempre** al cerrar (botón,
clic fuera o Escape).

- **Reescrito** `src/components/gestion/ImportarJugadoresDialog.tsx` — pasa a
  `useState`/`useTransition`; `resetEstado()` limpia errores, mensajes y el
  `input file` (vía `ref`) tanto al abrir como en `onClose` (el `Modal` ya cierra
  con clic-fuera/Escape).

## 3. Importación masiva en Excel (.xlsx)

Migrada de CSV a Excel tradicional con **exceljs** (mantenido y sin las
advertencias de seguridad del paquete `xlsx` de npm).

- **Nuevo** `src/lib/xlsx.ts` — `parseXlsx(buffer)` lee la 1ª hoja como matriz
  (fechas → `AAAA-MM-DD`, ignora filas vacías) y `plantillaJugadoresXlsx()`
  genera la plantilla (cabeceras en negrita + ejemplo + hoja "Instrucciones" con
  las categorías válidas).
- **Reescrito** `src/services/importacion.service.ts` — valida que la **fila 1**
  tenga **exactamente** las cabeceras requeridas; luego procesa fila por fila:
  si falta un dato obligatorio guarda el error con **nº de fila y campo** sin
  detener el resto; ignora filas vacías; mapea la categoría por nombre; omite
  duplicados; crea los válidos (ACTIVO). Auditado.
- **Actualizado** route `GET /api/plantilla-jugadores` (devuelve `.xlsx`) y
  `importarJugadoresAction` (recibe el `Buffer`, máx 5 MB).
- **Eliminado** `src/lib/csv.ts` (+ su test); plantilla y subida ahora `.xlsx`.
- **Dependencia nueva:** `exceljs`.

## 4. Cuadrícula de atributos en horizontal (6 columnas)

- **Editado** `src/components/cards/PlayerCard.tsx` — el bloque de stats pasa a
  `grid-cols-6`: primero las **6 etiquetas** (RIT/TIR/PAS/REG/DEF/FIS — se
  mantienen en español por consistencia con el resto de la app y los E2E) y
  luego los **6 valores**, que el wrap natural del grid alinea justo debajo.

## 5. Fondos de carta por méritos (desbloqueo configurable)

Sistema gamificado con requisito **configurable por fondo**.

- **Schema** (+migración `fondos_carta`):
  - `FondoCarta` — catálogo (`codigo`, `nombre`, `descripcion`, `estilo` CSS,
    `requisitoTipo`, `requisitoValor`, `orden`).
  - `FondoDesbloqueado` — `@@unique([jugadorId, fondoId])` (historial de
    desbloqueos).
  - `Jugador.fondoEquipadoId` → relación `FondoEquipado`.
- **Nuevo** `src/lib/fondos.ts` (puro, testeado) — `fondoDesbloqueado()` evalúa
  el requisito: `SIEMPRE` · `LOGRO` (código) · `NIVEL_CARTA` (Bronce/Plata/Oro/
  Héroe) · `NIVEL_PERSONAL` (nivel mínimo); `requisitoTexto()` para la UI.
- **Nuevo** `src/repositories/fondo.repository.ts` y
  `src/services/fondo.service.ts` — `listarFondosJugador()` (calcula méritos:
  logros + nivel de carta + nivel personal, persiste desbloqueos nuevos) y
  `equiparFondo()` (verifica desbloqueo; solo el responsable).
- **UI** `src/app/jugador/fondos/page.tsx` + `FondosGaleria.tsx` — galería:
  desbloqueados **a color** con "Equipar"; bloqueados **en gris + candado** con
  el mérito que falta. Nav del jugador: "Fondos".
- **Carta** — `PlayerCardData.fondoEstilo`; `PlayerCard` pinta el fondo equipado
  **detrás del jugador** (con la misma máscara del retrato). El hub
  (`player.service`) lo rellena desde el fondo equipado.
- **Seed** — 6 fondos de ejemplo cubriendo los 4 tipos de requisito.

---

## Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 88 unit (nuevos: `xlsx`, `fondos`) |
| `npm run build` | ✅ (incluye `/jugador/fondos`) |
| `npm run test:e2e` | ✅ 8/8 |

### Notas
- Dependencias añadidas: `exceljs`, `react-easy-crop`. Eliminado el uso de CSV.
- Migraciones nuevas: `fondos_carta`.
- Tras `git pull`: `npm install` y `npx prisma migrate deploy` (o `db:seed` en
  desarrollo para cargar el catálogo de fondos).
