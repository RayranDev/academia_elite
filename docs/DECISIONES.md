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
   con `@prisma/adapter-pg` (`src/lib/db.ts`) contra **Supabase PostgreSQL**.
   Runtime por el pooler (transaction mode, `?pgbouncer=true`); la CLI de
   migraciones usa `DIRECT_URL` (conexión directa). *La arquitectura por capas
   permitió cambiar de SQLite a Postgres sin tocar servicios ni dominio.*
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
   Las pruebas corren contra un **schema `e2e` aislado** en el mismo proyecto
   Supabase (recreado con `DROP SCHEMA` + migrate + seed en `globalSetup`, nunca
   contra los datos reales) y en serie (`workers: 1`). *Actualizado en Sprint 8:
   antes de la migración a Postgres corrían contra `dev.db` (SQLite).*

14. **CSP**: `script-src` incluye `'unsafe-inline'` (Next inyecta scripts inline)
   pero **nunca** `'unsafe-eval'` en producción (solo en dev para el HMR).
   `style-src 'unsafe-inline'` por Tailwind v4.

## Sprint 8 — Migración a producción

(Detalle completo del qué en `TRAZABILIDAD.md` hito 11; acá solo el porqué de
cada adaptación, regla 0.8.)

13b. **Fotos en disco → Supabase Storage (bucket privado).** El disco local es
   efímero en serverless (Vercel no persiste el filesystem entre invocaciones).
   Se mantuvo la misma firma pública en `src/lib/foto/storage.ts` (el resto del
   código no supo del cambio) y las fotos se siguen sirviendo SOLO por
   `/api/archivos/*` con auth — nunca por URL pública ni firmada, ni aunque el
   bucket lo permitiera: son datos de menores.

13c. **Rate limit en memoria → Upstash Redis.** Un `Map` en memoria de proceso
   no sirve en serverless: cada invocación de función puede ser una instancia
   nueva, así que el límite se reseteaba solo. Upstash (ventana deslizante) es
   compartido entre invocaciones; se mantiene el fallback en memoria cuando no
   hay credenciales de Upstash (dev local y E2E no dependen de un servicio
   externo).

13d. **RLS habilitado en Supabase como segunda capa.** El filtrado por
   `escuelaId` en cada repositorio (Barrera 2, servicios) sigue siendo el
   control de acceso real; RLS es defensa en profundidad a nivel de motor de
   base de datos por si algún query futuro se olvidara del filtro — no
   reemplaza los guards de `src/lib/auth/guards.ts`.

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

## Sprint M.5 (jornada SA, export, validaciones, modo claro, habeas data)

42. **Jornada de medición desde SA/Escuela.** Se extrajo `evaluarJugadorCore` de
    crearEvaluacion; el bulk importer resuelve el alcance (DT: sus categorías;
    SA/Escuela: toda la escuela) e imputa cada evaluación al DT de la categoría
    (entrenadorDeCategoria). Plantilla con TODOS los jugadores inscritos (ACTIVOS)
    del alcance. Diálogo montado también en /admin/escuelas/[id].
43. **Export de jugadores (DT/Escuela/SA).** export-jugadores.service genera .xlsx
    con el total de jugadores del alcance; route /api/jugadores-export; botón
    "Descargar jugadores" en /dt, /escuela/jugadores y /admin/escuelas/[id].
44. **Anti inyección de scripts.** Helper lib/validators/sanitizar (textoSeguro /
    tieneContenidoPeligroso) aplicado a campos de texto (lead, jugador, registro).
    React ya escapa al render; esto es defensa en frontera. En exportaciones,
    protegerCelda evita inyección de fórmulas (CSV/Excel injection).
45. **Validación de límites del código.** usosMaximos 1–100 y diasValidez 1–365
    con mensajes claros y max en los inputs.
46. **Modo claro legible.** Tokens de claro con texto casi negro, muted slate-600
    (~7:1), bordes más definidos y texto secundario en peso medio.
47. **Formulario de contacto (leads).** Teléfono OBLIGATORIO con indicativo
    (lista de países) + número (solo dígitos). Popups de éxito (con frase de marca
    y "pronto te contactaremos") y de error (qué corregir). Rate limit de leads
    pasa de 3/h a 8/h (la defensa real es honeypot + tiempo) para no perder
    clientes legítimos.
