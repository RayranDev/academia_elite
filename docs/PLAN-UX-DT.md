# 🎯 PLAN-UX-DT — Modos de Sesión, correcciones DT, Escuela y Exportables
### Documento único: qué construir + cómo construirlo, sprint por sprint

> **Para el modelo/desarrollador ejecutor:** implementa UN sprint (PR) a la vez, en orden. No avances al siguiente sin `npm run typecheck && npm test && npm run test:e2e` en verde. Cada sección contiene la especificación UX y su guía técnica juntas.

---

## Reglas obligatorias del proyecto (aplican a TODO el documento)

1. **El estilo visual actual NO se toca:** design tokens, `PlayerCard`, tipografía display, colores. Esto es re-orquestación de flujos, no rediseño estético. Reutilizar `Button`, `Card`, `Badge`, `Modal`, `EmptyState` de `src/components/ui/`.
2. **Capas con dependencias solo hacia abajo:** `app|components → actions → services → repositories → prisma`. Un componente JAMÁS importa de `@/repositories` ni usa Prisma. Una action JAMÁS contiene lógica de negocio: valida (Zod), autentica, autoriza y delega al service.
3. **Contrato de actions:** `ActionResult<T>` de `src/lib/action-result.ts` con `mapError(e)` en el catch. Excepción: actions llamadas por `<form action=...>` sin `useActionState` pueden ser `Promise<void>` (patrón existente en `evento.actions.ts`).
4. **Scope DT:** toda función de service para DT valida con `categoriasDelDt(ctx)` de `src/services/dt-scope.ts` que el evento/jugador pertenezca a sus categorías. Copiar el patrón EXACTO de `pasarListaDt` (línea ~286 de `src/services/evento.service.ts`).
5. **Nombres en español** siguiendo el estilo del repo (`marcarAsistenciaAction`, no `markAttendanceAction`).
6. **Contexto de uso del DT:** en cancha, de pie, con una mano, sol en pantalla, señal irregular. Targets táctiles ≥ 44×44px, guardado optimista, nada depende de hover ni drag.
7. **`revalidatePath`** tras cada mutación que afecte una página server-rendered. Test unitario por service nuevo; 1 spec Playwright por flujo nuevo.

**Concepto central del plan:** hoy el evento es una página de secciones que el DT recorre. Se reemplaza por un **flujo guiado** según tipo de evento:

```
ENTRENAMIENTO                        PARTIDO
1. Llamado a lista                   1. Llamado a lista
2. Sesión en vivo                    2. Partido en vivo
   · cronómetro + bloques               · marcador con goles ±
   · observaciones por jugador          · stats por jugador en caliente
3. Cierre (resumen + nota + guardar) 3. Cierre (revisión stats + confirmar → notifica familias)
```

Ambos modos comparten el paso 1 y el patrón de cierre → es **UN componente** `ModoSesion` configurable, no dos features.

---

# PR-1 — Backend de los Modos (sin UI) 🔩

**Objetivo:** modelo de datos, repositorios, services y tests de todo lo que los modos necesitan. Termina con la suite unitaria en verde y CERO cambios visibles.

## 1.1 Migración Prisma (`prisma/schema.prisma`)

```prisma
// --- Modelo Asistencia (línea ~319): AGREGAR campos, no quitar ninguno ---
model Asistencia {
  id        String  @id @default(cuid())
  escuelaId String
  eventoId  String
  evento    Evento  @relation(fields: [eventoId], references: [id])
  jugadorId String
  jugador   Jugador @relation(fields: [jugadorId], references: [id])
  presente  Boolean
  // NUEVOS:
  justificado      Boolean   @default(false)
  llegoTarde       Boolean   @default(false)
  salioAntes       Boolean   @default(false)
  agregadoEnCancha Boolean   @default(false)
  marcadoAt        DateTime?
  corregidoAt      DateTime?
  corregidoPorId   String?

  @@unique([eventoId, jugadorId])
  @@index([escuelaId, jugadorId])
}

// --- Modelo Evento (línea ~261): AGREGAR ---
  sesionIniciadaAt DateTime?   // cronómetro: cuándo el DT arrancó el modo
  sesionCerradaAt  DateTime?   // cierre confirmado
  notaSesion       String?     // nota general del paso de cierre

// --- Modelo NUEVO (después de Asistencia) ---
model ObservacionJugador {
  id           String   @id @default(cuid())
  escuelaId    String
  jugadorId    String
  jugador      Jugador  @relation(fields: [jugadorId], references: [id])
  entrenadorId String
  eventoId     String?
  texto        String            // máx 500 (validar en Zod, no en schema)
  visiblePadre Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([escuelaId, jugadorId, createdAt])
  @@index([eventoId])
}
```

