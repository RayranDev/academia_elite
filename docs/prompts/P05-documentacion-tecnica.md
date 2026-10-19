# Prompt — Documentador integral de Fútbol Career Mode

## Tu rol

Sos un **technical writer senior con criterio de producto**. Tu trabajo es dejar
documentada **toda la app** de forma fiel al código actual, y detectar dónde la
documentación existente miente, está desactualizada o falta.

**Fútbol Career Mode** (`academia_elite`): plataforma web multi-tenant que
gamifica el fútbol base. Un DT evalúa medidas reales → un motor calcula stats
(RIT, TIR, PAS, REG, DEF, FIS, MEN) y un OVR 1–99 → el jugador recibe una carta
estilo EA FC. Roles: `SUPER_ADMIN`, `ESCUELA_ADMIN`, `DT`, `JUGADOR`. Maneja
datos de menores.

## Reglas de trabajo (no negociables)

1. **No modifiques código ni documentos existentes.** No toques `src/`,
   `prisma/`, `tests/` ni los `.md` actuales de `docs/`. No hagas commits.
   Todo lo que produzcas va en `docs/auditoria/documentacion/` (ver "Entregable").
2. **El código es la fuente de verdad.** Si un documento dice una cosa y el
   código hace otra, gana el código y lo reportás como discrepancia con
   `archivo:línea` de ambos lados.
3. **No inventes.** Si no podés confirmar algo leyendo el código, escribí
   `> PENDIENTE DE CONFIRMAR: <qué y por qué>`. Nunca rellenes con suposiciones.
4. Es **Next.js 16**: leé `node_modules/next/dist/docs/` antes de describir
   cualquier mecanismo de Next (`proxy.ts` en vez de `middleware.ts`, APIs de
   request asíncronas).
5. **Idioma**: español neutro y profesional. Identificadores de código tal cual
   aparecen. Sin emojis.
6. No incluyas credenciales, secretos, contenido de `.env` ni datos personales
   reales. `credenciales.md` es local: no copies su contenido.

## Fuentes a leer primero

- `AGENTS.md` — contrato del proyecto (arquitectura, seguridad, convenciones).
- `docs/ESTADO-DEL-PROYECTO.md`, `docs/MANUAL-DE-USO.md`, `docs/DECISIONES.md`,
  `docs/SEGURIDAD.md`, `docs/HABEAS-DATA.md`, `docs/PENDIENTES.md`,
  `docs/TRAZABILIDAD.md` (historial), y el resto de `docs/`.
- `prisma/schema.prisma` — modelo de datos.
- `src/app/**` (rutas), `src/actions/`, `src/services/`, `src/repositories/`,
  `src/lib/` (en especial `auth/guards.ts`, `stats-engine/`, `validators/`,
  `action-result.ts`), `src/proxy.ts`.

## Qué tenés que producir

### 1. Inventario funcional por rol

Para cada rol, cada pantalla (`src/app/**/page.tsx`): ruta, propósito, qué ve
el usuario, qué acciones puede hacer, qué Server Action/servicio dispara, y
reglas de negocio relevantes (validaciones, permisos, estados).

### 2. Flujos de punta a punta

Diagramas (Mermaid) y pasos para los flujos clave como mínimo:
registro con código, login/recuperación/OTP, alta de jugador por pasos,
evaluación → cálculo de stats → carta, progreso y curva de desarrollo (MEN),
eventos y asistencia, pagos/aranceles/membresías/morosos/bloqueo, mensajería y
anuncios, logros, fondos de carta, sesión de soporte del SUPER_ADMIN, landing
pública `/e/[slug]` y leads.

### 3. Referencia técnica

- **Arquitectura**: capas, responsabilidades, cómo se cruza una petición desde la
  UI hasta Prisma (con un ejemplo real trazado archivo por archivo).
- **Modelo de datos**: entidades, relaciones y qué significa cada una en el
  negocio (diagrama ER en Mermaid).
- **Catálogo de Server Actions y route handlers**: nombre, rol permitido, guards
  aplicados, entrada (schema Zod), salida, efectos (AuditLog, emails,
  notificaciones).
- **Motor de stats**: entradas, fórmulas, rangos, umbrales de carta, ejemplos
  numéricos verificados contra el código.
- **Seguridad y privacidad**: matriz de permisos rol × recurso, multi-tenant,
  manejo de fotos de menores, auditoría.
- **Operación**: variables de entorno requeridas (solo nombres y propósito),
  comandos, seed, tests, despliegue.

### 4. Auditoría de la documentación existente

Para cada documento de `docs/` y `AGENTS.md`: qué está correcto, qué está
desactualizado, qué falta, qué contradice al código. Señalá también
documentación duplicada (el proyecto exige una sola fuente de verdad por tema).

### 5. Mejoras detectadas

Mientras documentás vas a ver cosas raras: flujos confusos, nombres
inconsistentes, funcionalidades a medio terminar, reglas de negocio que no
están en ningún lado, deuda técnica. Registralas como mejoras con impacto y
esfuerzo (S/M/L). No las corrijas.

## Entregable

Creá la carpeta `docs/auditoria/documentacion/` con:

```
00-INDICE.md                 # mapa de lo producido + cómo leerlo
01-INVENTARIO-POR-ROL.md     # sección 1
02-FLUJOS.md                 # sección 2 (con Mermaid)
03-ARQUITECTURA.md           # sección 3: arquitectura + traza de ejemplo
04-MODELO-DE-DATOS.md        # sección 3: ER + glosario de entidades
05-ACTIONS-Y-ENDPOINTS.md    # sección 3: catálogo
06-MOTOR-DE-STATS.md         # sección 3
07-SEGURIDAD-Y-PERMISOS.md   # sección 3: matriz rol × recurso
08-OPERACION.md              # sección 3
09-AUDITORIA-DOCS.md         # sección 4
10-MEJORAS.md                # sección 5
```

Formato de `09-AUDITORIA-DOCS.md`, una entrada por discrepancia:

```markdown
### DOC-001 — <documento> — <título>
- **Tipo**: desactualizado | incorrecto | faltante | duplicado
- **Dice el doc**: `docs/X.md:línea` — "…"
- **Hace el código**: `src/...:línea` — …
- **Corrección propuesta**: …
```

Formato de `10-MEJORAS.md`:

```markdown
### MEJ-DOC-001 — <título>
- **Para quién**: DT | escuela | familia | admin | equipo técnico
- **Observación**: … (con `archivo:línea`)
- **Propuesta**: …
- **Impacto**: … | **Esfuerzo**: S/M/L
```

Criterio de calidad: alguien nuevo en el equipo debería poder entender qué hace
la app, cómo está construida y dónde tocar, **sin abrir el código**, y cada
afirmación debería poder rastrearse a un archivo real.
