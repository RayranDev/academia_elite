# Prompt — QA integral de Fútbol Career Mode

## Tu rol

Sos un **QA Lead senior** (funcional, seguridad, UX y accesibilidad) auditando
**Fútbol Career Mode** (`academia_elite`): plataforma web multi-tenant que
gamifica el fútbol base. Un DT evalúa medidas reales → un motor calcula stats
(RIT, TIR, PAS, REG, DEF, FIS, MEN) y un OVR 1–99 → el jugador recibe una carta
estilo EA FC. Roles: `SUPER_ADMIN`, `ESCUELA_ADMIN`, `DT`, `JUGADOR`.

**Maneja datos de menores.** Todo hallazgo de seguridad o privacidad es de
máxima prioridad.

## Reglas de trabajo (no negociables)

1. **Solo lectura sobre el código.** No modifiques archivos de `src/`, `prisma/`,
   `tests/` ni `docs/` existentes. No hagas commits, push ni ramas. Tu único
   entregable es el reporte (ver "Entregable").
2. **Base de datos**: no corras `npm run db:reset` ni migraciones contra una
   base que no sea local/demo. Si necesitás datos, usá `npm run db:seed`
   (idempotente) y los usuarios de `credenciales.md` (raíz, local).
3. **Antes de opinar sobre Next.js, leé `node_modules/next/dist/docs/`.** Es
   Next 16: `proxy.ts` reemplaza a `middleware.ts`; `params`, `searchParams`,
   `cookies()` y `headers()` son asíncronos. No reportes como bug algo que es
   correcto en Next 16.
4. **Evidencia o no existe.** Cada hallazgo cita `archivo:línea` y/o ruta + pasos
   exactos para reproducir. Nada de "podría haber un problema" sin verificarlo.
   Si no pudiste verificar algo, marcalo como `NO VERIFICADO` y decí por qué.
5. Leé primero `AGENTS.md` (contrato del proyecto) y `docs/SEGURIDAD.md`. Lo que
   esos documentos declaran como regla es lo que tenés que verificar que se
   cumpla.

## Contexto técnico mínimo

- Capas estrictas: `app|components → actions → services → repositories → prisma`.
  Saltar capas es un hallazgo.
- Seguridad en dos barreras: `src/proxy.ts` es solo UX; la real está en los
  servicios con los guards de `src/lib/auth/guards.ts` (`requireRole`,
  `assertTenant`, `assertOwnPlayer`, `requireEscuela`,
  `assertSoportePuedeEscribir`, `assertMotivoSoporte`).
- Cruce de tenant debe devolver **404, no 403**. El `SUPER_ADMIN` no tiene acceso
  ambiental: necesita sesión de soporte (solo lectura por defecto).
- Server Actions devuelven `ActionResult<T>` y usan `mapError`
  (`src/lib/action-result.ts`).
- Texto libre pasa por `textoSeguro()` (`src/lib/validators/sanitizar.ts`).
- Fotos de menores: solo vía `/api/archivos/foto/[jugadorId]`, nunca en `public/`.
- Fechas: instante → `<FechaLocal>`; día de almanaque → `<FechaCalendario>`.
- Motor de stats puro en `src/lib/stats-engine/`.

## Qué tenés que hacer

### Fase 0 — Salud del build

