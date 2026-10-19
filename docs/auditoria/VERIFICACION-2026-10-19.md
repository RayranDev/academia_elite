# Verificación de hallazgos — 2026-10-19

Contraste contra el código real de diez hallazgos pendientes de `docs/auditoria/REPORTE-QA.md` (QA-007, 008, 009, 011) y `docs/auditoria/documentacion/09-AUDITORIA-DOCS.md` (DOC-003, 005, 006, 007, 009, 010). Solo lectura: no se tocó `src/`, `prisma/`, `tests/` ni docs existentes. Único comando de ejecución: `npx vitest run` (para contar pruebas): **58 archivos, 604 pruebas, todas en verde**.

Criterio: un hallazgo existe solo si se ve en el código o en el doc. Nada se aceptó por cómo estaba redactado.

## Tabla resumen (por severidad real)

| # | Hallazgo | Veredicto | Severidad real (reporte) | Esfuerzo | Nota corta |
|---|---|---|---|---|---|
| 1 | DOC-010 | YA CONOCIDO | ALTA, bloqueada por el dueño (reporte: sin severidad) | M (dato legal) | Placeholders de `/legal` ya están en PENDIENTES; la "desalineación" doc/UI es falsa: ambos son borradores a propósito |
| 2 | DOC-003 | REAL | MEDIO | S | `ESTADO-DEL-PROYECTO.md` congelado el 2026-07-31; además de las pruebas, desfasados modelos, migraciones y "qué NO tiene" |
| 3 | DOC-005 | REAL | MEDIO | M | Faltan 7 pantallas de Escuela (Pagos, Egresos, Descuentos, Staff, Conceptos, Morosos, Mi cuenta) y 2 pasajes quedaron contradictorios |
| 4 | QA-007 | EXAGERADO | BAJO (reporte: MEDIO) | S | Hay `disabled={pending}` y la vista se reemplaza al éxito; queda una ventana mínima de doble envío |
| 5 | QA-008 | EXAGERADO | BAJO (reporte: MEDIO) | S | Falta Escape, pero el menú no es modal: el focus trap no aplica (y WCAG 2.1.2 va en contra de una trampa) |
| 6 | QA-009 | REAL | BAJO | S | Desactivar es irreversible y sin confirmación; la falta de feedback ya estaba en PENDIENTES, la confirmación no |
| 7 | DOC-006 | REAL | BAJO (el detalle "descargan recibos" es falso) | S | El manual de la familia no menciona Pagos ni Calendario ni Mi cuenta |
| 8 | DOC-007 | REAL | BAJO (el mecanismo descrito por el reporte es parcialmente erróneo) | S | La recuperación es con código de 6 dígitos, no con enlace; `/codigo` es otro flujo |
| 9 | QA-011 | FALSO | n/a (reporte: BAJO) | n/a | No existen switches; `Badge` es un `<span>` estático; el residuo real es un matiz de `aria-describedby` |
| 10 | DOC-009 | FALSO hoy (ya corregido) | n/a (reporte: sin severidad) | n/a | La cabecera ya dice 2026-10-19; no se cita ninguna tarea concreta "ya resuelta". Quedan 4 imprecisiones menores propias |

---

## QA-007 — Doble envío / falta de idempotencia en `crearEvaluacionAction`

**Veredicto: EXAGERADO. Severidad real BAJO (reporte: MEDIO).**

Qué es cierto:
- `crearEvaluacionAction` no tiene `rateLimit` ni token de idempotencia (`src/actions/dt.actions.ts:83-102`; sí lo tienen `importarEvaluacionesAction` en `:112` y otras).
- `crearEvaluacion` → `evaluarJugadorCore` crea `Evaluacion` + `StatsCalculados` en una transacción y no hay restricción única que impida dos filas (`src/services/evaluacion.service.ts:140-180`). Es deliberado: las evaluaciones son inmutables y se re-miden.