48. **Habeas Data (Colombia).** HABEAS-DATA.md: política de tratamiento conforme a
    Ley 1581/2012 y Decreto 1377/2013, con foco en datos de menores y fotos, +
    checklist de cumplimiento. Requiere revisión legal y completar datos del
    Responsable.

## Giro a ERP — cobranza (2026-07-31)

49. **El producto se posiciona como ERP de escuelas de fútbol.** La carta
    gamificada pasa a ser el diferencial, no el centro: es el anzuelo de la
    familia, mientras que la administración es lo que el dueño de la escuela
    compra. Consecuencia directa: **"pagos/facturación" deja de estar fuera de
    alcance** (estaba así en `PENDIENTES.md`) y la cobranza pasa al frente de la
    fila. Mercado objetivo: **Colombia** — coherente con la Ley 1581 ya citada en
    el schema, con `parentescoAcudiente` y con el UTC-5 de `FechaLocal`.
50. **El dinero se guarda en `Decimal`, nunca en `Float`.** En punto flotante
    `0.1 + 0.2 !== 0.3`; una cobranza que arrastra ese error termina en
    diferencias de centavos que nadie puede explicar. `Membresia.monto` y
    `Arancel.monto` son `Decimal(12,2)`. El `Decimal` de Prisma **no sale hacia
    la UI**: se convierte a `number` en el mapper del servicio (DTOs planos). La
    conversión decide la ausencia sobre el valor original y no sobre el
    convertido, porque un monto de 0 (beca total) es legítimo y `0` es falsy.
51. **Un pago se registra, no se marca.** `estado = PAGADA` sin cuándo, cómo ni
    comprobante no es auditable ni sirve para conciliar contra el banco. Marcar
    pagada exige un paso extra (`pagadaEn`, `medioPago`, `referenciaPago`); al
    salir de PAGADA esos campos se limpian para no dejar un comprobante colgado
    de una cuota que ya no está paga.
52. **El unique de `Membresia` incluye el concepto.** Una escuela cobra
    mensualidad, matrícula, indumentaria, torneos y transporte. Sin el concepto en
    la clave, agregar el campo habría sido decorativo.
53. **La lista de precios guarda historial, no un valor único.** `Arancel` NO
    lleva unique por (categoría, concepto): varias filas con distinto
    `vigenteDesde` son la historia de precios de la escuela. `resolverArancel`
    (puro, en `src/lib/aranceles.ts`) elige el precio de la categoría sobre el
    general y, dentro del mismo alcance, el más reciente **ya vigente** — así un
    aumento se puede dejar programado con fecha futura sin que se aplique antes.
54. **La generación masiva usa `createMany({ skipDuplicates })`, no un upsert.**
    Un upsert pisaría el monto y el estado de una cuota ya cobrada. Delegar el
    filtrado al unique de la base hace la operación idempotente por construcción y
    elimina la ventana de carrera entre "consultar qué falta" y "crear". Los
    jugadores sin precio vigente reciben la cuota **sin monto** y se informan
    aparte: preferible a inventar un número o a dejarlos fuera de la cobranza.
55. **El estado de cuenta se DERIVA de las cuotas; no hay `vigenciaHasta`
    manual.** Se evaluó agregar `Jugador.vigenciaHasta` cargado a mano y se
    descartó: creaba una segunda fuente de verdad que después habría que
    reconciliar con `Membresia`, y mudaba la carga de datos del DT al
    administrador en vez de eliminarla. En un ERP la situación del jugador se
    calcula desde su situación administrativa.
56. **El countdown 3-2-1 al iniciar sesión queda cortado.** El problema declarado
    era "el Modo Sesión se siente como carga de datos"; una animación lo decora en
    vez de resolverlo, suma tres segundos a cada arranque con el grupo esperando, y
    abre un modo de falla real: si el DT navega o cierra durante la cuenta,
    `sesionIniciadaAt` nunca se fija y la sesión queda sin arrancar.
57. **Los puntos de sesión que mueven la carta quedan bloqueados hasta resolver la
    tesis.** `ESTADO-DEL-PROYECTO.md` §0 afirma que "las cartas solo cambian
    cuando hay una evaluación nueva" y que "el progreso se gana midiéndose".
    Dejar que el DT ajuste la carta con taps contradice eso. Puede ser la decisión
    correcta, pero tiene que decidirse acá y de frente — no colarse como efecto
    lateral de un track de UX. Sin esa entrada, no se construye.