Agregar relación inversa `observaciones ObservacionJugador[]` en `model Jugador`.
Comando local: `npx prisma migrate dev --name modos_sesion_asistencia_viva` · Producción: `prisma migrate deploy`.

**Semántica de estado (agregar a `DECISIONES.md`):** el estado UI de 3 posiciones mapea a — Presente = `{presente:true, justificado:false}` · Ausente = `{presente:false, justificado:false}` · Justificado = `{presente:false, justificado:true}`. `llegoTarde`/`salioAntes` son modificadores de Presente.

## 1.2 Repositories

En el repository de asistencia existente (donde vive `registrarAsistencias`), AGREGAR:

```ts
/** Upsert de UNA marca de asistencia (guardado optimista por toque). */
export async function upsertAsistencia(
  escuelaId: string,
  eventoId: string,
  jugadorId: string,
  data: {
    presente: boolean;
    justificado: boolean;
    llegoTarde?: boolean;
    salioAntes?: boolean;
    agregadoEnCancha?: boolean;
    esCorreccion?: boolean;      // true si el evento ya estaba cerrado
    corregidoPorId?: string;
  },
): Promise<void> {
  const { esCorreccion, corregidoPorId, ...campos } = data;
  await prisma.asistencia.upsert({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    create: { escuelaId, eventoId, jugadorId, ...campos, marcadoAt: new Date() },
    update: {
      ...campos,
      ...(esCorreccion
        ? { corregidoAt: new Date(), corregidoPorId }
        : { marcadoAt: new Date() }),
    },
  });
}
```

Nuevo `src/repositories/observacion.repository.ts`: `crearObservacion`, `listarObservacionesDeJugador(escuelaId, jugadorId, { soloVisiblesPadre? })`, `listarObservacionesDeEvento(escuelaId, eventoId)`. Solo llamadas Prisma, sin lógica.

## 1.3 Service nuevo: `src/services/sesion.service.ts`

Todas las funciones reciben `ctx: AuthContext` primero. Helper compartido:

```ts
/** Verifica que el evento exista y pertenezca a una categoría del DT. Reusar en TODAS las funciones. */
async function eventoDelDt(ctx: AuthContext, eventoId: string) {
  const { escuelaId, categoriaIds, entrenadorId } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId); // repo existente
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  return { evento: e, escuelaId, entrenadorId };
}
```

Funciones a implementar (firmas y reglas):

- `marcarAsistenciaUnitaria(ctx, { eventoId, jugadorId, estado: "PRESENTE"|"AUSENTE"|"JUSTIFICADO", llegoTarde?, salioAntes? })` → mapear estado según §1.1 → `upsertAsistencia` con `esCorreccion = !!evento.sesionCerradaAt`.
- `iniciarSesion(ctx, eventoId)` → set `sesionIniciadaAt = now()` SOLO si es null (re-entrar no resetea el cronómetro).
- `cerrarSesion(ctx, { eventoId, notaSesion? })` → set `sesionCerradaAt + notaSesion`. Si `tipo === "PARTIDO"` y hay resultado en vivo, **AQUÍ y solo aquí** disparar el pipeline existente de noticia + notificación de `cargarResultadoDt` (extraer esa parte a una función interna reutilizable — no duplicar). La notificación masiva a familias sale UNA vez, al cierre, nunca por gol en caliente.
- `agregarConvocadoEnCancha(ctx, { eventoId, jugadorId })` → validar jugador ∈ MISMA categoría del evento; crear `JugadorConvocado` si no existe + `upsertAsistencia(presente:true, agregadoEnCancha:true)`.
- `crearObservacion(ctx, { jugadorId, eventoId?, texto, visiblePadre })` → validar jugador ∈ categorías del DT.
- `registrarGolVivo(ctx, { eventoId, anotadorId?, asistenteId?, esRival, delta: 1|-1 })` → **transacción:** actualizar `resultadoLocal/Visitante` (respetando `esLocal` para saber qué lado es "mi equipo") y, si `!esRival && anotadorId`, upsert de goles (y asistencias) en `EstadisticaPartido`. `delta:-1` (deshacer) decrementa sin bajar de 0. Devuelve `{ local, visitante }`. NO notifica.
- `marcarTarjeta(ctx, { eventoId, jugadorId, tipo: "AMARILLA"|"ROJA" })` → upsert `EstadisticaPartido`: AMARILLA → `min(amarillas+1, 2)`; ROJA → `roja = true`.