Qué es falso o está omitido en el reporte:
- El reporte cita el botón "Guardar evaluación…" pero omite que **está deshabilitado mientras la acción corre**: `src/components/dt/EvaluationForm.tsx:248` `disabled={pending || !completas}`. Ese guard viene del commit `bbc61a9` (PLAN-UX-DT PR-5).
- Al terminar con éxito, el formulario deja de renderizarse (`EvaluationForm.tsx:123-169` devuelve la carta nacida), así que no hay segundo botón que pulsar.
- "Se despachan dos peticiones POST concurrentes": no se reprodujo y no lo sostiene el código. El envío es `startTransition(() => action(formData))` (`EvaluationForm.tsx:105-109`) sobre `useActionState`, que encola las acciones una detrás de otra; no hay concurrencia, hay a lo sumo dos ejecuciones seriales.
- El e2e `02-flujo-carta` ejecuta este flujo y pasa.

Riesgo residual (real pero pequeño): `pending` se actualiza como transición, así que existe una ventana de milisegundos entre el primer toque y el re-render con el botón deshabilitado. Un doble toque en esa ventana encola dos acciones. Consecuencia (por lectura del código, no reproducida): la primera marca los bonus como consumidos (`evaluacion.service.ts:181-187`); la segunda recalcula sin ellos, y como la carta sale de la última evaluación, la familia podría ver una carta sin el bonus. La escuela puede anular la duplicada (`anularEvaluacion`, `:218`), pero el DT no.

Corrección propuesta (S): `rateLimit(\`evaluar:${ctx.userId}:${jugadorId}\`, 1, 10_000)` en la action, mismo patrón que `importarEvaluacionesAction`. Alternativa más robusta: un campo oculto con UUID por montaje del formulario y rechazar si ya existe una evaluación con ese id. Nota: el rate limit cae a memoria por instancia sin Upstash, por eso la segunda opción es más sólida.

## QA-008 — Menú móvil "Más" sin Escape ni focus trap

**Veredicto: EXAGERADO. Severidad real BAJO (reporte: MEDIO).**

Evidencia: `src/components/shell/TabBarMovil.tsx:26-56`. Confirmado: no hay ningún `keydown` en el componente; solo cierra por overlay (`:36`), por el botón (`:69`) y al navegar (`:52`, `:64`). `Escape` solo está en `Modal.tsx:21` y `BottomSheet.tsx:25`.

Por qué se exagera:
- **El menú no es modal**: no tiene `role="dialog"` ni `aria-modal`, el overlay es `aria-hidden` (`:38`) y es un patrón de disclosure (`aria-expanded` + `aria-controls`, `:70-71`). Un focus trap solo corresponde a un diálogo modal; aquí sobraría.
- El reporte cita WCAG 2.1.2 (Sin trampas de teclado) como argumento a favor de un trap: es el criterio contrario. Lo que pide es que el foco no quede atrapado.
- Un usuario de teclado sí puede cerrarlo: el botón "Más" sigue siendo alcanzable con Tab y alterna `abierto` con Enter/Espacio.
- Todo el bloque es `md:hidden`: solo existe en viewport móvil, donde el teclado físico es raro.

Lo real: falta cerrar con `Escape` y devolver el foco al botón "Más". Es una mejora de pulido, no un bloqueo.

Corrección propuesta (S, ~10 líneas): `useEffect` que, si `abierto`, escucha `keydown` y con `Escape` hace `setAbierto(false)` y `botonRef.current?.focus()`; mismo patrón que `Modal.tsx:19-24`.

## QA-009 — Desactivar código de invitación sin confirmación

**Veredicto: REAL. Severidad BAJO.** Parcialmente YA CONOCIDO.

Evidencia: `src/app/escuela/codigos/page.tsx:58-68` es un `<form action={desactivarCodigoAction}>` con un botón de texto "Desactivar" que dispara al primer toque. `desactivarCodigoAction` (`src/actions/escuela.actions.ts:169-177`) es `Promise<void>`, sin `try/catch`, y `desactivarCodigo` solo hace `activo: false` (`src/repositories/codigo.repository.ts:23-28`).

Agravante verificado: **no existe acción de reactivar** (no hay otra referencia a `activo: true` para códigos). Si el código ya se envió por correo o se imprimió, queda inutilizado y hay que crear otro. La UI sí cambia al éxito (el badge pasa a "Inactivo" y el botón desaparece), así que el problema es la confirmación, no la ausencia total de respuesta.

