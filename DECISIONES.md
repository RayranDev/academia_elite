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

## Sprint M (mejoras post-G)

19. **Umbrales de nivel editables (M8).** Bronce/Plata/Oro/Heroe pasan a claves
    UMBRAL_PLATA/ORO/HEROE en ParametroFormula (default 65/75/85). El motor sigue
    puro: nivelPorOvr(ovr, umbrales?) y umbralesDesdeParametros (con saneo
    Plata<Oro<Heroe; si no, cae al defecto). actualizarParametroGlobal pasa a
    upsert con whitelist para que BDs sin re-seed puedan editar claves nuevas.
20. **Metricas por escuela (M9).** Nueva tabla ParametroEscuela (override por
    clave). Solo RANGO_* y UMBRAL_* son overrideables; PESO_MEN_EN_OVR queda
    GLOBAL para que el OVR sea comparable entre escuelas. Helper puro
    lib/parametros (mezclarParametros/resolverParametros). evaluacion.service usa
    los valores efectivos (global + override) de la escuela del DT. El simulador
    del Super Admin se queda global (sin selector de escuela).
21. **Carga masiva por CSV (M7).** Parser propio lib/csv (sin dependencia nueva;
    se abre en Excel, delimitador ',' o ';', BOM UTF-8). Plantilla descargable
    por escuela con sus categorias. Importa SOLO jugadores (las familias se
    vinculan luego con codigo). Duplicados omitidos; reporte de errores por fila.
22. **Avatar DiceBear v10 toon-head (M10).** Migrado de v9 adventurer a v10
    (@dicebear/core + @dicebear/styles, new Style/new Avatar, sync toDataUri en
    proceso). Config v2 por indices (rearHair/beard con -1=ninguno); las listas
    de opciones se DERIVAN de la definicion del estilo (unica fuente de verdad).
    Migracion v1->v2 lazy (mapV1aV2, sin tocar BD; el editor guarda v2). El
    editor expone todas las opciones del estilo.
23. **Props server->client serializables (M5).** MonthGrid recibe `eventoBase`
    (string) en vez de una funcion `eventoHref`: no se pueden pasar funciones de
    un Server Component a un Client Component.

## Sprint M.1 (correcciones y mejoras solicitadas)

24. **Límite de body de Server Actions (error 1 MB).** Lo lanza Next ANTES de la
    acción. Se sube experimental.serverActions.bodySizeLimit a 6mb (cubre la
    importación .xlsx y la subida de foto antes de recortar).
25. **Importación migrada a Excel (.xlsx) con exceljs.** Reemplaza al CSV
    (lib/csv eliminado). lib/xlsx parsea a matriz y genera la plantilla;
    importacion.service valida que la fila 1 tenga EXACTAMENTE las cabeceras y
    reporta por fila los campos obligatorios faltantes sin detener el resto.
    exceljs sobre el paquete npm xlsx por mantenimiento/seguridad.
26. **Foto: compresión + recorte en cliente (react-easy-crop + canvas).** La
    imagen se redimensiona y se recorta a 3:4 (proporción de la carta) en el
    navegador antes de subir; el servidor la reprocesa igual (strip EXIF +
    webp) como defensa en profundidad. Evita cargar imágenes enormes.
27. **Atributos de la carta en 6 columnas.** Grid de 6: las 6 etiquetas
    (RIT/TIR/PAS/REG/DEF/FIS, en español) en la fila 1 y los valores debajo por
    el wrap natural del grid.
28. **Fondos de carta por méritos (configurable).** FondoCarta (catálogo) +
    FondoDesbloqueado (por jugador) + Jugador.fondoEquipadoId. El requisito es
    por fondo: SIEMPRE / LOGRO / NIVEL_CARTA / NIVEL_PERSONAL (lib/fondos, puro).
    Galería /jugador/fondos: desbloqueados a color con Equipar, bloqueados en
    gris con candado y el mérito que falta. El fondo equipado se pinta detrás
    del jugador en la carta.

## Sprint M.2 (encuadre, reactividad, fondos, registro padre, descarga)

29. **Encuadre de foto.** La carta usa object-cover + object-top y una máscara
    centrada más arriba para no recortar la cabeza; el recorte 3:4 (M.1) ya
    centra el rostro. El contenedor del retrato es transparente (el color lo pone
    el material de la carta, no la foto).
