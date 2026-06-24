# Diseño del rol Súper Admin (control sin caos)

> **Para la IA que ejecuta este plan:** este documento define cómo debe
> comportarse el `SUPER_ADMIN` y qué construir para que su control sea total
> pero **gobernado y auditado**, no omnipresente y silencioso. Implementa por
> **milestones** (M1 primero, son cambios pequeños y de alto valor; M2 y M3
> después). No rompas flujos existentes del panel `/admin`. Ejecuta
> `npm run typecheck` y `npm test` al cerrar cada milestone.

---

## 1. Principio rector

**Gobernar la plataforma ≠ operar una escuela.**

El `SUPER_ADMIN` administra el sistema: crea/suspende escuelas, edita catálogos
globales y parámetros de fórmula, ve métricas agregadas, da soporte. **No** es su
trabajo editar el día a día de una escuela (jugadores, evaluaciones, eventos).
Cada escuela se autogestiona. El súper admin **abre puertas y vigila**; la
escuela trabaja adentro.

Regla práctica derivada: el súper admin **no debe tener acceso ambiental** a los
datos operativos de un tenant. Cuando necesite entrar (soporte), lo hace por una
puerta **explícita, temporal y auditada** (modo soporte / impersonación), no por
un bypass invisible.

---

## 2. Estado verificado del código (ya revisado)

- `AuthContext` (`src/lib/auth/context.ts`): `{ userId, rol, escuelaId, ... }`,
  con `escuelaId: null` solo para `SUPER_ADMIN`.
- `assertTenant` (`src/lib/auth/guards.ts`) hace **`if (ctx.rol === "SUPER_ADMIN")
  return;`** → el súper admin cruza cualquier tenant sin fricción. El comentario
  dice "auditado aparte", pero **ese auditado no está forzado por el código**.
  Este es el riesgo central que corrige este documento.
- Existe `model AuditLog` (`actorId, actorRol, accion, entidad, entidadId,
  escuelaId?, motivo?, createdAt`) y `audit.repository.ts` (append-only:
  `crearAuditGlobal`, `listarAuditGlobal`). El panel del súper admin ya tiene un
  explorador de AuditLog.
- Ya existen: pipeline de leads, conversión lead→escuela, edición de parámetros
  de fórmula, catálogos globales (`FondoCarta`, `ParametroFormula`, catálogo de
  `Logro`). Snapshots inmutables de stats con `versionFormula`.
- `model Membresia` existe (`escuelaId, jugadorId, periodo, ...`) → base para
  facturación/morosidad.

---

## 3. El riesgo exacto a corregir

Hoy un súper admin (o una cuenta súper admin comprometida, o un bug) puede leer y
escribir datos de **cualquier** escuela sin dejar rastro garantizado, porque
`assertTenant` lo deja pasar siempre. Eso es justo lo que vuelve "caótico" el rol:
poder total + cero ceremonia + auditoría no obligatoria.

La corrección **no** es quitarle poder, es **encauzarlo**: que el acceso a datos
de un tenant sea una acción consciente, acotada en el tiempo, por defecto de
solo-lectura, y siempre registrada.

> **No mezclar conceptos:** los *dashboards agregados* (cuentas, totales,
> métricas cross-tenant) NO pasan por `assertTenant` fila a fila y siguen
> funcionando normal. La puerta de soporte aplica solo al **detalle/edición de un
> tenant concreto**.

---

## 4. Milestone M1 — Auditar SIEMPRE el cruce de tenant (rápido, alto valor)

Objetivo: que ninguna acción de un súper admin sobre datos de una escuela ocurra
sin un registro en `AuditLog`. Esto se puede hacer ya, sin modelo nuevo.

1. **Helper de auditoría obligatorio.** En `src/services` (o donde vivan los
   helpers de auditoría), crea/usa una función que toda acción de escritura
   sensible deba invocar. Ya existe `registrarAuditoria(ctx, {...})` usado en
   `gestion-jugadores.service.ts`; estandarízalo.

2. **Regla nueva:** en cada `service` donde el `SUPER_ADMIN` pueda escribir sobre
   datos de un tenant (editar jugador, anular evaluación, resetear contraseña,
   etc.), si `ctx.rol === "SUPER_ADMIN"` la acción **debe** llamar a
   `registrarAuditoria` con `escuelaId` del recurso y un `motivo`. Si no hay
   `motivo`, lanza `ValidationError("El soporte requiere un motivo.")`.