## 1.4 Tests unitarios (cierran el PR)

- Mapeo correcto de los 3 estados de asistencia.
- Corrección post-cierre setea `corregidoAt` (no `marcadoAt`) y guarda autor.
- `registrarGolVivo` con delta -1 no baja de 0 y revierte la stat individual.
- `agregarConvocadoEnCancha` rechaza jugador de otra categoría.
- `cerrarSesion` de PARTIDO dispara exactamente UNA notificación aunque hubo 5 goles en vivo.
- `iniciarSesion` dos veces no cambia `sesionIniciadaAt`.

---

# PR-2 — Quick wins visibles ⚡ (Sprint UX-1)

**Objetivo:** correcciones de alto impacto y bajo riesgo detectadas en la auditoría del código actual. Sin dependencia de PR-1 salvo B1 (parcial).

| Fix | Problema detectado | Archivo y cambio exacto |
|---|---|---|
| **B4 🔴 primero (1h)** | "Cancelar evento" notifica a todas las familias con 1 toque, sin confirmación | `src/app/dt/eventos/[id]/page.tsx` L88-95: extraer el `<form>` a client component `CancelarEventoButton.tsx` que abre el `Modal` existente con texto "Se notificará a {ev.convocados.length} familias." + botón destructivo. Recién ahí submit |
| **B1 🔴 Home "Hoy"** | El DT aterriza en Plantilla; el KPI "Evaluaciones vencidas" ni siquiera es clickeable — y es su to-do principal | Reescribir `src/app/dt/page.tsx`: **sección 1** = evento de hoy (`listarEventosDt` filtrado a hoy; si `!sesionCerradaAt` → `<Link href={`/dt/eventos/${id}/sesion`}><Button size="lg">▶ Iniciar {tipo}</Button></Link>` — el link queda listo aunque la ruta llegue en PR-3); **sección 2** = evaluaciones vencidas como lista accionable con botón "Evaluar →" a `/dt/jugadores/[id]/evaluar`; **sección 3** = solicitudes. Mover el grid actual a nueva ruta `/dt/plantilla/page.tsx` y actualizar el nav en `dt/layout.tsx` (agregar ítem "Hoy" con icono `inicio`, "Plantilla" apunta a la nueva ruta) |
| **B6 🟠 Tab bar móvil** | El desplegable móvil esconde todo; el pulgar no llega arriba | Nuevo `src/components/shell/TabBarMovil.tsx`: `fixed bottom-0 inset-x-0 md:hidden`, 4 ítems (Hoy · Plantilla · Calendario · Mensajes) + "Más" que abre el desplegable actual. `PanelShell` lo renderiza solo si `rol === "DT"`. Agregar `pb-16 md:pb-0` al `<main>` del shell para que no tape contenido |
| **C2.1 🔴 KPIs escuela clickeables** | En `src/app/escuela/page.tsx` los KPIs informan pero no navegan ("Evals vencidas: 12" → ¿cuáles?) | Envolver cada `<Kpi>` con valor > 0 en `<Link>` a la lista filtrada (el `Kpi` del DT ya tiene el patrón `href`) |
| **C2.3 🔴 Fila "Administración"** | El dashboard escuela es 100% deportivo; membresías/mora no existen para el dueño | En `src/app/escuela/page.tsx` agregar sección "Administración": Cuotas al día / Pendientes / Vencidas / Bloqueados — cada KPI clickeable a `/escuela/membresias` filtrado. Crear `resumenMembresias(ctx)` en `src/services/membresia.service.ts` (contadores por estado, un solo query con `groupBy`) |
| **B7 🟡** | El chip "Vencidas" de `PlantillaGrid` filtra pero cada carta no ofrece acción | En `src/components/dt/PlantillaGrid.tsx`: cuando `filtro === "VENCIDAS"`, overlay con botón "Evaluar →" (deep-link a `/dt/jugadores/[id]/evaluar`) sobre cada carta |
| **Bug texto** | En `EvaluationForm.tsx` la etiqueta dice "Observaciones privadas (visibles solo para el padre y el DT)" — "privadas" pero visibles al padre es contradictorio | Decidir semántica y alinear: sugerido "Observaciones para la familia (las verá el acudiente)" |