30. **Reactividad de la foto (cache-buster).** La URL pública de la foto lleva
    `?v=<archivo>` (el nombre UUID cambia en cada subida) para forzar al navegador
    a recargar al instante; el editor además usa una versión local tras subir.
31. **Material por nivel con Héroe especial.** El marco se asigna por OVR, pero el
    morado de Héroe NO se aplica solo por OVR: la carta cae a Oro salvo que el
    jugador tenga equipado el fondo especial "LEYENDA" (desbloqueado por méritos,
    M.1). `PlayerCardData.heroeEquipado` controla el marco.
32. **Registro/vinculación del padre (aditivo).** Cada jugador tiene
    `codigoJugador` (único, generado al crearse). Nueva página pública `/registro`:
    el padre se VINCULA a un hijo existente (código de escuela = slug + código de
    jugador) o registra a un hijo NUEVO con código de invitación. La vinculación
    es transaccional: si falla (jugador inexistente, ya tiene padre o email
    duplicado) NO queda ninguna cuenta a medias (no hay borrado lógico que
    limpiar) y se muestra el aviso. DT/Escuela/SA ven el `codigoJugador` en la
    gestión para entregárselo a la familia.
33. **Descarga de carta con marca de agua (html-to-image).** Botón en el hub que
    exporta la carta a PNG; inyecta "Academia Elite — Donde nacen las estrellas ·
    academia-elite.app" solo en el archivo (no en la web). Se eligió html-to-image
    por su mejor compatibilidad con Tailwind v4 (oklch) y gradientes.
34. **Simulador del SA con apariencia.** El simulador prueba fondos (catálogo),
    avatar aleatorio y foto (con recorte), todo como previsualización sin guardar.

## Sprint M.3 (transparencia real, carta unificada, tema en landing)

35. **Transparencia de la foto (causa raíz).** El negro NO venía de la carta
    (que ya es transparente) sino del pre-recorte en cliente: el canvas se
    exportaba a JPEG, que no tiene alfa y rellena de negro. Se cambió a WebP
    (lib/foto/cliente). El servidor ya conservaba alfa (sharp → webp). Además el
    contenedor del retrato es bg-transparent explícito y el recortador muestra
    tablero de transparencia.
36. **Carta del dashboard = carta de la landing.** Ambas usan el MISMO componente
    PlayerCard con size="hero" interactive y el mismo wrapper
    (flex justify-center perspective-[1000px]); se alineó HubHero para que se
    vean idénticas.
37. **Tema claro/oscuro en la landing.** Se reutiliza el ThemeToggle existente
    (clase `light` en <html> + localStorage `fcm-tema` + anti-FOUC del layout
    raíz) en una nueva LandingHeader, en vez de introducir un sistema paralelo de
    clases `dark:`. La landing ya usa tokens, así que adapta sin más.

## Sprint M.4 (jornada de medición, fondos de carta completos, contraste, marca de agua)

38. **Carga masiva de evaluaciones (jornada de medición).** Servicio
    importacion-evaluaciones (DT scope) que reutiliza crearEvaluacion por fila:
    evalúa EXISTENTES (por codigoJugador) y crea+evalúa NUEVOS. Plantilla .xlsx
    con los jugadores y categorías del DT. Auditado (IMPORTAR_EVALUACIONES).
    Botón "Jornada de medición" en /dt.
39. **El fondo es el estilo de TODA la carta.** Antes el fondo equipado solo
    pintaba detrás del jugador; ahora reemplaza el material de toda la carta
    (Cobre/Dorada/Plata lux/Esmeralda/Rubí/Leyenda…). PlayerCardData.fondoEstilo
    pasa a ser el fondo de la carta; el retrato queda transparente encima.
40. **Color de texto por contraste.** FondoCarta.colorTexto define el color de la
    tipografía sobre cada fondo (claro u oscuro) para que siempre sea legible;
    PlayerCardData.fondoTexto lo transporta. Los materiales por nivel ya traían su
    color.
41. **Marca de agua en la descarga (fix).** Se montaba con opacity 0→100 +
    transition, así que html-to-image la capturaba casi transparente. Ahora se
    MONTA solo durante la exportación (opaca, sin transición).
