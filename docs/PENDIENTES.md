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
> Última actualización: 2026-08-06 (se resolvieron los paquetes de los 2
> specs e2e rotos, el motivo de soporte, el guardián de tenant en
> `services`, el filtro `?bloqueado=1`, Descuentos con regla, el acceso
> parcial del jugador bloqueado, el perfil del DT, Staff más allá del DT y
> Progresión del jugador — etapa 2 completa (sus 4 piezas) — ver
> TRAZABILIDAD.md #33-44). Se suman 2 paquetes nuevos sobre categorías:
> selector de años acotado + categorías sin edad, y calibración física por
> categoría real (este último gateado a una decisión de arquitectura en
> DECISIONES.md). Junto con vigencia y bloqueo automático, quedan 3
> paquetes gateados/pendientes.

---

## 🗂️ Paquetes (orden sugerido)

| Paquete | Tamaño | Qué resuelve |
|---|---|---|
| [Vigencia y bloqueo automático](#paquete--vigencia-y-bloqueo-automático) | Medio | **Gateado** — no arrancar todavía |
| [Categorías: selector de años acotado + sin edad](#paquete--categorías-selector-de-años-acotado--categorías-sin-edad) | Medio | Acota el año a un selector y permite categorías sin edad |
| [Calibración física por categoría real](#paquete--calibración-física-por-categoría-real-no-por-franja-etaria-fija) | Grande | Listo para construir — decisiones cerradas en DECISIONES.md §85 |

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

Fix previo obligatorio si se construye "puntos de sesión que mueven la
carta" (ver más abajo, bloqueado): `statsLatest` en
`src/repositories/jugador.repository.ts:6-9` no filtra `evaluacion.anulada`.

---

## Paquete — Categorías: selector de años acotado + categorías sin edad

Medio. Hoy la creación de categorías vive en `/escuela/categorias`
(ESCUELA_ADMIN, no en el perfil del DT) — `crearCategoriaAction`
(`src/actions/escuela.actions.ts:70-82`). Los campos `anioDesde`/`anioHasta`
son inputs numéricos libres (`<input type="number">`, sin `min`/`max` en el
HTML) y obligatorios; `categoriaSchema`
(`src/lib/validators/escuela.ts:24-33`) solo acota a `1990–2100` (110 años
de margen, en la práctica libre):

```ts
export const categoriaSchema = z
  .object({
    nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }),
    anioDesde: z.coerce.number().int().min(1990).max(2100),
    anioHasta: z.coerce.number().int().min(1990).max(2100),
  })
  .refine((d) => d.anioHasta >= d.anioDesde, {
    error: "El año final debe ser ≥ al inicial.",
    path: ["anioHasta"],
  });
```

**Qué construir:**
1. Reemplazar los dos `<input type="number">` de
   `src/app/escuela/categorias/page.tsx` por un `<select>` con un rango
   acotado y realista de años (ej. año actual − 20 a año actual + 1 — cubre
   desde categorías Sub-6 hasta adultas sin dejar tipear cualquier número).
2. Agregar soporte para categoría **sin edad** ("categorías únicas" donde no
   se filtra por edad, ej. una categoría "Masculina"/"Femenina"): un
   checkbox "Sin límite de edad" que oculta/limpia los selects de año.
   Requiere:
   - `prisma/schema.prisma`: `Categoria.anioDesde`/`anioHasta` pasan de
     `Int` a `Int?` (migración).
   - `categoriaSchema`: ambos opcionales; el `.refine` de coherencia
     (`anioHasta >= anioDesde`) solo corre si los dos vienen presentes.
   - `crearCategoria` (`src/repositories/categoria.repository.ts`): firma
     acepta `anioDesde`/`anioHasta` opcionales.
   - `CategoriaDTO` (`src/services/categoria.service.ts`): campos
     `anioDesde`/`anioHasta` pasan a `number | null`.
   - `src/app/escuela/categorias/page.tsx`: hoy renderiza siempre
     `Años {c.anioDesde}–{c.anioHasta}` sin chequeo de null — mostrar "Sin
     límite de edad" cuando son `null`.
3. `Categoria.nombre` ya es texto libre (no hay campo `género` en ningún
   modelo del schema) — nombrar una categoría "Masculina"/"Femenina" ya es
   posible hoy; lo único que lo bloqueaba era el año obligatorio.

**Confirmado sin impacto en el motor de evaluación:** `GrupoEdad`
(Sub8/10/12/14/16, usado para calibrar rangos físicos) se deriva de
`Jugador.fechaNacimiento` vía `grupoEdadPorEdad(edadEnAnios(...))`
(`src/lib/stats-engine/ranges.ts:100-115`) — **nunca** lee
`Categoria.anioDesde/anioHasta`. Opcionalizar estos dos campos no rompe
ninguna evaluación existente.

**Fuera de alcance:** no existe UI de edición de categoría (`update`) hoy en
ningún lado del proyecto — solo alta. Si hace falta editar una categoría ya
creada, es un paquete aparte.

---

## Paquete — Calibración física por categoría real (no por franja etaria fija)

Grande. Decisiones de arquitectura cerradas — ver `DECISIONES.md` §85.
Se construye DESPUÉS del paquete anterior (categorías sin edad): necesita
saber cómo sembrar una categoría sin año antes de poder sembrarse a sí
mismo.

**El problema:** `/admin/parametros` (rangos físicos por prueba: sprint,
salto, agilidad, resistencia) se organiza hoy por `GrupoEdad` — una franja
etaria FIJA y global al sistema (Sub8/10/12/14/16,
`src/lib/stats-engine/types.ts:6`), sin ninguna relación con el modelo real
`Categoria` de cada escuela (nombre libre + rango de años, creado en
`/escuela/categorias`). El panel de parámetros por escuela siempre muestra
las mismas 5 franjas fijas (`const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10",
"SUB12", "SUB14", "SUB16"]`, hardcodeado en
`src/app/admin/parametros/page.tsx`), tenga o no la escuela jugadores ahí, y
sin mostrar los nombres reales de sus categorías ("Sub-12 A", etc.) — de ahí
la confusión de "me trae categorías que no existen".

**Decisiones cerradas (DECISIONES.md §85):**
1. `GrupoEdad` pasa a usarse SOLO como semilla al crear una categoría — se
   mapea su rango de años al `GrupoEdad` más cercano (o Sub-16 si es una
   categoría sin edad) y de ahí en más vive con sus propios rangos,
   independiente.
2. Por (1), toda categoría nace CON rangos propios — sin fallback en
   runtime, solo un backfill único para las categorías que ya existen.
   Estructuralmente es una **tabla nueva por categoría** (no reusar
   `ParametroEscuela`, pensado para global-con-override; una categoría no
   tiene "global").
3. El simulador del Súper Admin y la plantilla Excel de importación de
   evaluaciones se migran también a categoría real, en el mismo paquete.
4. Se construye después del paquete de categorías sin edad.
5. **Cambia el modelo de acceso**: editar los rangos físicos de una
   categoría pasa a ser **self-service del ESCUELA_ADMIN** (ya crea/nombra
   sus propias categorías sin gate del SUPER_ADMIN hoy). El SUPER_ADMIN
   mantiene acceso vía sesión de soporte, mismo criterio que el resto de M2.

**Qué construir (detalle técnico a precisar al diseñar):**
- `prisma/schema.prisma`: tabla nueva `RangoCategoria` (categoriaId +
  prueba + min + max, o equivalente), reemplaza el uso de
  `RANGO_<PRUEBA>_<GRUPO>_MIN/MAX` para evaluaciones (ese esquema de claves
  queda solo como fuente de la semilla inicial).
- `evaluacion.service.ts:105`: hoy resuelve rangos con
  `grupoEdadPorEdad(edadEnAnios(jugador.fechaNacimiento))` →
  `rangosDesdeParametros(valores, grupoEdad)`. Pasa a resolver directo por
  `jugador.categoriaId` (ya existe, ya es obligatorio en `Jugador`).
- Migración/backfill de las categorías existentes (calculando su
  `GrupoEdad` más cercano a partir de su rango de años actual).
- Nueva pantalla self-service en `/escuela/...` (ESCUELA_ADMIN) para editar
  los rangos de sus propias categorías — reemplaza, para este dominio, el
  uso de `/admin/parametros` en modo escuela.
- `/admin/simulador` (`obtenerConfigSimulador`/`obtenerConfigSimuladorEscuela`,
  `src/services/parametro.service.ts`) y la plantilla Excel
  (`src/services/plantilla-simulador.service.ts`,
  `src/lib/plantilla-simulador-layout.ts`) migran de columna/selector
  `GrupoEdad` a categoría real.
- `tests/unit/aislamiento-tenant.test.ts`: cobertura nueva — la clave pasa
  de global-con-override a inherentemente-por-escuela (una `Categoria`
  siempre pertenece a una escuela).

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