## Evaluación del portero (2026-07-31)

58. **El portero tiene su propia derivación, no solo su propia fila de pesos.**
    Hasta ahora lo único específico de un arquero en todo el código era una fila
    en `PESOS_POSICION`. Las cuatro notas técnicas seguían siendo `controlBalon`,
    `pase`, `tiro` y `regate` — habilidades de jugador de campo —, y su **DEF**,
    el stat de mayor peso para él (0.35), salía de
    `resistencia Yo-Yo × 0.45 + salto × 0.30 + control × 0.25`. La capacidad de
    atajar de un arquero no tiene casi nada que ver con cuánto aguanta un Yo-Yo.
    **Ponderar distinto una medida equivocada no la arregla.**
59. **Se reetiquetan las notas, no se cambia el schema.** Las mismas cuatro
    columnas de `Evaluacion` significan otra cosa cuando el jugador es POR:
    control→**blocaje/atajada**, pase→**distribución/saque**, tiro→**juego
    aéreo**, regate→**achique y 1v1** (`src/lib/medidas-tecnicas.ts`). La nota
    sigue siendo un 1–10 que pone el DT; lo que cambia es **qué se le pide
    puntuar**. Se eligió sobre agregar columnas nuevas porque da el 80% del valor
    sin migración, sin formulario condicional y sin tocar el importador. Si algún
    día el arquero necesita medidas propias de verdad, ese archivo ya deja escrito
    qué significa cada una.
60. **`derivaStatsPortero` es una función aparte y cada fila suma 1.0**, igual que
    la de campo. El DEF pasa a ser `blocaje × 0.50 + agilidad × 0.25 + aéreo × 0.25`
    y el RIT prioriza la agilidad sobre la velocidad pura (el achique es reacción,
    no carrera larga). El FIS se mide igual en ambas: el físico es físico.
61. **Los coeficientes de derivación son DATO compartido, no código duplicado.**
    `plantilla-simulador.service.ts` replica el motor con fórmulas nativas de
    Excel. Estaban escritas dos veces —una en la función, otra como string—, así
    que cambiar una dejaba a la otra mintiendo en silencio; y una planilla que
    miente es peor que ninguna, porque el número se cree. Ahora los pesos viven
    en `COEF_CAMPO` / `COEF_PORTERO` (`weights.ts`) y **ambos leen de ahí**: la
    planilla arma la fórmula desde los mismos coeficientes, con `COLUMNA_MEDIDA`
    como único puente hacia las celdas. La divergencia deja de ser posible por
    construcción, en vez de depender de que alguien se acuerde.
    La planilla omite el `IF($B="POR", …)` cuando ambas derivaciones coinciden
    (hoy solo `FIS`); un test fija esa condición para que la optimización no se
    vuelva incorrecta en silencio.
    Se replicó además la guarda `span || 1` de `normalizaFisica`: con `min == max`
    la app devolvía un número y el Excel daba `#DIV/0!`.
62. **Los CUATRO consumidores del motor dicen lo mismo.** El reetiquetado no sirve
    de nada si solo lo aplica el formulario: quedaría un lugar pidiendo "regate"
    mientras el motor lee "achique". Están alineados el formulario del DT, el
    simulador del SUPER_ADMIN, la planilla Excel del simulador y **la plantilla de
    la jornada de medición** (`importacion-evaluaciones.service.ts`), que es el
    camino realista para evaluar una escuela entera y fue el que más costó ver.
63. **Las cartas de arquero ya emitidas NO se recalculan.** Las evaluaciones son
    inmutables por diseño: los 8 arqueros con carta al momento del cambio
    conservan sus números viejos hasta que el DT los vuelva a evaluar. No se hace
    una migración de datos — reescribir una medición histórica sería mentir sobre
    lo que se midió ese día.

## El DT ve QUE hay mora, nunca CUÁNTO (2026-08-01)