3. **Test (Vitest):** añade `tests/unit/auditoria-superadmin.test.ts` que verifique
   que las funciones de servicio de escritura, llamadas con un `ctx` de
   `SUPER_ADMIN` sin `motivo`, lanzan `ValidationError`. (Mockea los repos; aquí
   solo importa la regla de auditoría, no la BD.)

**Criterio de aceptación M1:** ninguna escritura cross-tenant del súper admin
compila/pasa sin `motivo` + entrada de `AuditLog`.

---

## 5. Milestone M2 — Modo Soporte (impersonación explícita y auditada)

Convierte el bypass invisible en una **sesión de soporte** consciente.

### 5.1 Modelo nuevo (Prisma)

Agrega a `prisma/schema.prisma` (y genera migración):

```prisma
model SoporteSesion {
  id           String    @id @default(cuid())
  superAdminId String
  escuelaId    String
  motivo       String
  soloLectura  Boolean   @default(true)
  iniciadaEn   DateTime  @default(now())
  finalizadaEn DateTime?

  @@index([superAdminId, finalizadaEn])
  @@index([escuelaId])
}
```

### 5.2 `AuthContext`

Extiende `src/lib/auth/context.ts`:

```ts
export interface AuthContext {
  userId: string;
  rol: Rol;
  escuelaId: string | null;
  entrenadorId?: string;
  jugadorId?: string;
  // Presente solo si un SUPER_ADMIN tiene una sesión de soporte activa:
  soporte?: { sesionId: string; escuelaId: string; soloLectura: boolean };
}
```

La capa de sesión (Capa 2) debe rellenar `soporte` leyendo la `SoporteSesion`
activa (sin `finalizadaEn`) del súper admin, si existe.

### 5.3 Cambio en `guards.ts`

Reemplaza el bypass total por un acceso **gobernado**:

```ts
export function assertTenant(ctx: AuthContext, recursoEscuelaId: string): void {
  if (ctx.rol === "SUPER_ADMIN") {
    // Sin sesión de soporte activa, NO puede tocar datos de un tenant concreto.
    if (!ctx.soporte) throw new ForbiddenError("Abre una sesión de soporte.");
    if (ctx.soporte.escuelaId !== recursoEscuelaId) throw new TenantMismatchError();
    return;
  }
  if (ctx.escuelaId === null || ctx.escuelaId !== recursoEscuelaId) {
    throw new TenantMismatchError();
  }
}
```

Y un guard de escritura para respetar el solo-lectura:

```ts
export function assertSoportePuedeEscribir(ctx: AuthContext): void {
  if (ctx.rol === "SUPER_ADMIN" && ctx.soporte?.soloLectura) {
    throw new ForbiddenError("Sesión de soporte en solo lectura.");
  }
}
```

> **Compatibilidad:** los dashboards agregados y la gestión de catálogos globales
> NO llaman a `assertTenant` (no son recursos de un tenant), así que **no se
> rompen**. Si encuentras un flujo agregado del panel `/admin` que sí dependía del
> bypass por fila, conviértelo en una consulta agregada (ver M3) en vez de
> debilitar el guard.

### 5.4 Acciones de sesión (Capa actions/services)

- `iniciarSoporte(ctx, { escuelaId, motivo, soloLectura })`:
  `requireRole(ctx, ["SUPER_ADMIN"])`, valida con Zod, cierra cualquier sesión
  abierta previa del mismo súper admin, crea `SoporteSesion`, y registra
  `AuditLog` (`accion: "INICIAR_SOPORTE"`, `escuelaId`, `motivo`).
- `finalizarSoporte(ctx)`: marca `finalizadaEn = now()` y audita
  (`"FINALIZAR_SOPORTE"`).
- Pasar de solo-lectura a escritura **crea una nueva** entrada de auditoría
  (`"SOPORTE_HABILITA_ESCRITURA"`) con motivo; no es un toggle silencioso.

### 5.5 UI (banner imposible de ignorar)

Mientras `ctx.soporte` esté activo, el layout debe mostrar un banner fijo y
llamativo: **"MODO SOPORTE · Escuela {nombre} · {solo lectura|escritura} ·
Finalizar"**. El botón "Finalizar" llama a `finalizarSoporte`. Usa el sistema de
design tokens existente; que sea visualmente distinto del chrome normal.

**Criterios de aceptación M2:**
- [ ] Súper admin **sin** sesión de soporte → no puede leer/editar datos de un
      tenant concreto (lanza `ForbiddenError`); sí ve dashboards agregados.
