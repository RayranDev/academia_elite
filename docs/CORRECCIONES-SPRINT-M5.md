# Correcciones — Sprint M.5

Fecha: 2026-06-12 · ✅ typecheck + lint limpios · 97 unit · 8 E2E · build OK.

8 puntos: 4 de la tanda anterior (#1–#4) + 4 ajustes nuevos (A–D).

---

## #1 Jornada de medición desde el Súper Admin (por escuela) + plantilla completa

- Se extrajo `evaluarJugadorCore` de `crearEvaluacion` (mismo motor/params/bonus).
- `importacion-evaluaciones.service` resuelve el **alcance**: DT (sus categorías)
  o **SA/Escuela** (toda la escuela). Para SA/Escuela cada evaluación se imputa al
  **DT de la categoría** del jugador (`entrenadorDeCategoria`); si la categoría no
  tiene DT, esa fila reporta el error.
- La **plantilla trae TODOS los jugadores inscritos** (ACTIVOS) del alcance, con
  su código, nombre y categoría.
- Diálogo "Jornada de medición" también en **`/admin/escuelas/[id]`** (con
  `?escuelaId=`); el route `/api/plantilla-evaluaciones` acepta `escuelaId`.

## #2 Zoom de la foto en la carta

- `PlayerCard` mete la foto en una **caja con la misma proporción que el
  recortador (3:4)**; con `object-cover` sobre una imagen 3:4 se ve **exactamente
  lo recortado**, sin el zoom de más. Lo que recortas = lo que se ve.

## #3 Descargar el total de jugadores (DT, Escuela, SA)

- `export-jugadores.service` → `.xlsx` con apellido, nombre, categoría, posición,
  dorsal, estado, **código**, familia y email; alcance por rol (DT sus
  categorías; Escuela su tenant; SA por escuela).
- Route `GET /api/jugadores-export` + botón **"Descargar jugadores"** en `/dt`,
  `/escuela/jugadores` y `/admin/escuelas/[id]`.
- Celdas de datos de usuario protegidas contra **inyección de fórmulas**
  (`protegerCelda`).

## #4 Documento de Habeas Data (Colombia)

- **`HABEAS-DATA.md`**: política de tratamiento conforme a **Ley 1581/2012** y
  **Decreto 1377/2013**, con énfasis en **datos de menores** y **fotografías**
  (autorización del representante legal, consentimiento granular y revocable,
  protección reforzada), derechos del Titular, tiempos de consulta/reclamo,
  medidas de seguridad, encargados/transferencias y un **checklist de
  cumplimiento**. ⚠️ Requiere revisión de un abogado y completar los datos del
  Responsable.

## A. Validación de límites del código de invitación

- `codigoSchema`: `usosMaximos` **1–100** y `diasValidez` **1–365** con mensajes
  claros; el diálogo añade `max` y `required` a los inputs.

## B. Anti inyección de scripts (XSS) en todos los campos

- **Nuevo** `lib/validators/sanitizar.ts` (`textoSeguro`, `tieneContenidoPeligroso`):
  rechaza en la frontera (Zod) etiquetas HTML, `javascript:` y manejadores de
  eventos. Aplicado a lead, jugador y registro. React ya escapa al renderizar;
  esto es **defensa en profundidad**.
- En exportaciones, `protegerCelda` evita **CSV/Excel formula injection**.

## C. Modo claro legible y profesional

- Tokens de tema claro ajustados: texto casi negro (`#0b1220`), secundario
  `slate-600` (~7:1 de contraste), bordes más definidos, alerta/info más oscuros,
  y **texto secundario con peso medio** en claro.

## D. Formulario "Deja tus datos" (leads)

- **Teléfono OBLIGATORIO**: indicativo de país en **lista desplegable** (con
  bandera) + número en casilla aparte **validada solo dígitos** (6–15).
- **Popups** (modal) de **éxito** (frase de marca: «¡Bienvenido a Academia Elite!
  Donde nacen las estrellas… muy pronto te contactaremos») y de **error**
  (explica qué corregir).
- **Rate limit menos agresivo**: de 3/h a **8/h** por IP. La defensa real
  anti-bot sigue siendo el honeypot + tiempo mínimo, así no perdemos prospectos
  legítimos.

---

## Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 97 unit (nuevo: `sanitizar`) |
| `npm run build` | ✅ |
| `npm run test:e2e` | ✅ 8/8 |

Sin dependencias ni migraciones nuevas.
