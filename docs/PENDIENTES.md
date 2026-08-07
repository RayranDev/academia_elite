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
> Última actualización: 2026-08-07 (se resolvieron los paquetes de los 2
> specs e2e rotos, el motivo de soporte, el guardián de tenant en
> `services`, el filtro `?bloqueado=1`, Descuentos con regla, el acceso
> parcial del jugador bloqueado, el perfil del DT, Staff más allá del DT,
> Progresión del jugador — etapa 2 completa (sus 4 piezas), Categorías:
> selector de años acotado + categorías sin edad, y Calibración física por
> categoría real — ver TRAZABILIDAD.md #33-46). Se sumaron después una tanda
> de bugs de UI hallados recorriendo el onboarding completo y el género del
> jugador con su avatar (#47-49). Queda un pendiente chico que arrastra ese
> último cambio (mostrar el género donde la escuela organiza) y, gateado,
> vigencia y bloqueo automático.

---

## 🗂️ Paquetes (orden sugerido)

| Paquete | Tamaño | Qué resuelve |
|---|---|---|
| [Mostrar el género donde la escuela organiza](#paquete--mostrar-el-género-donde-la-escuela-organiza) | Chico | Sostiene la finalidad declarada del dato |
| [Vigencia y bloqueo automático](#paquete--vigencia-y-bloqueo-automático) | Medio | **Gateado** — no arrancar todavía |

---

## Paquete — Mostrar el género donde la escuela organiza

Chico, pero **no es cosmético: es lo que sostiene la finalidad declarada**.
`DECISIONES.md` §86 declaró que el género del jugador se recoge para la
*organización deportiva* y el avatar — esa finalidad es la que lo hace
proporcionado frente al principio de minimización de la Ley 1581. Hoy el campo
se captura (4 altas) y se puede rectificar (gestión + cuenta familiar), pero
**el único que lo lee es el avatar**: no se muestra en la ficha del jugador que
usa el DT ni sale en ningún export. Mientras siga así, "organización deportiva"
es una finalidad declarada que nadie ejerce.

Qué falta:
- Mostrarlo en la ficha del jugador del DT (`src/app/dt/jugadores/[id]/page.tsx`),
  junto a categoría/posición/estado. Usar `ETIQUETA_GENERO` (`src/types`), y no
  mostrar nada cuando es `null` (sin declarar) para no sugerir un vacío a llenar.
- Sumarlo al export de jugadores (`src/services/export-jugadores.service.ts` o
  el que corresponda) y al de evaluaciones si aplica.
- Evaluar si el listado de gestión (`JugadoresGestion`) merece una columna o
  alcanza con la ficha.

---

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

(El fix previo que este paquete listaba —`statsLatest` sin filtrar
`evaluacion.anulada`— ya está resuelto: ver TRAZABILIDAD.md #48.)

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
  antes de escribir código (§57). El fix previo que este ítem exigía
  (`statsLatest` sin filtrar `evaluacion.anulada`) ya está hecho — ver
  TRAZABILIDAD.md #48.
- **Herramientas de formación/táctica.** Diferidas a una ronda de planeamiento
  propia; hoy sin ninguna definición.
- **Countdown al iniciar sesión.** Cortado (§56). Si se retoma, que sea de 1
  segundo y salteable.

## 🔮 Fuera de alcance por ahora

Registrados para no re-discutirlos: **rankings entre escuelas** (excluidos a
propósito por privacidad de menores), **app móvil nativa** (hoy es PWA) e
**internacionalización** (la app es en español).