64. **Frontera de acceso deliberadamente acotada.** Se agregó un badge de deuda
    por jugador en `escuela/jugadores` (`ESCUELA_ADMIN`) y, al construirlo, se
    encontró que **ningún** servicio de cobranza es accesible para el DT — ni
    siquiera el SUPER_ADMIN con sesión de soporte activa puede verla
    (`membresia.service.ts` es `ESCUELA_ADMIN`-only en las seis funciones que
    expone). Extender el badge a la ficha del DT sin decidirlo habría cruzado
    esa frontera en silencio.
    Decisión del usuario: el DT **sí** ve que una familia tiene pagos
    pendientes (contexto social — puede explicar por qué no llegó el
    uniforme, por ejemplo), pero **nunca el monto ni el detalle**. La cifra
    sigue siendo exclusiva de quien administra la cobranza.
65. **Implementación que no reabre la frontera de `membresia.service.ts`.**
    `jugador.service.ts` no importa ese servicio: llama directo a
    `cuotasImpagasDeJugadores` (repositorio) y a `estadoCuenta` (la función pura
    de `src/lib/cobranza.ts`), bajo el guard de tenant+categoría que
    `obtenerDetalleJugadorDt` ya aplicaba (`categoriasDelDt`). El DT sigue sin
    poder llamar ninguna función de `membresia.service.ts`; solo se calcula un
    booleano derivado bajo su propia autorización ya existente.
    `estaEnMora` pasa `monto: null, descuento: null` a `estadoCuenta` a
    propósito: `enMora` no depende del monto (una cuota vencida sin monto ya
    cuenta), así que no hace falta convertir el `Decimal` de Prisma para un
    valor que nunca sale hacia la UI del DT.

## Ficha administrativa y médica (2026-08-01)

66. **`HABEAS-DATA.md` se actualizó ANTES que el schema**, como manda la regla
    del proyecto para datos sensibles de menores: nueva categoría de datos
    (salud), sección reforzada con el mismo nivel de detalle que la de fotos
    (§7), y checklist actualizado. El código se escribió después, sobre un
    documento que ya reflejaba lo que se iba a construir — no al revés.
67. **El consentimiento (`autorizaDatosSalud`) gatea DOS veces, no una: al
    guardar y al leer.** El precedente de la foto (`consentimientoFoto`) solo
    gatea la *exhibición*: `subirFoto` no exige consentimiento previo, guarda
    igual y `obtenerHub`/el endpoint de archivos deciden mostrarla o no. Para
    salud se decidió ir más estricto: sin `autorizaDatosSalud`, el servicio
    **descarta** lo que llegue en `eps`/`rh`/`alergias`/`condicionesMedicas`/
    `aptoMedicoVence` — no se guarda, no solo se oculta. Motivo: la salud es un
    dato sensible por naturaleza (art. 5 Ley 1581), no porque identifique al
    menor como la foto; y el art. 9 exige autorización **previa** a la
    recolección, no solo a la exhibición. El documento de identidad y el
    contacto de emergencia NO son datos de salud — no dependen de este
    consentimiento, cubiertos por la autorización general de la Política.
    En lectura se vuelve a filtrar como defensa en profundidad (si algún día
    ese invariante de escritura falla, la exhibición sigue protegida).
68. **Acceso por rol, ortogonal al consentimiento.** `ESCUELA_ADMIN`/`SUPER_ADMIN`
    ven la ficha completa (`obtenerFichaMedicaEscuela`); el DT ve un
    subconjunto fijo — contacto de emergencia, autorización de traslado,
    alergias y vencimiento del apto médico — nunca documento ni EPS. Documento
    y EPS son más sensibles operativamente (identidad, aseguradora) sin ser lo
    que el DT necesita en cancha.
69. **Auditoría de lectura, pero no de cada vista.** Abrir la ficha completa
    (`ESCUELA_ADMIN`/`SUPER_ADMIN`) es una acción deliberada de consultar el
    expediente y queda en `AuditLog`. La vista acotada del DT es contexto
    incidental dentro de una página que se abre decenas de veces por sesión
    (para evaluar, convocar, etc.) — auditar cada carga ahogaría el registro
    sin agregar trazabilidad real. Mismo criterio ya aplicado a `enMora` (§65):
    se deriva un valor bajo la autorización propia del DT, sin generar una
    entrada de auditoría por cada consulta rutinaria.
