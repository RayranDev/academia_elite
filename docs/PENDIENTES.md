# Pendientes — qué falta hacer

> **Qué es este archivo.** Lo que **todavía no está construido**. Nada de lo ya
> hecho vive acá: eso va a **[TRAZABILIDAD.md](TRAZABILIDAD.md)**, el registro
> único de historial. Para el contexto del proyecto (visión, stack, arquitectura)
> ver **[ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md)**.
>
> Convención: cada ítem lleva **tamaño** estimado y una línea de qué y por qué.
> Cuando algo se termina, se borra de acá y se resume en TRAZABILIDAD.
>
> Última actualización: 2026-07-31.

---

## 🔴 Riesgo — antes que features nuevas

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Decisión de Auth** | Media | Sigue en **Auth.js v5 beta**. Opciones: estabilizar en v4, migrar a Supabase Auth, o quedarse en v5 con cobertura E2E y plan de rollback. Es el riesgo señalado para datos de menores en producción. |
| **Backups / PITR** | Chico (config) | Verificar que estén activos en Supabase. Sin esto, un borrado accidental es irreversible. |
| **Observabilidad** | Media | Hoy solo hay logs de runtime de Vercel + el `digest` del error boundary. Sentry quedó descartado por incompatibilidad con Next 16 + Turbopack **y** por ser un procesador externo que recibiría PII de menores (requiere pasar por Habeas Data primero). Reevaluar cuando el SDK madure. |
| **`build` y `e2e` en CI** | Media | El workflow corre typecheck/lint/test. Sumar build y E2E exige un proyecto Supabase dedicado a CI con sus secretos. |
| **`importacion.service.ts` corta el tope DENTRO del loop** | Chico | Mismo defecto que se acaba de corregir en `importacion-evaluaciones`: el `throw` por exceso de filas sale sin pasar por `registrarAuditoria`, después de haber escrito las primeras 500. Se arregla validando `filas.length` antes del loop. Quedó sin tocar para no mezclarlo con el cambio del portero. |
| **La planilla del simulador hardcodea el layout del Excel** | Chico | `GRUPOS` es una lista (no `Record<GrupoEdad, …>`) y las filas de los lookups (`$A$10:$A$13`, escalares en 16-19) están escritas a mano. Sumar un `GrupoEdad` o una `Posicion` compila igual y la planilla queda mal en silencio — el mismo modo de falla que ya se cerró con `COLUMNA_MEDIDA`. Derivar los rangos de la longitud de los arrays. |
| **El guardián de tenant no cubre `create`/`createMany`** | Chico → Medio | `tests/unit/aislamiento-tenant.test.ts` arma su regex desde `METODOS`, que no incluye los creates. Hoy todo el código pasa `escuelaId` correctamente, pero **el próximo `create` que lo olvide no lo detecta nadie** — y escribir filas en el tenant equivocado es peor que filtrar una lectura. Ojo al hacerlo: un create no tiene `where`, así que hay que mirar el bloque `data`, y varios creates existentes lo pasan opaco (`progresoSemanal`, `notificacion`, `jugadorConvocado`) — habrá que anotarlos o desglosarlos. PR propio. |

## 🟢 Mejoras acotadas

| Ítem | Tamaño | Detalle |
|---|---|---|
| Credenciales por link en alta de DT y jugador | Chico | Hoy el alta muestra la contraseña temporal una vez; se podría mandar además un link (`emitirSetPassword`, ya usado en recuperación). **Diferido: depende del correo.** Mientras `EMAIL_DEV_TO` esté activo y el dominio de Resend sin verificar, el link no llegaría al DT/familia. Hacer después de verificar el dominio + sacar `EMAIL_DEV_TO`. |
| Paginación de mensajes | Chico → Medio | Conversaciones de mensajes no paginan en servidor (jugadores/auditoría/eventos sí). **Diferido: prematuro** (un DT tiene pocos hilos) y para hacerlo bien hay que mover el filtro del DT —hoy client-side en `MensajesDtFiltro`— a la URL, o el filtro solo aplicaría dentro de la página. |

## ❓ Sin reproducir — necesitan un caso concreto

No se tocan hasta poder reproducirlos; el código no muestra el defecto.

- **"El partido debería empezar 0-0."** Un partido nuevo calcula 0-0 desde
  `resultadoLocal/Visitante = null`. Probablemente dato residual de pruebas.
