# Plan de Mejoras 5 — Roadmap del Backlog

> Síntesis ejecutable de `NUEVOS-REQUERIMIENTOS.md` y los dos análisis arquitectónicos
> del backlog. Cada ítem se ejecuta después como un cambio acotado, con sus tests, en
> el orden de sprints de abajo.

## Regla de oro

**Funcionalidad deseada ≠ implementación propuesta.** El análisis arquitectónico es un
**gate obligatorio** antes de codear cualquier ítem. Todo respeta `AGENTS.md` (§4 capas,
§5 seguridad multi-tenant, §6 convenciones), pasa el test guardián de aislamiento
(`tests/unit/aislamiento-tenant.test.ts`) y el code-review de pre-commit.

> Ejemplo de la regla: el backlog pide un "CRUD global" para que el SUPER_ADMIN edite
> datos de cualquier escuela. La implementación **correcta** no es un CRUD ambiental,
> sino la **sesión de soporte auditada** que ya existe (ver más abajo).

## Decisiones de producto (tomadas)

1. **Registro (#3):** auto-login al dashboard tras registrarse con un código válido — la
   familia ya viene pre-autorizada por el código que emitió la escuela.
2. **IDs (#6):** se mantiene `cuid()` como clave primaria (ya es no-secuencial y
   no-enumerable; migrar a UUID no aporta seguridad y es carísimo). Se **agrega** un
   código humano de referencia `@unique` (`ESC-0001`, `JUG-7F4A`) para soporte.
3. **Vista jugador (#7):** hub *card-first* (la carta EA FC es la protagonista) con la
   navegación de gestión accesible pero secundaria. Una sola cuenta familia, revelación
   progresiva visual.
4. **CRM de Leads (#2):** Sprint 2.

## Estado actual (sobre esto se construye)

| Ítem | Hoy | Falta |
|---|---|---|
| #4 Notificaciones | **~90% hecho**: modelo `Notificacion`, `notificacion.service`, campana `NotificacionesMenu` en `PanelShell` | `prioridad`, deep-links, verificar los 4 roles |
| #1 CRUD escuelas | solo `convertirLeadEnEscuela` (vía lead) | alta directa + admin inicial |
| #2 Leads | `Lead` básico (4 estados) + `lead.service` | mini-CRM |
| #5 Title Case | `validators/sanitizar.ts` (XSS) | utilidad `formatearNombre` |
| #6 IDs | `cuid()` + códigos únicos (`slug`, `codigoJugador`) | código humano de referencia |
| #7 Vista jugador | hub con carta + nav de 8 ítems | rediseño card-first |
| #8 Foto | upload + crop (EXIF strip, WebP, API protegida) | cámara `getUserMedia` + silueta |

**Ya disponible y reutilizable:** la **sesión de soporte** del SUPER_ADMIN (auditada,
solo-lectura por defecto, `assertTenant` gobernado) y el sistema de **permisos**
(`requirePermiso`). Los análisis citan exactamente este modelo como la forma correcta
del acceso del SA a un tenant — no hay que construirlo, ya existe.

---

## Sprint 1 — Infraestructura transversal

### #1 · Alta directa de escuelas (SUPER_ADMIN)

- **Permitido directo:** crear escuela, crear el `ESCUELA_ADMIN` inicial, suspender/
  reactivar, datos institucionales, licencias.
- **NO permitido directo:** crear jugadores, editar evaluaciones u otros datos internos
  de un tenant → **solo por sesión de soporte** (ya construida).
- **Implementación:** extraer la transacción de `convertirLeadEnEscuela` a un repositorio
  `crearEscuelaConAdmin(...)` en `escuela.repository.ts` (escuela + admin inicial +
  `AuditLog`, atómico). Esto **además paga la deuda de capas §4** (hoy el `$transaction`
  vive en el servicio). Nuevo `crearEscuelaDirecta(ctx, input)` con
  `requirePermiso(ctx, "GESTIONAR_ESCUELAS")` + Zod, que reutiliza ese repo; el flujo de
  conversión de lead pasa a usarlo también. UI: dialog "Nueva escuela" en `/admin/escuelas`.

### #4 · Notificaciones (pulido)

- Agregar `prioridad` (`baja|media|alta|critica`) al modelo y al DTO.
- Verificar la campana en el shell de los 4 roles y que los deep-links (`url`) resuelvan.
- Reutiliza `notificar()`, `listarMisNotificaciones()`, `contarMisNoLeidas()`.

### #3 · Registro con auto-login

- Tras crear la cuenta en `registrarConCodigoAction`, llamar a `signIn` (Auth.js) y
  redirigir al hub. Pantalla de transición mínima solo si el auto-login no es inmediato.

### #5 · `formatearNombre` (Title Case, punto único de verdad)

- Nueva utilidad `src/lib/texto/formatear-nombre.ts` que maneje artículos (`de la`),
  prefijos (`Mc`), apóstrofes (`O'Connor`) y partículas (`von`), con tests unitarios.
- Aplicarla como **transform de Zod** en los validators de nombres + importación Excel +
  seed. No duplicar la lógica en Prisma.

## Sprint 2 — Features de negocio

### #2 · CRM de Leads

- Expandir `Lead` (`origen`, `responsableId`, `proximaAccion`, `fechaProximoContacto`,
  `observaciones`) y llevar `estado` a los 11 estados del funnel. Nuevo modelo `LeadNota`
  (historial de seguimiento). Migración.
- `lead.repository` + `lead.service`: listar con filtros, detalle, notas, cambiar
  estado/responsable. Gate `requirePermiso(ctx, "GESTIONAR_LEADS")`.
- UI: tabla mejorada + detalle con timeline de notas en `/admin/leads`.

### #7 · Vista jugador *card-first*

- Rediseñar `/jugador`: la carta como protagonista a pantalla, `[Descargar] [Compartir]`
  y un mini-historial de OVR. La navegación de gestión pasa a secundaria/colapsada.
  Reutiliza `obtenerHub`. Sin modos separados niño/familia.

### #6 · Códigos humanos de referencia

- `codigoRef String? @unique` en `Escuela` (`ESC-0001`) y `Jugador` (`JUG-7F4A`),
  generado de forma inmutable al crear (helper junto a `src/lib/codes.ts`). Migración +
  backfill. Mostrar en fichas/soporte y permitir búsqueda. No es PK, no toca foreign keys.

## Sprint 3 — Experiencia visual avanzada

### #8 · Cámara con silueta (MVP)

- Componente cliente de captura (`getUserMedia` + `<video>` + overlay SVG de
  cabeza/hombros + guía de luz), integrado al pipeline existente de foto
  (crop → EXIF strip → WebP → servir por API protegida).
- **Remoción de fondo = fase posterior.** Por tratarse de fotos de menores: priorizar
  procesamiento local; nunca enviar a una API externa sin decisión explícita
  (ver `HABEAS-DATA.md`). Se deja anotado, no se implementa en este sprint.

---

## Reutilización clave (no reinventar)

| Necesidad | Reutilizar |
|---|---|
| Transacción crear escuela | extraer de `escuela.service::convertirLeadEnEscuela` a repo |
| Gates del SUPER_ADMIN | `requirePermiso(ctx, …)` + mapa de permisos |
| Tocar datos de un tenant | sesión de soporte (`soporte.service`, `assertTenant`) |
| Notificaciones | `notificacion.service` + `NotificacionesMenu` |
| Sanitizar/transformar texto | patrón de `validators/sanitizar.ts` + `Zod .transform` |
| Generar códigos | patrón de `src/lib/codes.ts` |
| Pipeline de foto | `foto.service` + `FotoCropper`/`FotoConsentimiento` |

## Convenciones (gate por ítem)

- Capas estrictas `actions → services → repositories → prisma`; ningún `db.*` fuera de repos.
- Multi-tenant: toda query de repo filtra por `escuelaId` o se marca `// tenant-global:`
  con su razón (lo verifica el test guardián).
- Zod en la frontera, DTOs planos, español de dominio, kebab-case.
- Cada milestone: `npm run typecheck` + `npm test` + `npm run test:e2e` en verde.

## Referencias

- `NUEVOS-REQUERIMIENTOS.md` — backlog crudo (8 ítems).
- `AGENTS.md` — §4 capas, §5 seguridad/multi-tenant/sesión de soporte, §6 convenciones.
- `SEGURIDAD.md`, `HABEAS-DATA.md` — seguridad por endpoint y datos de menores.