70. **Lectura on-demand, no precargada con la lista.** El modal de ficha
    (`ESCUELA_ADMIN`) no recibe los datos como prop desde la lista paginada —
    los trae con una Server Action al abrirse (`obtenerFichaMedicaAction`).
    Precargar la ficha de los 20 jugadores de una página habría auditado 20
    lecturas por cada carga de la lista, sin que nadie hubiera abierto ninguna
    de verdad. Es el primer uso en el repo de una Server Action que **lee**
    (no solo escribe) bajo demanda desde un componente cliente — precedente
    nuevo, documentado acá para que el próximo caso similar lo reutilice en vez
    de inventar otro patrón.
71. **La ficha vive en un modal, no en una página de detalle**, a pesar de
    tener más campos que cualquier otro modal de `JugadoresGestion`. Se evaluó
    una página dedicada (`/escuela/jugadores/[id]/ficha`, mismo patrón que
    `dt/jugadores/[id]`) y se descartó: el proxy asigna un rol fijo por
    prefijo de ruta (`/escuela` → `ESCUELA_ADMIN`, `/admin` → `SUPER_ADMIN`,
    sin prefijos compartidos), y `JugadoresGestion` se usa tanto en
    `/escuela/jugadores` como en `/admin/escuelas/[id]` (SA con sesión de
    soporte). Una página bajo `/escuela` no habría sido alcanzable para el SA
    sin duplicarla bajo `/admin`. El modal, en cambio, funciona igual en los
    dos contextos sin route alguna — mismo motivo por el que Editar/Estado/
    Bloqueo ya eran modales y no páginas.
72. **El motivo de soporte reusa `ctx.soporte?.motivo`, no un campo nuevo.**
    `editarJugador` y sus vecinas en `gestion-jugadores.service.ts` ya
    resuelven el motivo del SA desde la sesión de soporte (capturado una vez
    al abrirla), no desde un campo por-acción. `actualizarFichaMedica` sigue
    ese mismo patrón. **Nota de consistencia**: `importarJugadores` e
    `importarEvaluaciones` (hitos 20-21) en cambio piden un motivo NUEVO por
    cada import, vía un campo de texto en el diálogo — un patrón distinto,
    introducido antes de encontrar este precedente. Ninguno de los dos está
    mal (uno reusa el motivo de sesión, el otro pide uno más específico para
    una escritura de mayor volumen). **Resuelto en §79**: se mantienen los dos
    patrones a propósito, no es una inconsistencia a unificar.
73. **Los roles quedan cerrados en cuatro: `SUPER_ADMIN`, `ESCUELA_ADMIN`, `DT`,
    `JUGADOR`.** Decisión explícita del producto (2026-08-04): ningún ítem de
    `PENDIENTES.md` puede introducir un quinto rol de autenticación. En
    particular, **"Staff más allá del DT"** (coordinador, preparador físico,
    utilero) no se resuelve con un rol `STAFF` nuevo — si se construye, tiene
    que modelarse como datos/registros bajo un rol existente (p. ej. gestión
    de `ESCUELA_ADMIN` sobre un modelo de staff sin login propio, o una
    extensión de `Entrenador`), nunca como una entrada más en `ROLES` ni en
    `PREFIJO_ROL` (`src/proxy.ts`). Motivo: cuatro roles con un prefijo de
    ruta fijo cada uno es una invariante que atraviesa el proxy, los guards de
    `src/lib/auth/guards.ts` y buena parte de la UI condicional — sumar un rol
    no es una migración de schema, es tocar la arquitectura de acceso entera.
74. **El riesgo de infraestructura (Auth, backups, observabilidad, CI) se
    difiere a cuando el proyecto esté 100% en producción con dominio propio.**
    Decisión explícita (2026-08-04): no tiene sentido cerrar una decisión de
    arquitectura (¿Auth.js v4, v5 estable, o Supabase Auth?) ni aprovisionar
    infraestructura (proyecto Supabase de CI, verificar PITR, elegir
    observabilidad) para un entorno que todavía puede cambiar de dominio.
    Movidos a la sección Diferido de `PENDIENTES.md`. **No** aplica al
    guardián de tenant (hito 27, `create`/`createMany` + `tx.`) ni a la
    planilla del simulador — esos son código puro, sin dependencia de
    infraestructura, y siguen como paquete activo.
