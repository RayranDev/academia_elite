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
61. **La planilla del simulador ramifica igual que el motor.**
    `plantilla-simulador.service.ts` **replica las fórmulas a mano en Excel**, así
    que sin ramificarla habría mostrado un OVR distinto al real para cada arquero.
    Lleva `IF($B{fila}="POR", …)` en los cinco stats que difieren. **Cualquier
    cambio futuro en `derivaStats*` tiene que replicarse ahí**, o las dos verdades
    se separan en silencio.
62. **Las cartas de arquero ya emitidas NO se recalculan.** Las evaluaciones son
    inmutables por diseño: los 8 arqueros con carta al momento del cambio
    conservan sus números viejos hasta que el DT los vuelva a evaluar. No se hace
    una migración de datos — reescribir una medición histórica sería mentir sobre
    lo que se midió ese día.
