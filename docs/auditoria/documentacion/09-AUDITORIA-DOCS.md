# Auditoría de Documentación Existente

Este documento consolida el análisis crítico de la documentación existente en `docs/`, `AGENTS.md` y archivos de configuración del repositorio, contrastándolos rigurosamente contra el código fuente en ejecución.

---

## 1. Resumen de Estado de la Documentación

| Documento | Estado General | Hallazgo Principal |
|---|---|---|
| `AGENTS.md` | **Correcto** | Refleja fielmente el contrato operativo y las restricciones de Next.js 16. |
| `docs/SEGURIDAD.md` | **Desactualizado / Contradictorio** | Cita CSP en `next.config.ts`, contradicción interna en rate limit de leads (3/h vs 8/h) y omite 7 suites de acciones recientes. |
| `docs/ESTADO-DEL-PROYECTO.md` | **Desactualizado** | Congelado en 248 tests unitarios y 10 tests E2E (la suite real cuenta con 570 unitarios y 13 E2E). |
| `docs/MANUAL-DE-USO.md` | **Faltante / Desactualizado** | Omite `/jugador/pagos`, `/escuela/staff`, `/escuela/egresos`, `/escuela/descuentos`, `/escuela/conceptos` y recuperación autoservicio. |
| `docs/PENDIENTES.md` | **Desactualizado** | Última actualización registrada el 2026-08-07. Mantiene tareas ya resueltas en sprints posteriores. |
| `.env.example` | **Incorrecto** | Muestra cadena de conexión SQLite (`file:./dev.db`) a pesar de la migración completa a Supabase PostgreSQL. |
| `docs/ACADEMIA-ELITE-DEMO.md` | **Correcto** | Coincide con la semilla `prisma/seed-academia-elite.ts`. |
| `docs/CURVA-DE-DESARROLLO.md` | **Correcto** | Coincide con las fórmulas de progresión semanal y MEN diario. |
| `docs/DECISIONES.md` | **Correcto** | Historial de ADRs bien estructurado y documentado. |
| `docs/HABEAS-DATA.md` | **Correcto / Desalineado con UI** | Describe el marco legal adecuado, pero la UI de `/legal` mantiene tokens sin reemplazar (`[Razón social]`). |
| `docs/GUIA-DE-MARCA.md` | **Correcto** | Estándares de diseño y regla estricta de no mostrar rostros de menores. |
| `docs/GUIA-FONDOS.md` | **Correcto** | Coincide con el catálogo de fondos y shaders CSS. |
| `docs/TRAZABILIDAD.md` | **Correcto** | Bitácora exhaustiva y confiable de hitos y correcciones. |

---

## 2. Registro Detallado de Discrepancias

### DOC-001 — `docs/SEGURIDAD.md` — Ubicación de Cabeceras CSP
- **Tipo**: desactualizado / incorrecto
- **Dice el doc**: `docs/SEGURIDAD.md:42` — `Cabeceras (next.config.ts): CSP (sin unsafe-eval en producción)...`
- **Hace el código**: `src/proxy.ts:34-40` — Las cabeceras de Content Security Policy fueron trasladadas explícitamente a `src/proxy.ts` para evitar la duplicación de cabeceras en Next.js 16 y habilitar excepciones dinámicas requeridas por WebAssembly en `@imgly/background-removal`.
- **Corrección propuesta**: Actualizar `docs/SEGURIDAD.md` indicando que CSP se aplica en `src/proxy.ts` y documentar la directiva para WebAssembly.

---

### DOC-002 — `docs/SEGURIDAD.md` — Inconsistencia en Rate Limiting de Leads
- **Tipo**: incorrecto / contradictorio
- **Dice el doc**: `docs/SEGURIDAD.md:46` afirma `leads 8/h`, pero la tabla en `docs/SEGURIDAD.md:64` estipula `rate limit 3/h`.
- **Hace el código**: `src/app/api/leads/route.ts:37` — Aplica `limiter(ip, 8, 60 * 60 * 1000)` (8 peticiones por hora).
- **Corrección propuesta**: Corregir la tabla de `docs/SEGURIDAD.md:64` para unificar el valor a `8/h` conforme al código activo.

---

### DOC-003 — `docs/ESTADO-DEL-PROYECTO.md` — Métrica de Pruebas Unitarias y E2E
- **Tipo**: desactualizado
- **Dice el doc**: `docs/ESTADO-DEL-PROYECTO.md:37` — `248 tests unitarios · 6 specs E2E (10 tests) en verde`.
- **Hace el código**: `package.json:12,14` y ejecución de suites — El proyecto cuenta con **570 tests unitarios** en 50 archivos (Vitest) y **13 tests E2E** en 7 especificaciones (Playwright).
- **Corrección propuesta**: Actualizar las cifras de cobertura en `docs/ESTADO-DEL-PROYECTO.md` para reflejar el crecimiento real del suite de pruebas.