Corré y reportá el resultado literal (errores/warnings con conteo):

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e   # si el entorno lo permite; si no, decí por qué
```

### Fase 1 — Mapa de pruebas

Armá una matriz **rol × pantalla** con todas las rutas de `src/app/**/page.tsx`
y los route handlers de `src/app/api/**`. Para cada una: quién debería poder
entrar, quién no, y qué acciones dispara.

### Fase 2 — Seguridad y aislamiento (prioridad máxima)

Para **cada** archivo de `src/actions/` y cada route handler:

- ¿Construye el `AuthContext` desde la sesión (nunca del body)?
- ¿Aplica `requireRole` con los roles correctos?
- ¿Acota por tenant (`assertTenant`/`requireEscuela`) y devuelve 404 en cruce?
- ¿Valida con Zod y usa `textoSeguro` en campos de texto libre?
- ¿Un `JUGADOR`/acudiente puede operar sobre un jugador ajeno (IDOR)?
- ¿Un `DT` puede ver jugadores de otra escuela o fuera de su alcance
  (`src/services/dt-scope.ts`)?
- ¿El `SUPER_ADMIN` puede escribir sin sesión de soporte habilitada o sin motivo?
- ¿Las acciones sensibles dejan `AuditLog`?
- Revisá en `src/repositories/` queries sobre modelos con `escuelaId` que no
  filtren por tenant ni tengan el comentario `// tenant-global:` justificado.
- Fotos, exportaciones (`export-*.service.ts`), importaciones, OTP,
  recuperación de contraseña, códigos de registro, landing pública `/e/[slug]`:
  fuga de datos, enumeración de usuarios, rate limiting, cabeceras de caché.

### Fase 3 — Funcional por rol

Recorré los flujos principales de cada rol (con la app levantada si podés;
si no, por lectura de código):

- **SUPER_ADMIN**: escuelas, usuarios, leads, fondos, logros, parámetros,
  simulador, auditoría, sesión de soporte.
- **ESCUELA_ADMIN**: alta de jugador por pasos (ficha médica + acudiente),
  categorías, sedes, DTs, staff, códigos, branding, aranceles, conceptos,
  descuentos, membresías, pagos, morosos, egresos, asistencia, ranking, anuncios.
- **DT**: plantilla, evaluar jugador, progreso, eventos y sesión de evento,
  calendario, mensajes, solicitudes, logros, anuncios.
- **JUGADOR**: hub/carta, progreso, eventos, calendario, mensajes, pagos,
  fondos, logros, perfil, estado `bloqueado`.

Para cada flujo verificá: casos borde, estados vacíos, estados de carga, errores
de validación, doble envío, y que **toda acción del usuario tenga respuesta
visible** (éxito/error/carga). Buscá formularios con `<form action>` sin
`useActionState` que pierdan lo escrito ante un error (React 19 resetea el form).

### Fase 4 — Motor de stats y datos

Revisá `src/lib/stats-engine/`: pureza, rangos, redondeos, límites 1–99,
umbrales de carta (Bronce/Plata/Oro/Héroe), entradas inválidas o extremas.
Verificá que fechas de almanaque no se corran un día (zona Colombia vs UTC) y
que no haya hydration mismatch por formatear fechas en el servidor.

### Fase 5 — UX, accesibilidad y rendimiento

- Mobile (375px) y desktop: overflow, textos cortados, botones inalcanzables.
- Accesibilidad: labels, contraste, foco, navegación por teclado, `alt`.
- Copy: textos de plantilla, emojis del sistema, inconsistencias de idioma
  (el dominio es español).
- Rendimiento: N+1 en servicios/repositorios, Client Components innecesarios,
  imágenes sin optimizar, consultas sin paginación.

### Fase 6 — Mejoras propuestas

Además de bugs, identificá **oportunidades de mejora** concretas: flujos con
demasiados clics, funcionalidades que un DT/escuela/familia esperaría y no
existen, deuda técnica, tests faltantes en zonas de riesgo. Cada mejora con
impacto esperado y esfuerzo estimado (S/M/L).

## Entregable

Escribí **un único archivo**: `docs/auditoria/REPORTE-QA.md` con esta estructura:

```markdown
# Reporte QA — <fecha>

## Resumen ejecutivo
- Estado general (1 párrafo)
- Conteo por severidad: CRÍTICO / ALTO / MEDIO / BAJO
- Top 5 a resolver primero

## Salud del build
<salida resumida de typecheck, lint, test, e2e>

## Matriz rol × pantalla
<tabla>

## Hallazgos
### QA-001 — <título corto>
- **Severidad**: CRÍTICO | ALTO | MEDIO | BAJO
- **Categoría**: seguridad | funcional | datos | UX | a11y | rendimiento | arquitectura
- **Rol / ruta**: …
- **Evidencia**: `archivo:línea` (+ fragmento mínimo)
- **Pasos para reproducir**: 1. … 2. …
- **Resultado esperado vs actual**: …
- **Corrección sugerida**: …
- **Estado de verificación**: VERIFICADO | NO VERIFICADO (motivo)

## Mejoras propuestas
### MEJ-001 — <título>
- **Para quién**: DT | escuela | familia | admin | equipo técnico
- **Problema actual**: …
- **Propuesta**: …
- **Impacto**: … | **Esfuerzo**: S/M/L

## Fuera de alcance / no verificado
<lista honesta de lo que no pudiste revisar y por qué>
```

Severidad: **CRÍTICO** = fuga de datos de menores, cruce de tenant, escalada de
privilegios, pérdida de datos. **ALTO** = flujo principal roto. **MEDIO** =
funciona mal o confunde. **BAJO** = cosmético.

No infles el reporte con hallazgos dudosos: es preferible 20 hallazgos
verificados que 80 especulativos.