Ya conocido: `PENDIENTES.md` (paquete "Feedback visible…") lista `desactivarCodigoAction` por el feedback; **la confirmación no estaba registrada**.

Corrección propuesta (S): componente cliente `DesactivarCodigoButton` siguiendo `src/components/dt/CancelarEventoButton.tsx` (`Modal` + `useEnvioAccion` + `MensajeAccion`), y que la action devuelva `ActionResult` envuelta en `mapError`. Resuelve a la vez la confirmación y el ítem de feedback de PENDIENTES.

## QA-011 — Switches / toggles sin feedback accesible

**Veredicto: FALSO tal como está formulado.**

- El título habla de "switches y toggles táctiles", pero en `src/` **no existe ningún `role="switch"` ni componente switch propio**. Los controles booleanos son `<input type="checkbox">` nativos (decenas de usos) con su etiqueta.
- Las evidencias citadas no coinciden con la afirmación: `src/components/ui/Badge.tsx` es un `<span>` estático de 31 líneas, sin interacción. `CamposRangosFisicos.tsx` contiene inputs numéricos, no toggles.
- Los toggles reales sí comunican estado: `ThemeToggle.tsx:50` cambia su `aria-label` según el tema; los botones de nota usan `aria-pressed` (`EvaluationForm.tsx:285`), igual que `CierreSesion`, `PartidoVivo`, `LiveDemo` y `CamaraCaptura`.
- El reporte se contradice: el título es de switches y los "pasos para reproducir" hablan de `aria-describedby` en inputs numéricos.

Residuo real (cosmético, BAJO, S): en `CamposRangosFisicos.tsx` cada input ya tiene `<label htmlFor>` (`:69`, `:83`), pero la ayuda ("Menos es mejor…", `:66`) describe al par mínimo/máximo y no está enlazada con `aria-describedby`. Lo mismo pasa con las ayudas de `EvaluationForm.tsx:182`. Solo `AltaJugadorDialog.tsx:742` implementa el patrón. Una mejora razonable, pero no es lo que el hallazgo afirma.

## DOC-003 — `ESTADO-DEL-PROYECTO.md`: métricas de pruebas desactualizadas

**Veredicto: REAL. Severidad MEDIO.** Y es más amplio de lo que dice el reporte.

El doc dice (`docs/ESTADO-DEL-PROYECTO.md:4`, `:37-38`) "Última actualización 2026-07-31", "248 tests unitarios" y "6 specs E2E (10 tests)".

Estado real hoy:

| Dato | Doc | Real | Cómo se verificó |
|---|---|---|---|
| Pruebas unitarias | 248 | **604** en 58 archivos | `npx vitest run` ejecutado hoy |
| E2E | 6 specs / 10 tests | **7 specs / 13 tests** | `tests/e2e/*.spec.ts` (5+1+1+2+1+1+2) |
| Modelos de datos (`:101`) | 36 | **45** | `^model ` en `prisma/schema.prisma` |
| Migraciones (`:115`) | 12, terminan en `arancel` | **23** (hasta `20260928225247_landing_escuela`) | `prisma/migrations/` |
| "Qué NO tiene" (`:238-239`) | descuentos como regla y staff pendientes | ya existen (`/escuela/descuentos`, `/escuela/staff`) | `src/app/escuela/` |