75. **Minutos jugados: se saca de toda la app, la columna de la DB se queda.**
    Decisión de producto (2026-08-05): la ficha de estadística individual del
    partido (Modo Sesión, detalle del evento, hub del jugador, export a Excel)
    deja de leer y escribir `EstadisticaPartido.minutos`. Motivo del producto:
    el DT cargaba minutos a ojo y ese número, mostrado a la familia, generaba
    más ruido que valor (percepción de "juega poco/mucho" sin base real) — solo
    la asistencia (presente/ausente/justificado) es un dato confiable hoy. **No**
    hay migración de schema: la columna `minutos` sigue en `EstadisticaPartido`
    con su `@default(0)` intacto, para no perder el historial de partidos ya
    jugados (ver comentario en `prisma/schema.prisma`). Si en el futuro se
    reintroduce, los datos viejos siguen ahí.
76. **Se elimina el refine `mismoDía` de `eventoSchema`/`editarEventoSchema`.**
    Quedó obsoleto al pasar la creación/edición de eventos de "inicio + fin"
    (dos `datetime-local`) a "fecha + hora de inicio + duración" (§77): con
    duración, el evento nunca puede cruzar de día porque `fin` se deriva
    sumándole minutos a `inicio`, así que la validación ya no puede fallar y
    sobra. De paso tenía un bug latente de zona horaria: comparaba
    `getFullYear/Month/Date` de dos `Date` ya coercionados por Zod
    (`z.coerce.date()`, que corre en el servidor), así que un evento cerca de
    medianoche podía evaluarse en UTC en vez de en la hora de Colombia.
77. **Alta/edición de evento: de `datetime-local` de inicio/fin a fecha + hora
    + duración, construidos en el cliente.** Los formularios (`CrearEventoDialog`,
    `EditarEventoDialog`) mandaban el string crudo de dos `<input
    type="datetime-local">` tal cual al FormData; sin offset de zona, ese string
    llegaba al servidor y `z.coerce.date()` lo interpretaba en UTC (el runtime de
    Vercel), corriendo la hora mostrada respecto a la que tipeó el DT en
    Colombia. Ahora el formulario junta fecha (`<input type="date">`) + hora de
    inicio (selects de hora/minuto, franjas de 15 min) + duración (selects de
    horas 0-6 / minutos de 15 en 15, mínimo 15 min) y arma el `Date` en el
    CLIENTE con el constructor de componentes locales (`new Date(año, mes-1,
    día, hora, min)`), nunca parseando el string del `<input type="date">`
    directo (eso sí se interpreta en UTC y corre el día). Recién ahí se manda
    `.toISOString()` al FormData. Las actions/servicios/repos no cambiaron:
    siguen recibiendo `inicio`/`fin` como antes, solo cambió qué string arma el
    cliente.
78. **Modo Sesión: aviso si se arranca un día distinto al programado.** Si el DT
    entra a `/dt/eventos/[id]/sesion` de un evento cuyo `inicio` programado no
    es el día de hoy (comparado en hora LOCAL del navegador) y la sesión todavía
    no arrancó, en vez de arrancar el cronómetro en silencio con una fecha
    vieja se lo aviso con un modal (`AjustarFechaEventoModal`) para reprogramar
    el evento al momento real de ejecución (preserva la duración original).
    Nueva función `reprogramarEIniciarSesion` (`sesion.service.ts`) +
    `reprogramarEventoAAhora` (`evento.repository.ts`), mismo patrón `updateMany`
    idempotente que `marcarSesionIniciada`. Sin guard de fecha en el servidor a
    propósito: es una guarda de calidad de dato resuelta en el cliente, no
    control de acceso.
79. **Motivo de soporte: los dos patrones se quedan, no se unifican (§72).**
    Decisión del usuario (2026-08-05): un import masivo (200 filas) es una
    acción bien distinta a editar un campo, y amerita un motivo propio y más
    específico que quede registrado aparte en el `AuditLog` — no el motivo
    genérico capturado al abrir la sesión de soporte. `importarJugadores`/
    `importarEvaluaciones` siguen pidiendo su propio motivo por import;
    `editarJugador`, `actualizarFichaMedica` y el resto de las acciones de
    edición puntual del SA siguen reusando `ctx.soporte?.motivo`. Sin cambio
    de código — se cierra la pregunta abierta y se saca de `PENDIENTES.md`.