---

# PR-3 — Modo Sesión: esqueleto + Lista Viva + Modo ENTRENAMIENTO 🏃

**Objetivo:** la ruta full-screen, el paso de lista compartido con guardado optimista, cronómetro, observaciones y cierre. Al terminar, el modo ENTRENAMIENTO está completo.

## 3.1 Actions (`src/actions/sesion.actions.ts` — NUEVO)

Patrón que fija el estilo (las demás lo copian). ⚠️ Estas actions reciben **objeto tipado**, no FormData — se invocan desde componentes cliente con `startTransition`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import * as sesion from "@/services/sesion.service";

const marcarSchema = z.object({
  eventoId: z.string().min(1),
  jugadorId: z.string().min(1),
  estado: z.enum(["PRESENTE", "AUSENTE", "JUSTIFICADO"]),
  llegoTarde: z.boolean().optional(),
  salioAntes: z.boolean().optional(),
});

export async function marcarAsistenciaAction(
  input: z.infer<typeof marcarSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = marcarSchema.parse(input);
    await sesion.marcarAsistenciaUnitaria(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
```

Crear igual: `iniciarSesionAction`, `cerrarSesionAction`, `agregarConvocadoAction`, `crearObservacionAction` (Zod: texto 1..500), `registrarGolAction`, `marcarTarjetaAction` (estas dos últimas se consumen en PR-4 pero se crean ya).

## 3.2 Ruta full-screen

- `src/app/dt/eventos/[id]/sesion/page.tsx` (server): carga `obtenerDetalleEventoDt` + plantilla de la categoría (para "agregar en cancha") y renderiza `<ModoSesion evento={...} plantillaCategoria={...} />`.
- **Sin sidebar ni header:** `src/app/dt/eventos/[id]/sesion/layout.tsx` que devuelva solo `{children}` con `bg-background min-h-dvh`. El guard de rol del layout padre sigue aplicando. Si `PanelShell` envuelve inevitablemente, alternativa: prop `chrome="none"` en `PanelShell` activada por esta ruta.
- Barra superior mínima: nombre del evento, `<Cronometro/>`, botón "Salir" (`router.push` al detalle — los datos ya están guardados por toque, **salir nunca pierde nada**).

## 3.3 Componentes (todos en `src/components/dt/sesion/`)

| Componente | Tipo | Especificación |
|---|---|---|
| `ModoSesion.tsx` | client | Máquina de pasos `"LISTA" → "VIVO" → "CIERRE"` con `useState`. Botón "👥 Lista" siempre visible en la barra durante VIVO → vuelve al paso LISTA y regresa (la lista **nunca se congela**) |
| `ListaViva.tsx` | client | Fila por convocado ≥ 56px de alto (avatar + nombre `text-base font-semibold`). **Un toque cicla:** ✅ Presente → ❌ Ausente → 📝 Justificado → ✅. Long-press (`onPointerDown/Up` + timer 500ms) abre `BottomSheet` con "Llegó tarde" / "Se retiró antes". Contador vivo "14/18 presentes". Buscador "+ Agregar jugador" al pie (grilla de la plantilla de la categoría → `agregarConvocadoAction`, marca `agregadoEnCancha`). **Pre-llenado:** confirmación del padre CONFIRMADO → arranca ✅ tentativo (borde punteado hasta que el DT lo toque); RECHAZADO → arranca 📝. Botón "Continuar →" no bloquea (se puede seguir con lista incompleta) |
| `useAsistenciaOptimista.ts` | hook | `Map<jugadorId, Estado>` local; al toque: actualiza UI YA + push a cola; la cola procesa en serie llamando `marcarAsistenciaAction`; en `{ok:false}` o throw → backoff 1s/3s/8s y queda pendiente; expone `pendientes: number` para chip "↻ N sin sincronizar". Persistir la cola en `sessionStorage` para sobrevivir un refresh |
| `Cronometro.tsx` | client | Deriva de `sesionIniciadaAt` (server): `Date.now() - inicio`, `setInterval` 1s, formato `mm:ss` con clase `tabular`. Local, no requiere red |
| `SesionVivo.tsx` | client | Modo ENTRENAMIENTO: cronómetro grande arriba + grilla de avatares de presentes; tocar uno abre `ObservacionSheet`. Si el evento tiene bloques planificados (futuro Fase 3 del plan maestro), mostrarlos con "Siguiente bloque →"; sin bloques: botón "＋ Anotar bloque" (texto libre) |
| `ObservacionSheet.tsx` | client | BottomSheet: **chips de 1 toque** que rellenan el textarea (constante local `CHIPS_OBSERVACION = ["💪 Gran actitud", "🎯 Mejoró el perfil débil", "😓 Desconcentrado", "🤝 Buen compañero"]`), toggle "visible para el padre" (default OFF), guardar → `crearObservacionAction` → toast → vuelve. Objetivo: observación completa en ≤ 5 s |
| `CierreSesion.tsx` | client | Resumen: asistencia final (con tardes/retiros), observaciones hechas, campo "Nota general" opcional → botón único "Confirmar y guardar" → `cerrarSesionAction` → `router.push` al detalle. Tras cerrar, el detalle del evento ofrece "Editar asistencia" (reabre `ListaViva`; las correcciones quedan con `corregidoAt` + autor, visibles como "editado") |
| `src/components/ui/BottomSheet.tsx` | client, NUEVO genérico | Overlay `fixed inset-0 bg-black/50` + panel `fixed bottom-0 inset-x-0 rounded-t-2xl bg-surface p-4 pb-[env(safe-area-inset-bottom)]`, cierre por overlay/Escape, `role="dialog" aria-modal`. Sin librerías nuevas; copiar el manejo de foco de `Modal.tsx` |

## 3.4 Entrada al modo

Botón hero "▶ Iniciar entrenamiento/partido" (verde, ancho completo) en el home "Hoy" (ya creado en PR-2) y arriba del detalle del evento. Al entrar por primera vez llama `iniciarSesionAction`.

## 3.5 E2E que cierran el PR

- `sesion-entrenamiento.spec.ts`: login DT demo → Hoy → Iniciar → marcar 3 asistencias (verificar persistencia con reload) → observación con chip → cierre → detalle muestra nota.
- `asistencia-correccion.spec.ts`: con evento cerrado → Editar asistencia → cambiar un estado → detalle muestra "editado".

**Criterios de aceptación:** lista de 18 en ≤ 25 s sin submits · corte de red encola y sincroniza al volver · "llegó tarde"/"se retiró"/"agregado en cancha" visibles en el detalle · targets ≥ 44px · observación con chip ≤ 5 s.

---

# PR-4 — Modo PARTIDO ⚽🔥

**Objetivo:** marcador en vivo que alimenta las stats individuales y elimina la tabla de 7 columnas.

## 4.1 `PartidoVivo.tsx` (`src/components/dt/sesion/`)

1. **Marcador arriba, enorme:** `[Mi equipo] 2 — 1 [Rival]` (tabular, respetando `esLocal` para el orden) con botones ± bajo cada lado.
2. **Gol propio (+):** `BottomSheet` "¿Quién anotó?" (grilla de presentes + "Sin registrar") → paso opcional "¿Asistencia?" → `registrarGolAction({ anotadorId, asistenteId, esRival:false, delta:1 })` → actualizar marcador con la respuesta `{local, visitante}`. **El gol alimenta marcador Y stat individual a la vez** — los datos nacen del juego, no de una planilla posterior.
3. **Deshacer (−):** sheet con los últimos goles propios registrados para elegir cuál revertir (`delta:-1` con ese `anotadorId`). Gol rival: ± directo sin sheet.
4. **Acciones rápidas por jugador** (tocar avatar): 🟨 amarilla · 🟥 roja (→ `marcarTarjetaAction`) · 📝 observación (mismo `ObservacionSheet`).
5. Cronómetro con períodos: default 2 tiempos con botón "Fin del 1er tiempo" (configuración por categoría queda para v2).

## 4.2 Cierre de partido (`CierreSesion` extendido)

El paso de cierre muestra la **tabla-resumen por jugador EDITABLE con steppers − / +** (min/goles/asist/tarjetas) — para corregir o para el DT que prefiere cargar todo al final. Reusar la lógica de `cargarEstadisticasAction` existente con el mismo shape de FormData. La planilla actual de 7 columnas del detalle del evento **se elimina**: este paso de revisión la reemplaza. Confirmar cierre → pipeline existente: resultado guardado, noticia del club, **UNA** notificación a familias (regla del PR-1).

## 4.3 E2E que cierra el PR

`sesion-partido.spec.ts`: iniciar partido → 2 goles con anotador → 1 amarilla → deshacer 1 gol → cierre → resultado 1-0 en detalle → **exactamente 1** notificación para el padre demo.

---

# PR-5 — Exportables + form de evaluación 📊

## 5.1 Exportables nuevos (auditoría del panel Escuela)

**Estado actual:** existen jugadores/evaluaciones/auditoría con `protegerCelda()` (anti-inyección de fórmulas — MANTENER OBLIGATORIO en todo export nuevo; agregar como regla a `AGENTS.md`). Copiar el patrón EXACTO de `src/services/export-jugadores.service.ts` (ExcelJS + `XLSX_MIME` + filename con fecha + cabecera bold).

| Export | Service + route | Columnas / detalle |
|---|---|---|
| **Membresías/Mora 🔴** | `export-membresias.service.ts` + `api/membresias-export/route.ts` | Jugador, categoría, familia, email, teléfono, período, estado cuota, días de vencida, bloqueado S/N. Query params `?estado=&periodo=`. Fila TOTAL al pie en bold. Es el export que el dueño usa para llamar a cobrar |
| **Asistencia 🔴** | `export-asistencia.service.ts` + `api/asistencia-export/route.ts` | Una hoja por categoría (`wb.addWorksheet(categoria.nombre)`); matriz jugador × fecha con `P/A/J/T` (T = presente + llegoTarde, dato que nace en PR-3) + columna `%` por jugador y fila `%` por sesión |
| **Contactos/Nómina 🟠** | `export-contactos.service.ts` + route | Jugador, nacimiento, categoría, acudiente, parentesco, teléfono, email. Para ligas/federación y emergencias |
| **Resultados 🟡** | después de PR-4 sale casi gratis | Hoja 1: fecha, rival, local/visita, marcador · Hoja 2: stats individuales |

**Regla nueva de auditoría (aplicar también retroactivamente a los 3 exports existentes):** al inicio de cada route, tras autorizar: `await registrarAuditoria(ctx, "EXPORT_<TIPO>", { escuelaId, filtros })` con `src/services/audit.service.ts` — los exports descargan datos de menores.
**Ubicación del botón:** en la pantalla del dato (Membresías exporta desde Membresías, Asistencia desde Asistencia), como `<a href="/api/...">` igual al "Descargar jugadores" actual. Roles: ESCUELA_ADMIN (su tenant) y SUPER_ADMIN (`?escuelaId=`).

## 5.2 Pulido Escuela restante

- **C2.2:** `src/app/escuela/membresias/page.tsx` carga `listarJugadoresGestion(limit: 10000)` en un selector → reemplazar por buscador con autocomplete (patrón de búsqueda de `PlantillaGrid`) y paginar el panel.
- **C2.4:** agrupar el sidebar escuela (11 ítems planos) en 3 secciones visuales: **Deportivo** (categorías, ranking, asistencia) · **Administración** (membresías, jugadores, DTs, códigos) · **Club** (anuncios, branding, sedes, cuenta). Solo headers visuales en `Sidebar.tsx`, sin cambiar rutas.
- **C2.5:** vista de asistencia escuela como matriz mes × categoría con % y semáforo; click → detalle.

## 5.3 B5 — Botonera 1–10 en evaluación

`src/components/dt/EvaluationForm.tsx`: reemplazar `<Nota/>` (input numérico con default 5, que permite evaluar "todo 5" sin pensar) por **10 botones** `min-w-11 min-h-11` en `flex flex-wrap gap-1`, estado `useState<number|null>(null)` — **sin valor precargado**, elección consciente por nota. Mantener `<input type="hidden">` con el valor para NO tocar `crearEvaluacionAction`. Submit deshabilitado hasta que las 8 notas tengan valor. Medias (`.5`): verificar primero en `src/lib/stats-engine` si el rango las exige; si no, aceptar solo enteros. Las 4 pruebas físicas quedan numéricas (son medidas reales). **La revelación de la carta con confetti no se toca.** ✅

---

## Resumen de secuencia

```
PR-1  Backend modos (migración+repos+services+tests)   — sin UI, todo verde
PR-2  Quick wins (B4→B1→B6→C2.1/C2.3→B7)               — impacto visible inmediato
PR-3  ModoSesion + ListaViva + ENTRENAMIENTO + E2E     
PR-4  PARTIDO en vivo + cierre con steppers + E2E      
PR-5  Exportables auditados + pulido escuela + B5      
```

Cada PR cierra con `npm run typecheck && npm test && npm run test:e2e` en verde. Si el implementador se desvía, devolverlo a la sección exacta (PR-n §x.y) en vez de re-explicar.