Observaciones:
- El propio reporte ya está desfasado: dice 570 pruebas en 50 archivos; hoy son 604 en 58 (los fixes del hito #57-58 añadieron pruebas).
- Es el mismo patrón que `TRAZABILIDAD.md` #19 documentó el 2026-07 ("conteos viejos, 171 → 248"): las cifras se corrigen y se vuelven a quedar viejas. Conviene no repetir números exactos en un doc de contexto (decir "ver `npm run test`") o añadir una prueba de higiene que los compare.
- No estaba registrado como pendiente propio (PENDIENTES solo lo lista como "sin verificar").

Corrección propuesta (S): actualizar las cinco filas anteriores, la fecha, y quitar de "NO tiene" lo ya construido.

## DOC-005 — `MANUAL-DE-USO.md` omite módulos de Escuela

**Veredicto: REAL. Severidad MEDIO** (es el núcleo ERP que, según `ESTADO-DEL-PROYECTO.md`, es lo que compra el dueño).

El manual (`docs/MANUAL-DE-USO.md:39-95`) enumera 11 ítems: Branding, Categorías, Sedes, DTs, Jugadores, Asistencia, Ranking, Precios, Membresías, Códigos, Anuncios. El menú real (`src/app/escuela/layout.tsx:9-27`) tiene 17 entradas en tres grupos. Diferencias concretas:

| Pantalla real | En el manual | Qué hace (de la página) |
|---|---|---|
| `/escuela/pagos` | No | Bandeja de validación: aprobar/rechazar/anular pagos reportados por familias, registrar pagos cobrados directo, aprobación en lote (`pagos/page.tsx`) |
| `/escuela/egresos` | No | Gastos operativos y caja neta del mes (`egresos/page.tsx`) |
| `/escuela/descuentos` | No | Reglas reusables por categoría (Hermano, Beca…), se aplican al generar cobranza; gana la de mayor descuento (`descuentos/page.tsx:32-37`) |
| `/escuela/staff` | No | Libreta de contactos del cuerpo técnico administrativo; no crea cuentas (`staff/page.tsx:12-16`) |
| `/escuela/conceptos` | No | Conceptos de cobro: los de plataforma se renombran, los propios se crean/archivan (`conceptos/page.tsx:21-27`); se llega desde Precios |
| `/escuela/morosos` | No | Bloqueo masivo de familias con cuotas vencidas, auditado por separado (`morosos/page.tsx:12-15`); se llega desde el dashboard |
| `/escuela/cuenta` | No | Cambiar contraseña |

Pasajes del manual que hoy son inexactos o contradictorios:
- `:84-85`: "El bloqueo de acceso por mora se gestiona desde la ficha del jugador, no acá" → también se hace en lote desde `/escuela/morosos`. (Lo de "no bloquea sola" sigue siendo cierto: el cron automático está gateado en PENDIENTES.)
- `:58-60`: lista fija de conceptos (mensualidad, matrícula, indumentaria, torneo, transporte) → ahora los conceptos son configurables por escuela.
- `:75-77` describe "Marcar pagada" con medio y comprobante pero no el circuito completo reporte de la familia → bandeja de Pagos.

Ya conocido a medias: `PENDIENTES.md` (paquete "Calidad: QA a ciegas y manuales por módulo", punto 3) prevé que `MANUAL-DE-USO.md` pase a ser un índice y que los manuales se rehagan por módulo. No cubre el problema mientras tanto.

Corrección propuesta (M): añadir las siete secciones al manual actual como arreglo inmediato, o priorizar los manuales de Pagos/Egresos/Descuentos en el paquete de manuales por módulo. El reporte sugiere "conciliación de transferencias familiares": correcto, es `/escuela/pagos`.

## DOC-006 — `MANUAL-DE-USO.md` omite el portal de pagos familiar

**Veredicto: REAL. Severidad BAJO.** Con un detalle falso en la descripción del reporte.

Manual de la familia: `docs/MANUAL-DE-USO.md:144-166`, 9 pasos, ninguno de pagos. Una búsqueda de "pago" en esa sección no da resultados.

Lo que el código hace (`src/app/jugador/pagos/page.tsx`, `ReportarPagoForm.tsx`, `HistorialPagos.tsx`):
- Ver cuotas pendientes/vencidas con monto neto y reportar un pago: elegir cuotas, fecha, nota, uno o varios medios con monto, referencia y **comprobante opcional** (`CamposMedios.tsx:71`, `type="file"`). Queda "en revisión" hasta que la escuela lo apruebe.
- Historial con estado (Reportado / Aprobado / Rechazado / Anulado), motivo de rechazo o anulación y enlace "Ver comprobante" (`HistorialPagos.tsx:86-95`).
- **Disponible con la cuenta bloqueada por mora** (`permitirBloqueado`, `jugador/layout.tsx:40-42`): es la única vía, junto con Mensajes, para salir del bloqueo.

Lo que el reporte afirma y es **falso**: "descargan recibos". No existe ninguna funcionalidad de recibo (`recibo` no aparece en `src/`); el reporte se contradice con su propio MEJ-001, que propone crear recibos PDF.

Otras omisiones del mismo manual, no citadas por el reporte: `/jugador/calendario`, `/jugador/eventos` (listado con filtros), `/jugador/cuenta` (contraseña, identidad fiscal, teléfono) y el comportamiento de la cuenta bloqueada (`/bloqueado`, `/jugador/layout.tsx`).

Corrección propuesta (S): añadir "Pagos" (con el matiz del bloqueo), "Calendario" y "Mi cuenta" al manual de la familia. No prometer recibos.

## DOC-007 — `MANUAL-DE-USO.md`: recuperación de contraseñas desactualizada

**Veredicto: REAL. Severidad BAJO.** El mecanismo que describe el reporte es parcialmente erróneo.

Manual `:188-189`: "Olvidé mi contraseña: pedila al administrador de tu escuela (o al DT si sos familia), que puede regenerarla". Es incompleto: existe autoservicio desde `LoginForm.tsx:110` ("¿Olvidaste tu contraseña?" → `/recuperar`).

Lo que el código realmente hace:
- `/recuperar` (`RecuperarForm.tsx:18-21`): "en dos pasos con **CÓDIGO (no enlace)**": 1) se pide el código al correo; 2) se ingresa correo + código de 6 dígitos + contraseña nueva. Respuesta siempre genérica (anti-enumeración); límite 3 solicitudes/15 min y 10 intentos/15 min (`recuperacion.actions.ts:36-38`, `:75-79`). El commit `f0dbfce` ("flujos de correo con codigo OTP en vez de enlace") es la razón histórica.
- El reporte dice "enlace al correo y login con código OTP (/codigo)": mezcla dos flujos distintos. `/codigo` (`OtpLoginForm`) es **entrar sin contraseña** con un código por correo (`LoginForm.tsx:115`), no la recuperación. El único "enlace" es de comodidad en el alta (`recuperacion.service.ts:96-110`): lleva a `/recuperar?paso=codigo&email=…` con el correo precargado.
- El reseteo por el administrador sigue existiendo (`ResetPasswordButton`), así que la frase del manual no es falsa, solo está incompleta.

