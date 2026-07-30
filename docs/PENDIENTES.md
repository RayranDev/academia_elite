# Pendientes — qué falta hacer

> **Qué es este archivo.** Lo que **todavía no está construido**. Nada de lo ya
> hecho vive acá: eso va a **[TRAZABILIDAD.md](TRAZABILIDAD.md)**, el registro
> único de historial. Para el contexto del proyecto (visión, stack, arquitectura)
> ver **[ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md)**.
>
> Convención: cada ítem lleva **tamaño** estimado y una línea de qué y por qué.
> Cuando algo se termina, se borra de acá y se resume en TRAZABILIDAD.
>
> Última actualización: 2026-07-29.

---

## 🔴 Riesgo — antes que features nuevas

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Decisión de Auth** | Media | Sigue en **Auth.js v5 beta**. Opciones: estabilizar en v4, migrar a Supabase Auth, o quedarse en v5 con cobertura E2E y plan de rollback. Es el riesgo señalado para datos de menores en producción. |
| **Backups / PITR** | Chico (config) | Verificar que estén activos en Supabase. Sin esto, un borrado accidental es irreversible. |
| **Observabilidad** | Media | Hoy solo hay logs de runtime de Vercel + el `digest` del error boundary. Sentry quedó descartado por incompatibilidad con Next 16 + Turbopack **y** por ser un procesador externo que recibiría PII de menores (requiere pasar por Habeas Data primero). Reevaluar cuando el SDK madure. |
| **`build` y `e2e` en CI** | Media | El workflow corre typecheck/lint/test. Sumar build y E2E exige un proyecto Supabase dedicado a CI con sus secretos. |

## 🟡 Producto — Modo Partido v2

| Ítem | Tamaño | Detalle |
|---|---|---|
| **Tarjeta azul** | Chico + migración | No existe en el schema; requiere campo en `EstadisticaPartido` + UI. |

## 🟢 Mejoras acotadas

| Ítem | Tamaño | Detalle |
|---|---|---|
| Mensaje de "stats aún no disponibles" | Chico | La UI hoy simplemente no muestra la tabla de estadística si `estadistica` viene `null` (gateado por `estadoDeEvento()`); agregar una nota explicando que se publica cuando el partido arranca. |
| Auditoría: filtro por rango de fechas | Chico | Complementa los filtros por entidad/acción/actor ya existentes. |
| Credenciales por link en alta de DT y jugador | Chico | Hoy `emitirSetPassword` solo se usa en el alta de escuela; extenderlo es directo. |
| Paginación de mensajes | Chico | Jugadores, auditoría y eventos ya paginan en servidor; conversaciones de mensajes todavía no. |
| `auth.ts` → repositorio | Chico | El provider Credentials consulta Prisma directo (patrón estándar de Auth.js, preexistente). Moverlo a `buscarCredencialesPorEmail` alinearía con la regla de capas. |

## ❓ Sin reproducir — necesitan un caso concreto

No se tocan hasta poder reproducirlos; el código no muestra el defecto.

- **"El partido debería empezar 0-0."** Un partido nuevo calcula 0-0 desde
  `resultadoLocal/Visitante = null`. Probablemente dato residual de pruebas.
- **"El color de los stats no coincide con el fondo."** El color SÍ fluye:
  `obtenerHub` setea `card.fondoTexto` desde `fondo.colorTexto` y en `PlayerCard`
  todo el texto hereda `textoCarta`. Hipótesis: el fondo equipado tiene
  `colorTexto = null`, o se compara con otro listado que usa tokens del tema.

## 🔮 Fuera de alcance por ahora

Registrados para no re-discutirlos: **pagos/facturación** de cuotas (hoy el
bloqueo por mora es manual), **rankings entre escuelas** (excluidos a propósito
por privacidad de menores), **app móvil nativa** (hoy es PWA) e
**internacionalización** (la app es en español).