- [ ] Con sesión activa → solo accede a **esa** escuela; otra lanza
      `TenantMismatchError`.
- [ ] Por defecto la sesión es solo-lectura; escribir requiere habilitarlo y
      queda auditado.
- [ ] Inicio/fin/escritura quedan en `AuditLog`.
- [ ] Banner visible durante toda la sesión.
- [ ] Tests de `assertTenant`/`assertSoportePuedeEscribir` cubren los 4 casos.

---

## 6. Milestone M3 — Dashboard de salud (agregado, no microgestión)

El panel principal del súper admin muestra el estado de la **plataforma**, no el
detalle de un tenant. Todas las consultas son **agregadas y cross-tenant** (no
pasan por `assertTenant`). Implementa un repositorio nuevo
`src/repositories/admin-metrics.repository.ts` con funciones que devuelvan estos
números, y un dashboard que los pinte como tarjetas.

Tarjetas y su fuente de datos:

| Tarjeta | Cálculo |
|---|---|
| Escuelas activas / inactivas | `count` de `Escuela` por `activa` |
| Altas de escuelas (30 días) | `count` de `Escuela` con `createdAt >= hoy-30d` |
| Leads por estado | `groupBy` de `Lead` por estado (pipeline) |
| Jugadores totales / activos | `count` de `Jugador` (total y por `estado`) |
| Evaluaciones (30 días) | `count` de `Evaluacion` con `fecha >= hoy-30d` |
| Morosidad | escuelas/jugadores con `Membresia` impaga del período actual |
| Eventos próximos (7 días) | `count` de `Evento` con `inicio` en la ventana |
| Acciones de soporte (7 días) | `count` de `AuditLog` con `accion LIKE 'SOPORTE%'` |
| Últimas acciones sensibles | `listarAuditGlobal({ take: 20 })` |

Reglas del dashboard:
- **Solo lectura y solo agregados.** Ningún botón que edite un recurso de un
  tenant desde aquí. Para bajar al detalle de una escuela, el único camino es
  abrir una **sesión de soporte** (M2).
- Para drill-down por escuela, muestra una lista de escuelas con sus métricas y un
  botón **"Entrar en soporte"** que inicia la sesión (pide motivo).

**Criterio de aceptación M3:** el dashboard carga métricas agregadas sin abrir
ninguna sesión de soporte, y no expone ninguna acción de escritura sobre datos de
un tenant.

---

## 7. Milestone M4 (futuro) — RBAC preparado para partir el rol

Hoy `SUPER_ADMIN` es monolítico y está bien para un operador único. Pero el diseño
debe anticipar separar responsabilidades sin reescribir todo:

- Define un mapa de **permisos** (no solo roles): p. ej.
  `GESTIONAR_ESCUELAS`, `EDITAR_PARAMETROS_GLOBALES`, `VER_FACTURACION`,
  `SOPORTE_TENANT`, `VER_AUDITORIA`.
- Hoy `SUPER_ADMIN` tiene todos los permisos. Mañana podrás crear roles acotados
  (`SOPORTE`, `FACTURACION`) que tengan un subconjunto, sin tocar la lógica de
  cada acción si esta consulta permisos en vez del rol literal.
- No implementes los roles nuevos ahora; **sí** introduce la indirección
  "acción → permiso requerido" para no atarte al string `"SUPER_ADMIN"` en cada
  guard.

---

## 8. Guardrails (no romper)

- No quites poder real al súper admin: lo encauzas, no lo castras. Con sesión de
  soporte puede hacer todo lo que antes hacía.
- No debilites `assertTenant` para "arreglar" un flujo agregado: si algo agregado
  fallaba, conviértelo en consulta agregada (M3).
- Acciones globales destructivas (suspender escuela, editar parámetros de fórmula
  que afectan a TODAS las cartas, borrados de habeas data) → doble confirmación +
  `motivo` obligatorio + `AuditLog`. Los snapshots inmutables y `versionFormula`
  ya protegen los históricos: mantenlos.
- Todo lo nuevo respeta la arquitectura por capas
  (`actions → services → repositories`) y valida entradas con Zod.

---

## 9. Orden de implementación recomendado

1. **M1** (auditoría obligatoria del cruce) — bajo riesgo, alto valor inmediato.
2. **M3** (dashboard agregado) — desacopla "ver la plataforma" de "tocar un tenant".
3. **M2** (modo soporte) — cierra el bypass; depende de que M3 ya cubra lo agregado.
4. **M4** (RBAC por permisos) — cuando vayas a sumar personas al equipo.
