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
> Última actualización: 2026-08-05 (se resolvieron los paquetes de los 2
> specs e2e rotos, el motivo de soporte, el guardián de tenant en
> `services`, el filtro `?bloqueado=1`, Descuentos con regla y el acceso
> parcial del jugador bloqueado — ver TRAZABILIDAD.md #33-38).

---

## 🗂️ Paquetes (orden sugerido)

| Paquete | Tamaño | Qué resuelve |
|---|---|---|
| [Staff más allá del DT](#paquete--staff-más-allá-del-dt) | Medio | Coordinador, preparador físico, utilero — sin rol nuevo |
| [Perfil del DT con estadísticas](#paquete--perfil-del-dt-con-estadísticas) | Medio | No existe ninguna pantalla de "mis resultados" para el DT |
| [Vigencia y bloqueo automático](#paquete--vigencia-y-bloqueo-automático) | Medio | **Gateado** — no arrancar todavía |
| [Progresión del jugador — etapa 2](#paquete--progresión-del-jugador--etapa-2) | Medio ×4 | **Gateado** — cerrar decisiones de diseño antes de construir |

---

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