Corrección propuesta (S): reescribir la FAQ: autoservicio en `/recuperar` con código de 6 dígitos; alternativa `Entrar con un código por correo` (`/codigo`); y si no recibe el correo, el administrador o el DT pueden regenerar la contraseña.

## DOC-009 — `PENDIENTES.md` desfasado

**Veredicto: FALSO en el estado actual (ya corregido).**

- La afirmación del reporte ("Última actualización 2026-08-07") era cierta cuando se redactó: `git show 6f9ea7e^:docs/PENDIENTES.md` tenía esa cabecera y cerraba con "Solo queda gateado vigencia y bloqueo automático". El commit `6f9ea7e` (2026-10-18) la actualizó. Hoy `docs/PENDIENTES.md:19` dice 2026-10-19.
- La segunda mitad ("mantiene tareas ya resueltas en hitos de septiembre y octubre") no cita ninguna tarea concreta. Se contrastaron los ítems vigentes contra el código y están todos realmente pendientes: `confirmarConvocatoriaAction` sigue `Promise<void>` en `<form action>` (`evento.actions.ts:64-66`, `UpcomingList.tsx:82`, `ProximoPartidoTile.tsx:66`, `CambiarRespuesta.tsx:22`, `jugador/eventos/[id]/page.tsx:103`); `/jugador/eventos` sigue sin entrada en `jugador/layout.tsx:8-18`; placeholders de `/legal` en las líneas 59 y 176 (más 59-62 y 145); `format(new Date(...))` en `export-contactos.service.ts:75`; `terminosAceptadosEn` solo se sella en el registro (`registro.service.ts:44`, `:90`); CI solo corre typecheck/lint/test (`ci.yml`); Auth.js sigue en `5.0.0-beta.31`; no hay cron de vigencia en `vercel.json`.
- `.env.example` no se pudo verificar (lectura denegada por permisos); queda fuera de este informe.