- **"El color de los stats no coincide con el fondo."** El color SÍ fluye:
  `obtenerHub` setea `card.fondoTexto` desde `fondo.colorTexto` y en `PlayerCard`
  todo el texto hereda `textoCarta`. Hipótesis: el fondo equipado tiene
  `colorTexto = null`, o se compara con otro listado que usa tokens del tema.

## 💰 ERP — cobranza y administración

El producto se posiciona como **ERP de escuelas de fútbol** (`DECISIONES.md` §49).
**A.0–A.4 ya están hechos** (ver hito 18 de TRAZABILIDAD): dinero en `Decimal`,
registro real del pago, lista de precios, generación masiva de la cobranza del
mes, y estado/deuda derivados. Lo que sigue:

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Badge de deuda en las listas** | Chico | `estadoCuenta` ya existe y el dashboard lo usa, pero falta el badge por jugador en `escuela/jugadores` y en la ficha que ve el DT: hoy la deuda se ve en el agregado, no al lado del chico. |
| **F — Ficha administrativa y médica** | Grande | `Jugador` no tiene documento, EPS, RH, alergias, apto médico con vencimiento, contacto de emergencia propio ni autorización de traslado. Es lo que el DT necesita cuando un chico se lesiona de visitante. **Bloqueante previo:** son datos sensibles de salud de menores (Ley 1581) — `HABEAS-DATA.md` se actualiza en el mismo PR que el schema, no después. |
| **Descuentos con regla** | Medio | Hoy el descuento se tipea por cuota. Falta representarlo como regla (hermano, beca) para que la generación masiva lo aplique sola. |
| **Caja / egresos** | Grande | Solo se modela lo que entra. La escuela paga canchas, arbitrajes e indumentaria. |
| **Staff más allá del DT** | Medio | Solo existe `Entrenador`: no hay coordinador, preparador físico ni utilero. |
| **V — Vigencia y bloqueo automático** | Medio | Cron que bloquea vencidos y desbloquea al día, sobre A.4. **Gateado**: no se construye hasta que una escuela real haya cerrado un ciclo de cobro completo y el bloqueo manual resulte repetitivo. Mitigaciones ya diseñadas: `bloqueado: false` en el WHERE del bloqueo automático (no pisa un bloqueo manual) y `bloqueoTipo: "VIGENCIA_VENCIDA"` en el del desbloqueo (no levanta un bloqueo por comportamiento). |

## 🎨 Localización a Colombia

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Tuteo neutro** | Chico | ~18 archivos con voseo rioplatense; suena extranjero en una demo colombiana. Incluye `src/lib/email/plantillas.ts`, que conviene en tanda aparte (un email mal formateado no se corrige con un redeploy). |
| **Fechas formateadas en el servidor** | Chico | Varios Server Components usan `toLocaleDateString("es")` en vez de `FechaLocal` (`dt/solicitudes`, `jugador/page`, `escuela/codigos`, `admin/auditoria`, `admin/page`). El SSR corre en UTC y Colombia es UTC-5, así que una fecha de la tarde se muestra con el día siguiente — se nota sobre todo en las que llevan hora. El `"es-AR"` suelto de `escuela/page.tsx` ya se corrigió. |

## 📈 Progresión del jugador (curva de desarrollo)

La etapa 1 **ya está en producción**: la asistencia mueve el MEN a diario y eso
recalcula el OVR del hub (ver `CURVA-DE-DESARROLLO.md` §0). Lo que falta:

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Rendimiento → progreso** | Medio | Hoy la curva premia la **presencia**, no lo que pasa en la cancha: `EstadisticaPartido` (goles, asistencias, minutos, tarjetas) **no alimenta nada**, así que quien marca tres goles suma igual que quien fue y no jugó. El dato ya lo carga el DT en el Modo Sesión. **Decisiones a cerrar antes de construir** en `CURVA-DE-DESARROLLO.md` §9 etapa 2 (¿pesan los minutos, que dependen del DT y no del chico? ¿las tarjetas restan? ¿tope propio o compartido?). |
| **Vista de seguimiento para el DT** | Medio | Nadie puede ver "este chico ganó X este mes y fue por esto". El dato existe (asistencias, bonus, histórico); falta la pantalla. Es lo que convierte la curva en herramienta de trabajo y no en un adorno del hub. |
| **Línea de proyección** | Medio | La punteada de `CURVA-DE-DESARROLLO.md` §6: hacia dónde va el OVR con el esfuerzo acumulado. Pura visualización sobre datos que ya existen. |
| **Pesos de la curva por escuela** | Chico | `CURVA` son constantes globales; la infra de `ParametroEscuela` ya existe. |

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