---

### DOC-004 — `docs/SEGURIDAD.md` — Checklist de Server Actions Incompleto
- **Tipo**: faltante
- **Dice el doc**: `docs/SEGURIDAD.md:72-315` — Detalla un checklist tabla por tabla con fecha de corte de julio 2026.
- **Hace el código**: `src/actions/` — Se implementaron posteriormente 7 suites completas de Server Actions que no figuran en el checklist: `egreso.actions.ts`, `staff.actions.ts`, `descuento.actions.ts`, `concepto-cobro.actions.ts`, `categoria-rango.actions.ts`, `landing.actions.ts` y `cuenta.actions.ts`.
- **Corrección propuesta**: Incorporar las 7 suites al checklist de seguridad verificando sus guards y tratamiento de errores.

---

### DOC-005 — `docs/MANUAL-DE-USO.md` — Módulos de Escuela Omitidos en el Manual
- **Tipo**: faltante
- **Dice el doc**: `docs/MANUAL-DE-USO.md:39-95` — La lista numerada del perfil `Administrador de Escuela` cubre del punto 1 al 11 saltando funcionalidades críticas.
- **Hace el código**: `src/app/escuela/` — Existen pantallas operativas para `/escuela/staff`, `/escuela/egresos`, `/escuela/descuentos`, `/escuela/conceptos` y la bandeja de conciliación de `/escuela/pagos`.
- **Corrección propuesta**: Agregar las secciones correspondientes a la gestión de colaboradores, control de gastos, becas comerciales y conciliación de transferencias familiares.

---

### DOC-006 — `docs/MANUAL-DE-USO.md` — Portal de Pagos Familiar Omitido
- **Tipo**: faltante
- **Dice el doc**: `docs/MANUAL-DE-USO.md:144-167` — Describe la operativa de las familias (Hub, Convocatorias, Perfil, Progreso, Fondos, Mensajes, Logros), omitiendo finanzas.
- **Hace el código**: `src/app/jugador/pagos/page.tsx` — Las familias cuentan con un portal donde consultan cuotas pendientes, suben comprobantes bancarios y descargan recibos.
- **Corrección propuesta**: Añadir el paso `10. Pagos y Recibos` en la guía de familias.

---

### DOC-007 — `docs/MANUAL-DE-USO.md` — Recuperación de Contraseñas Desactualizada
- **Tipo**: desactualizado
- **Dice el doc**: `docs/MANUAL-DE-USO.md:188` — `Olvidé mi contraseña: pedila al administrador de tu escuela... que puede regenerarla`.
- **Hace el código**: `src/actions/recuperacion.actions.ts` y `src/app/recuperar/page.tsx` — Existe un flujo completo de autoservicio para restablecer contraseña mediante enlace al correo y login con código OTP de 6 dígitos (`/codigo`).
- **Corrección propuesta**: Actualizar la FAQ indicando la disponibilidad de la recuperación autónoma vía correo electrónico.

---

### DOC-008 — `.env.example` — Cadena de Base de Datos SQLite Obsoleta
- **Tipo**: incorrecto / desactualizado
- **Dice el doc**: `.env.example:2` — `DATABASE_URL="file:./dev.db"`.
- **Hace el código**: `prisma/schema.prisma:10-14` — Prisma está configurado para `provider = "postgresql"` y requiere obligatoriamente `DATABASE_URL` (pooler) y `DIRECT_URL` (conexión directa).
- **Corrección propuesta**: Reemplazar la plantilla de `.env.example` con los formatos reales de PostgreSQL y documentar la variable `DIRECT_URL`.

---

### DOC-009 — `docs/PENDIENTES.md` — Estado de Tareas Desfasado
- **Tipo**: desactualizado
- **Dice el doc**: `docs/PENDIENTES.md:19` — `Última actualización: 2026-08-07...`
- **Hace el código**: Múltiples ítems descritos como pendientes o en desarrollo fueron completados y verificados en los hitos de septiembre y octubre de 2026 en `docs/TRAZABILIDAD.md`.
- **Corrección propuesta**: Realizar una poda en `docs/PENDIENTES.md` removiendo ítems cerrados y sincronizando con la bitácora activa.

---

### DOC-010 — `docs/HABEAS-DATA.md` vs `src/app/legal/page.tsx` — Tokens Legales Pendientes
- **Tipo**: desactualizado / faltante
- **Dice el doc**: `docs/HABEAS-DATA.md` — Describe la política de protección de datos de menores bajo la Ley 1581 de 2012 de Colombia.
- **Hace el código**: `src/app/legal/page.tsx:59-62` — La página legal en producción presenta marcadores de posición sin reemplazar (`[Razón social de la academia / operador]`, `[NIT]`, `[Ciudad, Colombia]`).
- **Corrección propuesta**: Establecer variables de configuración institucional para que la plantilla legal se popule dinámicamente con los datos de la academia titular.