80. **Descuentos con regla: por categoría, gana la mayor, hermano manual.**
    Decisiones del usuario (2026-08-05) antes de diseñar el modelo: (1) las
    reglas de descuento son **por categoría** (`DescuentoRegla.categoriaId`
    obligatorio, sin alcance de escuela completa como `Arancel`); (2) si un
    jugador califica para más de una regla, se aplica la de **mayor
    descuento en pesos** — no se combinan (`resolverDescuento`,
    `src/lib/cobranza.ts`, compara el descuento resultante, no el `valor`
    crudo, porque un % y un monto fijo no son la misma unidad); (3) la regla
    "Hermano" se identifica **manual** — el ESCUELA_ADMIN asigna jugadores a
    una regla a mano (`JugadorDescuento`, m2m), no hay detección automática
    por vínculo familiar. Sin baja lógica tipo "reemplazar" de Arancel: un
    duplicado (misma categoría+nombre, ambas activas) se rechaza con un
    error, sin flujo de reemplazo con historial.
81. **Acceso parcial del jugador bloqueado: guard nuevo laxo, solo en
    mensajes.** Decisiones del usuario (2026-08-05) antes de diseñar: (1) se
    resuelve con un parámetro opcional `{ permitirBloqueado: true }` en
    `requirePanelUser`/`requireAuthContext` (`src/lib/auth/session.ts`), no
    con un allowlist de rutas dentro de los guards — por defecto (sin el
    parámetro) el comportamiento de ambos guards es idéntico al de siempre
    en absolutamente todas las demás rutas de la app; (2) el aviso "contactá
    a la escuela" convive como banner fijo arriba de `/jugador/mensajes` y
    `/jugador/mensajes/[id]`, no reemplaza la pantalla. Solo esas dos páginas
    y el layout de `/jugador` (que necesita dejar pasar al usuario para que
    algo renderice, y filtra el nav a solo "Mensajes" si está bloqueado)
    pasan el flag; las otras 9 páginas de `/jugador` siguen llamando
    `requireAuthContext()` a secas y se auto-bloquean solas, sin tocarlas.
    `AuthContext` (`src/lib/auth/context.ts`) no ganó un campo `bloqueado`
    a propósito: es una preocupación de UI de una sola pantalla, no algo que
    necesiten las funciones de servicio (Capa 3) que reciben `AuthContext`
    en toda la app — las páginas de mensajes consultan
    `obtenerEstadoBloqueo(ctx.userId)` (ya existía) aparte, para el mensaje.
82. **Perfil del DT: qué mostrar y "temporada completa" sin campo propio.**
    Decisiones del usuario (2026-08-05) antes de diseñar: la pantalla
    muestra (1) evaluaciones hechas por el DT en el período, (2) resultados
    de partidos de sus categorías, (3) plantilla evaluada vs. pendiente; el
    período es elegible (mes actual / temporada completa), no fijo.
    "Temporada completa" **no es un concepto de datos** — el modelo no tiene
    campo `temporada` en ningún lado — se define como sin filtro de fecha
    (todo el histórico del entrenador), la opción más simple, sin inventar
    una noción que el producto no tiene hoy.
83. **Curva etapa 2 — Rendimiento → progreso: sin minutos, roja resta,
    tope propio, sin normalizar por categoría.** Decisiones del usuario
    (2026-08-06) cerrando las 4 preguntas abiertas de
    `CURVA-DE-DESARROLLO.md` §9: (1) solo goles/asistencias de gol cuentan
    — **no** minutos jugados, coherente con §75 (minutos ya se sacó de
    todo el producto) y con el aviso del propio documento de que premiar
    minutos castiga al suplente por una decisión del DT, no propia; (2)
    solo la tarjeta **roja** resta, penalización chica y recuperable
    (amarilla no resta, es parte normal del juego); (3) el bonus de
    rendimiento tiene **tope propio** (`TOPE_RENDIMIENTO_BONUS`), separado
    del de asistencia (`TOPE_MEN_BONUS`) — no comparten límite, se suman
    ambos ya topados; (4) **sin normalizar por categoría** — el MEN mide
    constancia/compromiso propio, no compara jugadores entre sí ni entre
    categorías (mismo criterio que excluye rankings entre escuelas), se
    acota con incrementos chicos por acción en vez de un factor de
    dificultad.