Imprecisiones menores que sí quedan en el `PENDIENTES.md` actual (propias, no del reporte):
1. El paquete "Feedback visible…" omite `actualizarParametroAction` (`admin.actions.ts:152-154`, usado en `admin/parametros/page.tsx:82`), que también devuelve `Promise<void>` y estaba en QA-004.
2. La viñeta "Hallazgos de Gemini sin verificar" queda obsoleta con este informe: debe reemplazarse por las conclusiones de abajo.
3. La frase "Ya verificados y resueltos: QA-001, 002 (pendiente abajo), …" mezcla resuelto con pendiente.
4. La cabecera cita `TRAZABILIDAD.md #57-58`; existe el #59 (políticas y prompts).

## DOC-010 — `HABEAS-DATA.md` vs `/legal`: tokens legales pendientes

**Veredicto: YA CONOCIDO (y la "desalineación" entre doc y UI es falsa).**

- El hecho es cierto: `src/app/legal/page.tsx:59-62`, `:145` y `:176` muestran `[Razón social]`, `[NIT]`, `[Dirección, Ciudad]` y `[correo de protección de datos]`.
- Las citas del reporte no son literales (`[Razón social de la academia / operador]`, `[Ciudad, Colombia]` no existen; QA-006 cita `[correo de contacto]` y `[teléfono]`, tampoco). La página no tiene teléfono; `HABEAS-DATA.md:21` sí lo prevé.
- No hay desalineación: `HABEAS-DATA.md:6-11` se declara "borrador técnico" cuyos corchetes `[ ]` deben completarse con datos reales y revisarse por un abogado, y `legal/page.tsx:11-14` documenta que `<Dato>` marca lo que falta cargar. Ambos están pendientes por la misma razón.
- Ya conocido: `PENDIENTES.md:100-103` ("Datos legales reales en `/legal`", Alta, bloqueado por el dueño) y el reporte lo reconoce en "Fuera de alcance" (punto 3). Es el mismo hallazgo que QA-006.

Corrección propuesta (M, depende del dueño y de un abogado): cargar los datos reales en una constante central (`src/lib/legal.ts` ya exporta `TERMINOS_VERSION`) para que doc y página no diverjan. No se pueden inventar.

Hallazgo colateral (REAL, BAJO, S): `docs/HABEAS-DATA.md:204-206` aún dice "Pendiente para producción: RLS en la base de datos gestionada…" y RLS está implementado (migración `20260707181541_enable_rls`; `TRAZABILIDAD.md` #19 ya lo corrigió en la tabla de checklist, pero no en este párrafo). Esto sí es una afirmación falsa en un documento legal.

---

## Hallazgos colaterales (fuera de la lista pedida)

- `HABEAS-DATA.md:204` (RLS "pendiente"), ver arriba.
- `ESTADO-DEL-PROYECTO.md`: lista de migraciones, modelos y "NO tiene" desfasadas (ver DOC-003).
- `MANUAL-DE-USO.md` incluye un voseo ("necesitás", "podés") mezclado con tuteo neutro ("puedes", "cargas"): coherente con el pendiente de localización a Colombia, solo se anota.
- QA-006 cita tokens que no existen literalmente en la página (ver DOC-010).

## Trazabilidad de esta verificación

- Archivos leídos: `AGENTS.md`, `docs/PENDIENTES.md`, `docs/TRAZABILIDAD.md` (#19, #57-59), `docs/ESTADO-DEL-PROYECTO.md`, `docs/MANUAL-DE-USO.md`, `docs/HABEAS-DATA.md`, ambos reportes, y el código citado en cada sección.
- Ejecutado: `npx vitest run` (604/604). No se corrieron `typecheck`, `lint` ni `test:e2e`.
- Git: `git log -S` sobre `EvaluationForm.tsx` (guard `disabled`, `bbc61a9`), `TabBarMovil.tsx`, `codigos/page.tsx`, `MANUAL-DE-USO.md`, `ESTADO-DEL-PROYECTO.md`; `git show 6f9ea7e^:docs/PENDIENTES.md`; `git log -S recuperarPasswordAction` (`f0dbfce`).
- No reproducido en navegador: QA-007 (ventana de doble envío) y QA-008. Ambos juzgados por lectura del código.
