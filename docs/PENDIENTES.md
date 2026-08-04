# Pendientes — qué falta hacer

> **Qué es este archivo.** Lo que **todavía no está construido**. Nada de lo ya
> hecho vive acá: eso va a **[TRAZABILIDAD.md](TRAZABILIDAD.md)**, el registro
> único de historial. Para el contexto del proyecto (visión, stack, arquitectura)
> ver **[ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md)**.
>
> **Organización: por paquetes, no por categoría suelta.** Cada paquete agrupa
> tareas relacionadas y trae el detalle técnico para ejecutarlo sin tener que
> re-investigar el código desde cero — archivos, funciones a tocar o crear, y
> la decisión de diseño si todavía falta cerrarla. Se trabajan en el orden en
> que aparecen (de arriba hacia abajo es la prioridad sugerida), pero nada
> obliga a respetar ese orden si hay una razón puntual para saltarlo.
>
> Cuando un paquete se termina, se borra de acá y se resume en TRAZABILIDAD.
> Si un paquete queda parcialmente hecho, se recorta a lo que falta — no se
> deja una tarea marcada "lista" a medio hacer.
>
> Última actualización: 2026-08-04 (noche, 6).

---

## 🗂️ Paquetes (orden sugerido)

| Paquete | Tamaño | Qué resuelve |
|---|---|---|
| [Riesgo de plataforma (código)](#paquete--riesgo-de-plataforma-código) | Chico | Planilla del simulador hardcodeada. Auth/backups/observabilidad/CI diferidos a producción 100% (ver Diferidos) |
| [Aranceles: cerrar el ciclo de precios](#paquete--aranceles-cerrar-el-ciclo-de-precios) | Medio | Editar, evitar duplicados, describir "OTRO", navegación |
| [Membresías operativas](#paquete--membresías-operativas) | Medio | Paginación, filtro por mes/jugador, export conectado al filtro |
| [Bloqueo por mora: acción directa y masiva](#paquete--bloqueo-por-mora-acción-directa-y-masiva) | Grande | Bloquear desde la lista de cuotas vencidas, ver morosos y elegir a quién bloquear |
| [Unificar el motivo de soporte](#paquete--unificar-el-motivo-de-soporte) | Chico | Decisión de estilo entre dos patrones ya usados en el código |
| [Descuentos con regla](#paquete--descuentos-con-regla) | Medio | El descuento deja de tipearse cuota por cuota |
| [Staff más allá del DT](#paquete--staff-más-allá-del-dt) | Medio | Coordinador, preparador físico, utilero — sin rol nuevo |
| [Acceso parcial del jugador bloqueado](#paquete--acceso-parcial-del-jugador-bloqueado) | Medio | Hoy es bloqueo total; requiere diseño de auth antes de tocar código |
| [Perfil del DT con estadísticas](#paquete--perfil-del-dt-con-estadísticas) | Medio | No existe ninguna pantalla de "mis resultados" para el DT |
| [Vigencia y bloqueo automático](#paquete--vigencia-y-bloqueo-automático) | Medio | **Gateado** — no arrancar todavía |
| [Progresión del jugador — etapa 2](#paquete--progresión-del-jugador--etapa-2) | Medio ×4 | **Gateado** — cerrar decisiones de diseño antes de construir |

---

## Paquete — Riesgo de plataforma (código)

El resto del riesgo de plataforma (Auth, backups, observabilidad, CI) se
diferió a propósito — ver la sección de Diferidos más abajo. Lo que queda
acá es el único ítem que es código puro, sin depender de una decisión de
infraestructura:

- **La planilla del simulador hardcodea el layout del Excel** (Chico).
  `GRUPOS` es una lista (no `Record<GrupoEdad, …>`) y las filas de los
  lookups (`$A$10:$A$13`, escalares en las filas 16-19 del generador) están
  escritas a mano en el servicio que arma la planilla. Sumar un `GrupoEdad` o
  una `Posicion` nueva compila igual y la planilla queda mal en silencio —
  mismo modo de falla que ya se cerró para `COLUMNA_MEDIDA`. Fix: derivar los
  rangos de fila de la longitud real de los arrays en vez de escribirlos.

## Paquete — Aranceles: cerrar el ciclo de precios

Reportado en uso real (2026-08-04) y verificado contra el código
(`src/app/escuela/aranceles/page.tsx`, `src/services/arancel.service.ts`,
`src/repositories/arancel.repository.ts`, `src/lib/validators/arancel.ts`,
`ArancelesPanel.tsx`, modelo `Arancel` en `prisma/schema.prisma:672-686`).

- **Editar un arancel existente.** Hoy `arancel.repository.ts` solo tiene
  `crearArancel`/`desactivarArancel` (línea 43-48, solo togglea `activo`) —
  no hay `actualizarArancel`. Sumar la función al repo, un
  `editarArancelAction` en `arancel.actions.ts`, y el botón/modal en
  `ArancelesPanel.tsx` (hoy solo renderiza "Desactivar", líneas 140, 153-189).
- **Evitar duplicados silenciosos, con aviso, no con bloqueo ciego.**
  A propósito el modelo `Arancel` NO tiene `@@unique` por (categoría,
  concepto) — varias filas con distinto `vigenteDesde` son el historial de
  precios (ver comentario en la migración `20260731130000_arancel`), así que
  un unique constraint rompería ese diseño. El fix es a nivel de **servicio**:
  antes de crear, `crearArancelEscuela` (`arancel.service.ts:47-76`) debería
  consultar `listarArancelesActivos` para esa (categoría, concepto) y, si ya
  hay uno activo, devolver esa info a la UI para que muestre "Ya existe un
  precio activo de $X vigente desde [fecha] — ¿reemplazarlo?" antes de
  confirmar. Reemplazar = desactivar el viejo + crear el nuevo, en una
  transacción.
- **Campo de descripción libre**, sobre todo para el concepto `OTRO`: sin
  esto, en tres meses nadie sabe a qué correspondía ese precio. Requiere
  migración de schema (`descripcion String?` en `Arancel`, con `textoSeguro()`
  en el validador — AGENTS.md §5, es texto libre) + sumarlo al formulario de
  `ArancelesPanel.tsx` (líneas 45-92) y a la tabla que lista los aranceles.
- **Navegación**: la ruta no está en el `NAV` de `src/app/escuela/layout.tsx`
  (solo se llega vía el botón "Precios" de Membresías o desde
  `GenerarCuotasCard.tsx` cuando no hay precios activos). Sumarla al `NAV`
  bajo "Administración", junto a "Membresías" — mismo patrón que se usó para
  agregar "Egresos" (hito 26).

## Paquete — Membresías operativas

Reportado en uso real, verificado contra `src/repositories/membresia.repository.ts`,
`src/services/membresia.service.ts`, `src/app/escuela/membresias/page.tsx`,
`src/components/escuela/MembresiasPanel.tsx`, `src/services/export-membresias.service.ts`.

- **Paginación.** `listarMembresias` (repo, líneas 7-12) y
  `listarMembresiasEscuela` (servicio, líneas 229-272) traen TODAS las filas
  sin `skip`/`take` — con una escuela real generando cobranza mes a mes, esto
  no escala. Sumar paginación de servidor con el mismo patrón ya usado en
  `listarJugadoresGestion`/`contarJugadoresGestion`
  (`jugador.repository.ts`): parámetros `skip`/`take` + una función de
  conteo aparte para el total de páginas.
- **Filtro por período y por jugador** en la lista. Hoy `membresias/page.tsx`
  (líneas 67-97) solo filtra por `estado` vía querystring. Sumar `?periodo=`
  (reusar `periodoSchema` de `validators/membresia.ts`) y `?jugadorId=` (o un
  buscador de texto por nombre, similar al de `escuela/jugadores`). El
  `ComboboxJugador` que ya existe en `MembresiasPanel.tsx` (líneas 241-300)
  es para el formulario de alta, no sirve directo para filtrar la lista —
  hay que decidir si se reusa el componente o se arma un filtro más liviano.
- **Conectar el export al filtro activo.** El botón "Descargar cobranza"
  (`membresias/page.tsx:52-57`) apunta a `/api/membresias-export` con un
  `href` estático, sin querystring. El backend (`export-membresias.service.ts:52-79`
  y la route de la API) **ya soporta** `?estado=` y `?periodo=` — el fix es
  chico: armar el `href` del botón dinámicamente con los filtros activos en
  pantalla, en vez de un link fijo.

## Paquete — Bloqueo por mora: acción directa y masiva

Reportado en uso real como "corrección grande" — así quedó marcado. Verificado
contra `src/services/bloqueo.service.ts` (función `bloquearAccesoJugador`,
líneas 37-65) y `src/components/gestion/JugadorBloqueoModal.tsx`.

- **Acceso directo desde una cuota vencida.** Hoy `MembresiasPanel.tsx` no
  tiene ningún link hacia el bloqueo de jugador; el texto de la página dice
  explícitamente que "el acceso por mora se gestiona desde la ficha del
  jugador" — pero no hay atajo para llegar ahí desde una fila vencida. Sumar
  un link/botón en cada fila de cuota `VENCIDA` que lleve directo a
  `JugadorBloqueoModal` para ese jugador (mismo modal que ya usa
  `JugadoresGestion`, no hace falta uno nuevo).
- **Acción masiva "Ver morosos".** No existe ninguna vista que liste a todos
  los jugadores con cuota vencida y permita elegir a quién bloquear en un
  solo paso. Diseño sugerido: un botón en el dashboard o en Membresías que
  abra un modal/página con la lista de morosos (reusar
  `resumenMembresias`/`cuotasImpagas` de `membresia.repository.ts` para
  traerlos), cada uno con checkbox, y un botón "Bloquear seleccionados" —
  **nunca** un bloqueo automático sin que el humano elija explícitamente
  (ver el criterio ya aplicado en el cron gateado de Vigencia, más abajo:
  la escuela decide, el sistema no bloquea solo por comportamiento).
- **Extender `bloquearAccesoJugador`** para aceptar múltiples ids, o iterar
  llamándola una vez por jugador manteniendo la auditoría individual por
  cada bloqueo (no un solo registro de `AuditLog` para todo el lote — cada
  bloqueo es una acción sobre un jugador puntual y tiene que quedar
  trazable por separado).

## Paquete — Unificar el motivo de soporte

Chico, es una decisión de estilo, no una feature nueva. `editarJugador` y sus
vecinas en `gestion-jugadores.service.ts` reusan `ctx.soporte?.motivo`
(capturado una vez al abrir la sesión de soporte del SUPER_ADMIN);
`importarJugadores`/`importarEvaluaciones` (hitos 20-21) piden un motivo
**nuevo** por cada import, vía un campo de texto propio en el diálogo.
Ninguno de los dos patrones está mal — la pregunta a resolver antes de tocar
código es si un import masivo amerita de verdad un motivo más específico que
el de sesión (parece razonable: importar 200 filas es una acción bien
distinta a editar un campo), o si conviene unificar todo bajo el motivo de
sesión por consistencia. Detalle completo de por qué surgió la
inconsistencia en `DECISIONES.md` §72.

## Paquete — Descuentos con regla

Medio. Hoy `Membresia.descuento` se tipea a mano por cuota individual. Falta
representarlo como una **regla** (ej. "hermano" = 10% en la segunda
mensualidad de la familia, "beca" = descuento fijo) para que
`generarCuotasDelPeriodo` (`membresia.service.ts`) la aplique sola al generar
la cobranza masiva del mes, en vez de que alguien edite cuota por cuota.
Preguntas a cerrar antes de diseñar el modelo: ¿las reglas son por escuela
completa o por categoría (como `Arancel`)? ¿Se pueden combinar dos reglas
sobre el mismo jugador, o gana la de mayor descuento? ¿Cómo se identifica
"hermano" — por `parentescoAcudiente` compartido entre jugadores de la misma
familia, o es manual?

## Paquete — Staff más allá del DT

Medio. Solo existe `Entrenador` (el modelo detrás del rol `DT`): no hay
coordinador, preparador físico ni utilero. **Sin rol nuevo** — decisión de
producto ya cerrada y registrada en `DECISIONES.md` §73: los roles quedan
fijos en `SUPER_ADMIN`/`ESCUELA_ADMIN`/`DT`/`JUGADOR`. Si se construye, el
diseño tiene que modelarlo como datos gestionados por `ESCUELA_ADMIN` — por
ejemplo un modelo `Staff` (`escuelaId`, `nombre`, `rol` cerrado
`COORDINADOR|PREPARADOR_FISICO|UTILERO|OTRO`, contacto), **sin** `userId` ni
relación a `User` — no inicia sesión, es un registro administrativo, no una
cuenta.

## Paquete — Acceso parcial del jugador bloqueado

Medio, pero toca funciones centrales — no es un parche puntual. Pedido en uso
real: cuando un jugador queda bloqueado por falta de pago, debería poder
entrar igual pero ver un aviso de "contactá a la escuela" y solo acceder a
los mensajes directos entre el DT y el jugador.

Comportamiento **actual** verificado: el bloqueo es total.
`requireAuthContext` (`src/lib/auth/session.ts:71`) y `requirePanelUser`
(línea 103) redirigen a `/bloqueado` a cualquier usuario con
`bloqueado: true` **antes** de renderizar cualquier página o layout de
`/jugador` — incluidos los mensajes (`src/app/jugador/mensajes/page.tsx:8`
llama a la misma función). `/app/bloqueado/page.tsx` solo ofrece "Cerrar
sesión".

Por qué no es un fix chico: `requireAuthContext`/`requirePanelUser` son las
funciones que usa **toda la app** para construir el `AuthContext` de sesión
— no se puede simplemente "dejar pasar" al bloqueado sin decidir con
precisión qué rutas quedan abiertas y por qué, para no abrir sin querer un
agujero de acceso. Diseño a cerrar antes de escribir código: ¿se resuelve con
un allowlist de rutas permitidas para bloqueados dentro del guard, o con un
nuevo guard más laxo (`requireAuthContextLimitado` o similar) que solo se usa
en las páginas de mensajes? ¿El aviso de "contactá a la escuela" reemplaza el
contenido de `/jugador` o convive arriba de los mensajes?

## Paquete — Perfil del DT con estadísticas

Medio. Confirmado que no existe: las rutas de `src/app/dt/` son agenda del
día (`page.tsx`), plantilla, calendario, `progreso` (que es de los
**jugadores**, no del DT), logros, mensajes, anuncios, solicitudes y cuenta
(solo datos de sesión, sin métricas). El nav de `src/app/dt/layout.tsx:25-40`
no tiene ninguna entrada de tipo "Mi perfil"/"Resultados". Antes de construir
hay que definir qué debería mostrar — candidatos: evaluaciones hechas en el
mes/temporada, resultados de los partidos de su equipo, jugadores evaluados
vs. pendientes histórico. Ninguna de esas agregaciones existe hoy a nivel DT
(la única vista de resultados/ranking, `escuela/ranking/page.tsx`, pertenece
al panel de la escuela).

## Paquete — Vigencia y bloqueo automático

Medio. **Gateado — no se construye todavía.** Cron que bloquea vencidos y
desbloquea al día, apoyado sobre el estado de cuenta derivado de `Membresia`
(A.4, ya en producción). No arranca hasta que una escuela real haya cerrado
un ciclo de cobro completo y el bloqueo manual resulte repetitivo — antes de
eso, automatizarlo es resolver un problema que todavía no existe. Diseño de
riesgos ya cerrado, para cuando se destrabe: `TIPOS_BLOQUEO` suma
`"VIGENCIA_VENCIDA"` en `src/lib/bloqueo.ts`; `bloqueado: false` en el WHERE
del cron de bloqueo (no pisa un bloqueo manual ya puesto); `bloqueoTipo:
"VIGENCIA_VENCIDA"` en el WHERE del desbloqueo automático (no levanta un
bloqueo puesto por otro motivo); `registrarAuditoriaSistema` con actorId
`"SISTEMA"` para el cron, que no tiene `AuthContext` de un usuario real.

## Paquete — Progresión del jugador — etapa 2

Medio ×4. **Gateado — cerrar decisiones de diseño antes de construir**
(`CURVA-DE-DESARROLLO.md` §9). La etapa 1 ya está en producción: la
asistencia mueve el MEN a diario y eso recalcula el OVR del hub.

- **Rendimiento → progreso.** Hoy la curva premia la presencia, no lo que
  pasa en la cancha: `EstadisticaPartido` (goles, asistencias, minutos,
  tarjetas) no alimenta nada — quien marca tres goles suma igual que quien
  fue y no jugó. El dato ya lo carga el DT en el Modo Sesión. Decisiones a
  cerrar primero: ¿pesan los minutos jugados (que dependen de una decisión
  del DT, no del chico)? ¿las tarjetas restan progreso? ¿el tope es propio de
  esta fuente o compartido con el de asistencia?
- **Vista de seguimiento para el DT.** El dato ya existe (asistencias, bonus,
  histórico) pero no hay pantalla que lo muestre ("este chico ganó X este
  mes y fue por esto"). Es lo que convierte la curva en herramienta de
  trabajo del DT, no en un adorno del hub del jugador.
- **Línea de proyección.** La punteada de `CURVA-DE-DESARROLLO.md` §6: hacia
  dónde va el OVR si se mantiene el esfuerzo acumulado. Pura visualización
  sobre datos que ya existen, sin dependencias de diseño pendientes.
- **Pesos de la curva por escuela.** `CURVA` son constantes globales hoy; la
  infraestructura de `ParametroEscuela` (usada para otras configuraciones
  por tenant) ya existe y se puede reusar sin diseño nuevo.

Fix previo obligatorio si se construye "puntos de sesión que mueven la
carta" (ver más abajo, bloqueado): `statsLatest` en
`src/repositories/jugador.repository.ts:6-9` no filtra `evaluacion.anulada`.

---

## 🟡 Diferido — depende de algo externo, no entra en un paquete todavía

> **Decisión (2026-08-04): el resto del riesgo de plataforma se retoma cuando
> el proyecto esté 100% en producción**, junto con la implementación del
> dominio propio — no antes. Hasta entonces, no tiene sentido cerrar una
> decisión de arquitectura (Auth) o de infraestructura (backups,
> observabilidad, CI) para un entorno que todavía puede cambiar.

- **Decisión de Auth** (Media). Sigue en **Auth.js v5 beta**. Opciones: (a)
  estabilizar en v4, (b) migrar a Supabase Auth, (c) quedarse en v5 con
  cobertura E2E completa del flujo de login/recuperación/OTP y un plan de
  rollback documentado. Es el riesgo más señalado del proyecto por tratarse
  de datos de menores. Antes de decidir, revisar el changelog de v5 estable
  más reciente — puede que ya haya salido de beta.
- **Backups / PITR** (Chico, config). Verificar en el dashboard de Supabase
  que el Point-in-Time Recovery esté activo para el proyecto de producción.
  Sin esto, un `DELETE`/`DROP` accidental (humano o de un bug) es
  irreversible. Es una casilla para tildar, no código.
- **Observabilidad** (Media). Hoy solo hay logs de runtime de Vercel y el
  `digest` del error boundary (`src/app/error.tsx`/`global-error.tsx`).
  Sentry se descartó dos veces: incompatibilidad con Next 16 + Turbopack, y
  porque es un procesador externo que recibiría PII de menores (requeriría
  pasar por `HABEAS-DATA.md` primero, como cualquier tercero nuevo).
  Reevaluar cuando el SDK de Sentry madure para Turbopack, o buscar una
  alternativa self-hosted que no saque datos del proyecto.
- **`build` y `e2e` en el workflow de CI** (Media). Hoy el workflow
  (`.github/workflows/`) corre `typecheck`/`lint`/`test` (unit). Sumar
  `build` y `test:e2e` exige un proyecto Supabase **dedicado a CI** (no el de
  producción) con sus propios secretos en GitHub Actions — hay que
  aprovisionarlo antes de tocar el YAML.
- **Credenciales por link en alta de DT y jugador** (Chico). Hoy el alta
  muestra la contraseña temporal una vez; se podría mandar además un link
  (`emitirSetPassword`, ya usado en recuperación). Depende del correo:
  mientras `EMAIL_DEV_TO` esté activo y el dominio de Resend sin verificar,
  el link no llegaría al DT/familia real. Retomar después de verificar el
  dominio y sacar `EMAIL_DEV_TO`.
- **Paginación de mensajes** (Chico → Medio). Las conversaciones no paginan
  en servidor (jugadores/auditoría/eventos sí). Prematuro hoy — un DT tiene
  pocos hilos — y para hacerlo bien hay que mover el filtro del DT (hoy
  client-side en `MensajesDtFiltro`) a la URL, si no el filtro solo
  aplicaría dentro de la página ya cargada.

## ❓ Sin reproducir — necesitan un caso concreto

No se tocan hasta poder reproducirlos; el código no muestra el defecto.

- **"El partido debería empezar 0-0."** Un partido nuevo calcula 0-0 desde
  `resultadoLocal/Visitante = null`. Probablemente dato residual de pruebas.
- **"El color de los stats no coincide con el fondo."** El color SÍ fluye:
  `obtenerHub` setea `card.fondoTexto` desde `fondo.colorTexto` y en `PlayerCard`
  todo el texto hereda `textoCarta`. Hipótesis: el fondo equipado tiene
  `colorTexto = null`, o se compara con otro listado que usa tokens del tema.

## 🚧 Bloqueado por una decisión de producto

- **Puntos de sesión que mueven la carta.** Contradice la tesis documentada en
  `ESTADO-DEL-PROYECTO.md` §0. Requiere entrada explícita en `DECISIONES.md`
  antes de escribir código (§57). Si se aprueba, el fix previo obligatorio es
  `statsLatest` en `src/repositories/jugador.repository.ts`, que no filtra
  `evaluacion.anulada`.
- **Herramientas de formación/táctica.** Diferidas a una ronda de planeamiento
  propia; hoy sin ninguna definición.
- **Countdown al iniciar sesión.** Cortado (§56). Si se retoma, que sea de 1
  segundo y salteable.

## 🔮 Fuera de alcance por ahora

Registrados para no re-discutirlos: **rankings entre escuelas** (excluidos a
propósito por privacidad de menores), **app móvil nativa** (hoy es PWA) e
**internacionalización** (la app es en español).
