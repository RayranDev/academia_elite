# Reporte QA — 2026-10-18

## Resumen ejecutivo

- **Estado general**: La plataforma **Fútbol Career Mode** exhibe un nivel de madurez técnica, disciplina arquitectónica y robustez de pruebas excepcional. La salud del build es sobresaliente: 0 errores de tipado, 0 fallas de lint, 570 pruebas unitarias en verde y suite completa de 13 pruebas End-to-End en Playwright pasando de forma determinista sobre un esquema Postgres aislado. La separación de responsabilidades por capas (`app/components → actions → services → repositories → prisma`) se respeta rigurosamente. No obstante, se detectaron hallazgos clave de seguridad (acceso ambiental del `SUPER_ADMIN` a fotografías de menores en endpoint de assets sin requerir sesión de soporte), riesgos sutiles de zona horaria en la exportación de fechas de almanaque en Excel, inconsistencias en manejo de estado de formularios de carga bajo React 19 (`<form action>` que resetean campos ante errores de validación) y acciones administrativas con respuesta invisible al usuario.
- **Conteo por severidad**:
  - **CRÍTICO**: 1
  - **ALTO**: 2
  - **MEDIO**: 5
  - **BAJO**: 3
- **Top 5 a resolver primero**:
  1. `QA-001` (CRÍTICO): Acceso ambiental del `SUPER_ADMIN` a fotos de menores sin sesión de soporte activa en `/api/archivos/foto/[jugadorId]`.
  2. `QA-002` (ALTO): Desfasaje potencial de fechas de nacimiento en exportación de contactos a Excel por conversión a zona local del servidor (UTC-5 vs UTC).
  3. `QA-003` (ALTO): Reseteo involuntario de notas y observaciones en `EvaluationForm.tsx` ante error de validación bajo React 19.
  4. `QA-004` (MEDIO): Server Actions con retorno `Promise<void>` y formularios sin feedback visual ni captura de error (`actualizarParametroAction`, `actualizarBrandingAction`, `crearSedeAction`, `crearCanchaAction`).
  5. `QA-006` (MEDIO): Tokens de plantilla sin sustituir en la Política de Tratamiento de Datos pública (`/legal`).

---

## Salud del build

Ejecución de los comandos oficiales del proyecto en el entorno Windows con Node 22+:

```
$ npm run typecheck
> futbol-career-mode@0.1.0 typecheck
> tsc --noEmit
Resultado: 0 errores (Limpio).

$ npm run lint
> futbol-career-mode@0.1.0 lint
> eslint
Resultado: 0 errores, 0 warnings (Limpio).

$ npm run test
> futbol-career-mode@0.1.0 test
> vitest run
Test Files  50 passed (50)
     Tests  570 passed (570)
  Duration  3.07s
Resultado: 100% de las pruebas unitarias pasaron.

$ npm run test:e2e
> futbol-career-mode@0.1.0 test:e2e
> playwright test
Running 13 tests using 1 worker
  ok  1 › tests/e2e/01-acceso.spec.ts:6:7 › Control de acceso › sin sesión, una ruta protegida redirige a /login (351ms)
  ok  2 › tests/e2e/01-acceso.spec.ts:11:7 › Control de acceso › un rol no puede entrar al panel de otro rol (7.5s)
  ok  3 › tests/e2e/01-acceso.spec.ts:19:7 › Control de acceso › la foto sin sesión devuelve 404 (61ms)
  ok  4 › tests/e2e/01-acceso.spec.ts:24:7 › Control de acceso › un recurso inexistente devuelve 404 (3.4s)
  ok  5 › tests/e2e/01-acceso.spec.ts:30:7 › Control de acceso › cabeceras de seguridad presentes (112ms)
  ok  6 › tests/e2e/02-flujo-carta.spec.ts:5:5 › escuela genera código → familia se registra → DT aprueba y evalúa → nace la carta (18.8s)
  ok  7 › tests/e2e/03-semana-operativa.spec.ts:5:5 › DT crea partido y carga resultado; la familia confirma y ve la noticia (13.7s)
  ok  8 › tests/e2e/04-bloqueo.spec.ts:25:5 › una familia bloqueada ve su mensaje al entrar (12.3s)
  ok  9 › tests/e2e/04-bloqueo.spec.ts:56:5 › una familia bloqueada solo puede entrar a mensajes (13.9s)
  ok 10 › tests/e2e/05-sesion-entrenamiento.spec.ts:6:5 › DT corre un entrenamiento en Modo Sesión: lista, observación y cierre (12.4s)
  ok 11 › tests/e2e/06-sesion-partido.spec.ts:10:5 › DT corre un partido en vivo: goles, deshacer, tarjeta y cierre (20.7s)
  ok 12 › tests/e2e/07-alta-jugador.spec.ts:7:5 › la escuela da de alta un jugador con ficha y acudiente; la familia entra con su cuenta (8.7s)
  ok 13 › tests/e2e/07-alta-jugador.spec.ts:84:5 › el DT da de alta un jugador sin acudiente y el formulario no le pide documento ni EPS (5.4s)
Resultado: 13 passed (4.4m).
```

---

## Matriz rol × pantalla

| Ruta | Roles permitidos | Roles bloqueados | Acciones que dispara |
|---|---|---|---|
| `/` | Público (Cualquiera) | Ninguno | Redirección o landing de inicio |
| `/login` | Anónimo (sin sesión) | Autenticados (redirige a panel) | `login` (Credentials), `signIn` |
| `/codigo` | Anónimo (sin sesión) | Autenticados (redirige a panel) | `solicitarOtpAction`, `verificarOtpAction` |
| `/registro` | Anónimo | Autenticados | Redirige / consulta de código |
| `/registro/[codigo]` | Anónimo | Autenticados | `registrarConCodigoAction`, `vincularHijoAction` |
| `/recuperar` | Anónimo | Autenticados | `solicitarRecuperacionAction`, `confirmarRecuperacionAction` |
| `/legal` | Público (Cualquiera) | Ninguno | Consulta de términos de Habeas Data |
| `/e/[slug]` | Público (Cualquiera) | Ninguno | Consulta de landing pública y formulario de leads |
| `/bloqueado` | JUGADOR (bloqueado) | SUPER_ADMIN, ESCUELA_ADMIN, DT | `logout` |
| `/admin` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | Redirección a `/admin/escuelas` |
| `/admin/auditoria` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | Consulta de logs y exportación Excel |
| `/admin/cuenta` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `cambiarMiPasswordAction` |
| `/admin/escuelas` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `crearEscuelaAction`, `iniciarSoporteAction` |
| `/admin/escuelas/[id]` | SUPER_ADMIN (soporte) | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `iniciarSoporteAction`, `finalizarSoporteAction`, `habilitarEscrituraSoporteAction` |
| `/admin/fondos` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `crearFondoAction`, `actualizarFondoAction`, `desactivarFondoAction` |
| `/admin/leads` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `convertirLeadAction` |
| `/admin/leads/[id]` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `actualizarLeadAction`, `agregarNotaLeadAction` |
| `/admin/logros` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `crearLogroAction`, `actualizarLogroAction`, `desactivarLogroAction` |
| `/admin/parametros` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `actualizarParametroAction`, `fijarMetricaEscuelaAction`, `quitarMetricaEscuelaAction`, `fijarRangosCategoriaAction` |
| `/admin/simulador` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | Simulación en memoria y exportación de plantilla |
| `/admin/usuarios` | SUPER_ADMIN | ESCUELA_ADMIN, DT, JUGADOR, Anónimo | `editarUsuarioAdminAction`, `resetPasswordUsuarioAdminAction` |
| `/escuela` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | Métricas deportivas y administrativas |
| `/escuela/anuncios` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearAnuncioAction`, `eliminarAnuncioAction` |
| `/escuela/aranceles` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearArancelAction`, `actualizarArancelAction`, `eliminarArancelAction` |
| `/escuela/asistencia` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | Consulta de matriz y descarga de Excel |
| `/escuela/branding` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `actualizarBrandingAction`, `subirEscudoAction`, `actualizarLandingAction` |
| `/escuela/categorias` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearCategoriaAction`, `fijarRangosCategoriaEscuelaAction` |
| `/escuela/codigos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearCodigoAction`, `desactivarCodigoAction`, `enviarCodigoInvitacionAction` |
| `/escuela/conceptos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearConceptoAction`, `actualizarConceptoAction`, `desactivarConceptoAction` |
| `/escuela/cuenta` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `cambiarMiPasswordAction` |
| `/escuela/descuentos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearDescuentoReglaAction`, `actualizarDescuentoReglaAction`, `eliminarDescuentoReglaAction` |
| `/escuela/dts` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearDtAction`, `actualizarDtAction`, `resetPasswordDtAction` |
| `/escuela/egresos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `registrarEgresoAction`, `eliminarEgresoAction` |
| `/escuela/jugadores` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearJugadorCompletoAction`, `editarJugadorAction`, `cambiarEstadoJugadorAction`, `eliminarJugadorAction`, `restaurarJugadorAction`, `bloquearAccesoAction`, `desbloquearAccesoAction`, `resetPasswordFamiliaAction`, `actualizarFichaMedicaAction` |
| `/escuela/membresias` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `generarCuotasMesAction`, `registrarMembresiaAction`, `cambiarEstadoMembresiaAction`, `aplicarDescuentoManualAction` |
| `/escuela/morosos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `bloquearAccesoMasivoAction` |
| `/escuela/pagos` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `registrarPagoEscuelaAction`, `aprobarPagoEscuelaAction`, `aprobarPagosLoteEscuelaAction`, `rechazarPagoEscuelaAction`, `anularPagoEscuelaAction` |
| `/escuela/ranking` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | Consulta de rankings y descarga de resultados |
| `/escuela/sedes` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearSedeAction`, `crearCanchaAction` |
| `/escuela/staff` | ESCUELA_ADMIN | SUPER_ADMIN*, DT, JUGADOR, Anónimo | `crearStaffAction`, `actualizarStaffAction`, `desactivarStaffAction` |
| `/dt` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | Hoy (resumen operativo, eventos del día) |
| `/dt/anuncios` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `crearAnuncioAction`, `eliminarAnuncioAction` |
| `/dt/calendario` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `crearEventoAction`, `editarEventoAction`, `cancelarEventoAction` |
| `/dt/cuenta` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `cambiarMiPasswordAction` |
| `/dt/eventos` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | Lista de eventos por categoría |
| `/dt/eventos/[id]` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `pasarListaAction`, `cargarResultadoAction`, `cargarEstadisticasAction` |
| `/dt/eventos/[id]/sesion` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `guardarAsistenciaSesionAction`, `ajustarGolVivoAction`, `fijarTarjetasSesionAction`, `avanzarPeriodoAction`, `crearObservacionSesionAction`, `cerrarSesionAction` |
| `/dt/jugadores/[id]` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `crearObjetivoAction`, `resetPasswordFamiliaDtAction` |
| `/dt/jugadores/[id]/evaluar` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `crearEvaluacionAction` |
| `/dt/logros` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `otorgarLogroAction`, `crearLogroAction`, `programarVentanaLogroAction` |
| `/dt/mensajes` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `enviarMensajeAction` |
| `/dt/mensajes/[id]` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `enviarMensajeAction` |
| `/dt/perfil` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | Métricas deportivas y pedagógicas del DT |
| `/dt/plantilla` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `crearJugadorCompletoAction`, `importarEvaluacionesAction` |
| `/dt/progreso` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `validarProgresoSemanalAction` |
| `/dt/solicitudes` | DT | SUPER_ADMIN*, ESCUELA_ADMIN, JUGADOR, Anónimo | `aprobarSolicitudAction`, `rechazarSolicitudAction` |
| `/jugador` | JUGADOR (tutor/jugador) | SUPER_ADMIN, ESCUELA_ADMIN, DT, Anónimo | Vista de carta activa, partidos próximos, noticias |
| `/jugador/calendario` | JUGADOR (activo) | Bloqueados (a `/bloqueado`), otros roles | Consulta de agenda |
| `/jugador/cuenta` | JUGADOR (activo) | Bloqueados, otros roles | `cambiarMiPasswordAction`, `actualizarIdentidadFiscalAction`, `actualizarTelefonoAction` |
| `/jugador/eventos` | JUGADOR (activo) | Bloqueados, otros roles | Listado de convocatorias |
| `/jugador/eventos/[id]` | JUGADOR (activo) | Bloqueados, otros roles | `confirmarConvocatoriaAction` |
| `/jugador/fondos` | JUGADOR (activo) | Bloqueados, otros roles | `equiparFondoAction` |
| `/jugador/logros` | JUGADOR (activo) | Bloqueados, otros roles | Consulta de vitrina de insignias |
| `/jugador/mensajes` | JUGADOR (incluso bloqueado) | Otros roles | `enviarMensajeAction` |
| `/jugador/mensajes/[id]` | JUGADOR (incluso bloqueado) | Otros roles | `enviarMensajeAction` |
| `/jugador/pagos` | JUGADOR (incluso bloqueado) | Otros roles | `reportarPagoAction` |
| `/jugador/perfil` | JUGADOR (activo) | Bloqueados, otros roles | `subirFotoAction`, `eliminarFotoAction`, `guardarAvatarAction`, `actualizarConsentimientoAction` |
| `/jugador/progreso` | JUGADOR (activo) | Bloqueados, otros roles | `validarProgresoSemanalAction` |
| `GET /api/archivos/foto/[jugadorId]` | Staff (con consentimiento) o Responsable | Anónimo, otros tenants | Sirve WebP de la foto |
| `GET /api/archivos/comprobante/[pagoMedioId]` | Escuela o Familia del pago | Anónimo, otros tenants | Sirve WebP del comprobante |
| `GET /api/archivos/escudo/[escuelaId]` | Escuela o SUPER_ADMIN | Anónimo, otros tenants | Sirve PNG del escudo |
| `GET /api/archivos/escudo-publico/[slug]` | Público | Ninguno (rate limited 60/min) | Sirve PNG de la escuela para la landing |
| `POST /api/leads` | Público | Ninguno (rate limited 8/h, honeypot) | `crearLead`, emails de aviso |
| `GET /api/cron/men-diario` | Cron Vercel (Bearer secret) | Sin secret (401) | `recalcularMenDiario` |
| `GET /api/cron/limpiar-notificaciones` | Cron Vercel (Bearer secret) | Sin secret (401) | `limpiarNotificacionesLeidas` |
| `GET /api/*-export` | Rol según export (DT/Escuela/SA en soporte) | Anónimo, sin rol o cruce de tenant | Generación y streaming de Excel |

*\*Nota: El `SUPER_ADMIN` solo puede acceder a rutas o datos de una escuela específica mediante una sesión de soporte activa.*

---

## Hallazgos

### QA-001 — Acceso ambiental del SUPER_ADMIN a fotos de menores sin sesión de soporte
- **Severidad**: CRÍTICO
- **Categoría**: seguridad
- **Rol / ruta**: `SUPER_ADMIN` / `GET /api/archivos/foto/[jugadorId]`
- **Evidencia**: `src/app/api/archivos/foto/[jugadorId]/route.ts:26-37`
  ```typescript
  // Tenant
  const mismoTenant =
    ctx.rol === "SUPER_ADMIN" || ctx.escuelaId === jugador.escuelaId;
  if (!mismoTenant) return NO_ENCONTRADA();

  // Autorización: el responsable siempre; el staff solo con consentimiento.
  const responsable = esResponsable(ctx, jugador);
  const staffConConsentimiento =
    jugador.consentimientoFoto &&
    (ctx.rol === "DT" ||
      ctx.rol === "ESCUELA_ADMIN" ||
      ctx.rol === "SUPER_ADMIN");
  if (!responsable && !staffConConsentimiento) return NO_ENCONTRADA();
  ```
- **Pasos para reproducir**:
  1. Iniciar sesión como `SUPER_ADMIN` (`admin@demo.app`).
  2. No abrir ninguna sesión de soporte en `/admin/escuelas`.
  3. Hacer un `GET` a `/api/archivos/foto/<id_de_cualquier_menor_con_consentimiento>`.
  4. La API responde con `200 OK` y el buffer binario WebP de la foto del menor.
- **Resultado esperado vs actual**:
  - *Esperado*: Conforme a `AGENTS.md` §5 y ROL-SUPER-ADMIN.md (M2), el `SUPER_ADMIN` no tiene acceso ambiental. Para acceder a cualquier dato sensible de un tenant, debe exigir `assertTenant(ctx, jugador.escuelaId)` o verificar que `ctx.soporte?.escuelaId === jugador.escuelaId`. Sin sesión activa debe retornar `404` (o `403`).
  - *Actual*: El `SUPER_ADMIN` puentea la validación de tenant (`ctx.rol === "SUPER_ADMIN"`) y obtiene la foto de menores de cualquier escuela de la plataforma sin dejar rastro de soporte.
- **Corrección sugerida**:
  Exigir sesión de soporte en `route.ts`:
  ```typescript
  if (ctx.rol === "SUPER_ADMIN") {
    if (!ctx.soporte || ctx.soporte.escuelaId !== jugador.escuelaId) {
      return NO_ENCONTRADA();
    }
  } else if (ctx.escuelaId !== jugador.escuelaId) {
    return NO_ENCONTRADA();
  }
  ```
- **Estado de verificación**: VERIFICADO en código (`src/app/api/archivos/foto/[jugadorId]/route.ts:26-37`).

---

### QA-002 — Riesgo de corrimiento de fecha de nacimiento en exportación de contactos en Excel
- **Severidad**: ALTO
- **Categoría**: datos
- **Rol / ruta**: `ESCUELA_ADMIN` / `GET /api/contactos-export`
- **Evidencia**: `src/services/export-contactos.service.ts:75`
  ```typescript
  protegerCelda(j.apellido),
  protegerCelda(j.nombre),
  j.fechaNacimiento ? format(new Date(j.fechaNacimiento), "dd/MM/yyyy") : "",
  protegerCelda(j.categoria.nombre),
  ```
- **Pasos para reproducir**:
  1. Registrar un jugador con fecha de nacimiento "2012-05-15". Zod/Prisma lo almacena como `2012-05-15T00:00:00.000Z` (medianoche UTC).
  2. Ejecutar la exportación en un proceso de servidor configurado en zona horaria local `America/Bogota` (UTC-5) o en la máquina de desarrollo de Colombia.
  3. `new Date(j.fechaNacimiento)` representa las `19:00:00` del `2012-05-14`.
  4. `format(new Date(j.fechaNacimiento), "dd/MM/yyyy")` produce `14/05/2012` en el Excel generado en lugar de `15/05/2012`.
- **Resultado esperado vs actual**:
  - *Esperado*: La fecha de nacimiento es un día de almanaque. Debe formatearse sin pasar por la zona del proceso servidor (usando `diaDeISO` de `@/lib/fecha-calendario` o extrayendo componentes UTC).
  - *Actual*: Usa `format(new Date(j.fechaNacimiento), "dd/MM/yyyy")` de `date-fns`, violando explícitamente `AGENTS.md` §6 ("Día de almanaque... pasarlo por la zona del navegador los corre un día para atrás en Colombia").
- **Corrección sugerida**:
  Usar `diaDeISO(j.fechaNacimiento.toISOString())` y formatear `DD/MM/AAAA` dividiendo el string ISO, o usar helper de almanaque.
- **Estado de verificación**: VERIFICADO en código (`src/services/export-contactos.service.ts:75`).

---

### QA-003 — Reseteo del formulario de evaluación en React 19 ante error de validación
- **Severidad**: ALTO
- **Categoría**: UX
- **Rol / ruta**: `DT` / `/dt/jugadores/[id]/evaluar`
- **Evidencia**: `src/components/dt/EvaluationForm.tsx:156, 165, 217`
  ```typescript
  // Línea 22
  const [state, action, pending] = useActionState(crearEvaluacionAction, undefined);
  ...
  // Línea 156
  <form action={action} className="space-y-6">
    ...
    // Línea 165: inputs no controlados de pruebas físicas
    <input name={name} type="number" step="0.01" min="0" placeholder={ph} required className={input} />
    ...
    // Línea 217: textarea no controlado de observaciones
    <textarea name="observacionesPrivadas" rows={3} className={input} />
  ```
- **Pasos para reproducir**:
  1. Ingresar como DT a `/dt/jugadores/<id>/evaluar`.
  2. Rellenar las 4 medidas físicas (ej. Sprint: 4.8, Salto: 32, Agilidad: 16.2, Yo-Yo: 14.2).
  3. Escribir una observación extensa en el campo "Observaciones para la familia".
  4. Marcar 7 de las 8 notas requeridas o enviar un dato que falle validación en el servidor.
  5. Al retornar la acción con error `{ ok: false, error: "..." }`, React 19 reinicia el DOM del `<form action>`.
- **Resultado esperado vs actual**:
  - *Esperado*: Los datos digitados por el entrenador deben persistir intactos para permitirle corregir el campo faltante o erróneo, tal como exige `AGENTS.md` §5 y se diseñó en `useEnvioAccion`.
  - *Actual*: El DT pierde los valores numéricos y el texto de observaciones redactado, viéndose forzado a reescribir todo desde cero.
- **Corrección sugerida**:
  Migrar `EvaluationForm.tsx` a `useEnvioAccion(crearEvaluacionAction)` con `onSubmit={enviar}` en lugar de vincular la action al prop `action` del `<form>`.
- **Estado de verificación**: VERIFICADO en código (`src/components/dt/EvaluationForm.tsx:156-218`).

---

### QA-004 — Formularios administrativos con Server Actions sin feedback de estado
- **Severidad**: MEDIO
- **Categoría**: UX
- **Rol / ruta**: `SUPER_ADMIN` y `ESCUELA_ADMIN` / `/admin/parametros`, `/escuela/branding`, `/escuela/sedes`, `/escuela/codigos`
- **Evidencia**:
  - `src/app/admin/parametros/page.tsx:82`: `<form action={actualizarParametroAction} ...>`
  - `src/actions/admin.actions.ts:152`: `export async function actualizarParametroAction(formData: FormData): Promise<void>`
  - `src/app/escuela/branding/page.tsx:33`: `<form action={actualizarBrandingAction} ...>`
  - `src/actions/escuela.actions.ts:33`: `export async function actualizarBrandingAction(formData: FormData): Promise<void>`
  - `src/app/escuela/sedes/page.tsx:67`: `<form action={crearSedeAction} ...>`
  - `src/app/escuela/sedes/page.tsx:45`: `<form action={crearCanchaAction} ...>`
  - `src/app/escuela/codigos/page.tsx:59`: `<form action={desactivarCodigoAction} ...>`
- **Pasos para reproducir**:
  1. En `/admin/parametros`, cambiar un valor y hacer clic en "Guardar".
  2. En `/escuela/branding`, modificar el color primario o frecuencia y hacer clic en "Guardar branding".
  3. En `/escuela/sedes`, ingresar una nueva sede y hacer clic en "Crear sede".
- **Resultado esperado vs actual**:
  - *Esperado*: Conforme a `AGENTS.md` §6 bis ("Cada acción del usuario tiene respuesta visible... Si el usuario tiene que preguntarse '¿pasó algo?', el diseño falló"), debe haber estado de carga en el botón (`pending`) y confirmación toast o mensaje de éxito (`MensajeAccion`). Ante error de validación, debe mostrar mensaje amigable sin romper el layout.
  - *Actual*: Las acciones retornan `Promise<void>` y lanzan excepciones directas (`throw new ValidationError(...)`) que invocan el `error.tsx` de la ruta. En caso de éxito, no hay ninguna confirmación visual explícita en pantalla.
- **Corrección sugerida**:
  Convertir las acciones para retornar `ActionResult<void>` con `mapError(e)`, y usar `useActionState` o `useEnvioAccion` con `MensajeAccion`.
- **Estado de verificación**: VERIFICADO en código.

---

### QA-005 — Ruta `/jugador/eventos` aislada sin enlace en el menú lateral ni barra móvil
- **Severidad**: MEDIO
- **Categoría**: UX
- **Rol / ruta**: `JUGADOR` / `/jugador/eventos`
- **Evidencia**: `src/app/jugador/layout.tsx:8-18` vs `src/app/jugador/eventos/page.tsx`
  ```typescript
  const NAV: NavItem[] = [
    { href: "/jugador", label: "Inicio", icon: "inicio" },
    { href: "/jugador/calendario", label: "Calendario", icon: "calendario" },
    { href: "/jugador/pagos", label: "Pagos", icon: "pagos" },
    { href: "/jugador/mensajes", label: "Mensajes", icon: "mensajes" },
    { href: "/jugador/logros", label: "Logros", icon: "logros" },
    { href: "/jugador/fondos", label: "Fondos", icon: "fondos" },
    { href: "/jugador/progreso", label: "Progreso", icon: "progreso" },
    { href: "/jugador/perfil", label: "Perfil", icon: "perfil" },
    { href: "/jugador/cuenta", label: "Mi cuenta", icon: "cuenta" },
  ];
  ```
- **Pasos para reproducir**:
  1. Entrar como acudiente/familia a `/jugador`.
  2. Observar los ítems de navegación lateral y la barra móvil inferior.
  3. La sección "Eventos" (lista consolidada de partidos y entrenamientos con filtros) no aparece en ninguna parte. Solo se puede acceder si el usuario entra al Calendario y localiza un día específico o escribe manualmente `/jugador/eventos`.
- **Resultado esperado vs actual**:
  - *Esperado*: Que `/jugador/eventos` cuente con su acceso directo en la navegación al igual que en el panel del DT (`/dt/eventos`).
  - *Actual*: La pantalla existe y está probada, pero está huérfana de navegación principal.
- **Corrección sugerida**:
  Incorporar `{ href: "/jugador/eventos", label: "Eventos", icon: "eventos" }` en `NAV` dentro de `src/app/jugador/layout.tsx`.
- **Estado de verificación**: VERIFICADO en código (`src/app/jugador/layout.tsx:8-18`).

---

### QA-006 — Placeholders sin completar en política de datos en entorno productivo
- **Severidad**: MEDIO
- **Categoría**: seguridad
- **Rol / ruta**: Público / `/legal`
- **Evidencia**: `src/app/legal/page.tsx:59-62`
  ```tsx
  El responsable del tratamiento de tus datos es <Dato>[Razón social]</Dato>, NIT <Dato>[NIT]</Dato>, con domicilio en <Dato>[Dirección, Ciudad]</Dato>, Colombia... escribe a <Dato>[correo de contacto]</Dato> o comunícate al <Dato>[teléfono]</Dato>.
  ```
- **Pasos para reproducir**:
  1. Navegar a `/legal` en cualquier navegador.
  2. Inspeccionar la sección 1 "Responsable del tratamiento".
  3. Los corchetes literales `[Razón social]`, `[NIT]`, `[Dirección, Ciudad]` se renderizan textualmente.
- **Resultado esperado vs actual**:
  - *Esperado*: Los datos de la entidad legal colombiana Responsable del Tratamiento deben estar completamente definidos para que la autorización de tratamiento de datos de menores tenga validez jurídica vinculante.
  - *Actual*: Se exhiben placeholders del borrador técnico.
- **Corrección sugerida**:
  Configurar los valores reales de la empresa a través de variables de entorno o constantes centralizadas en `@/lib/legal.ts`.
- **Estado de verificación**: VERIFICADO en código (`src/app/legal/page.tsx:59-62`).

---

### QA-007 — Carencia de rate limit o control de idempotencia en `crearEvaluacionAction`
- **Severidad**: MEDIO
- **Categoría**: funcional
- **Rol / ruta**: `DT` / `/dt/jugadores/[id]/evaluar`
- **Evidencia**: `src/actions/dt.actions.ts:83-102` y `src/services/evaluacion.service.ts:140-180`
  ```typescript
  export async function crearEvaluacionAction(
    _prev: ActionResult<ResultadoStats> | undefined,
    formData: FormData,
  ): Promise<ActionResult<ResultadoStats>> {
    try {
      const ctx = await requireAuthContext();
      // No hay rateLimit(...)
      const parsed = evaluacionSchema.safeParse(...);
      ...
      const resultado = await crearEvaluacion(ctx, parsed.data);
  ```
- **Pasos para reproducir**:
  1. Como DT, someter una evaluación con red móvil inestable o realizar un doble clic rápido en el botón "Guardar evaluación y generar carta".
  2. Se despachan dos peticiones POST concurrentes.
  3. En la base de datos se insertan dos filas en `Evaluacion` y dos en `StatsCalculados` con timestamps idénticos o separados por milisegundos.
- **Resultado esperado vs actual**:
  - *Esperado*: Toda mutación de alta sensibilidad deportiva debe contar con un guard de rate-limit (ej. `rateLimit("evaluar:${ctx.userId}:${jugadorId}", 1, 5000)`) o token de idempotencia para prevenir duplicación accidental de cartas.
  - *Actual*: No existe control de concurrencia ni rate limit en la Server Action.
- **Corrección sugerida**:
  Añadir rate limiting por DT y jugador en `crearEvaluacionAction`.
- **Estado de verificación**: VERIFICADO en código (`src/actions/dt.actions.ts:83-102`).

---

### QA-008 — Menú móvil "Más" sin captura de tecla Escape ni focus trap
- **Severidad**: MEDIO
- **Categoría**: a11y
- **Rol / ruta**: Todos los roles / Barra móvil `TabBarMovil`
- **Evidencia**: `src/components/shell/TabBarMovil.tsx:34-56`
- **Pasos para reproducir**:
  1. Abrir la aplicación en viewport móvil (375px) o emulación táctil con teclado conectado.
  2. Abrir el menú "Más" en la barra inferior.
  3. Pulsar la tecla `Escape`.
- **Resultado esperado vs actual**:
  - *Esperado*: El menú desplegable modal debe cerrarse al pulsar `Escape` y el foco debe retornar al botón "Más" según las pautas WCAG 2.1 (Criterio 2.1.1 y 2.1.2).
  - *Actual*: El menú permanece abierto; solo responde a clics directos sobre el overlay oscurecido o sobre el botón de cerrar.
- **Corrección sugerida**:
  Agregar un hook `useEffect` que escuche `keydown` para `Escape` cuando `abierto === true`.
- **Estado de verificación**: VERIFICADO en código (`src/components/shell/TabBarMovil.tsx:25-56`).

---

### QA-009 — Desactivación de código de invitación sin diálogo de confirmación
- **Severidad**: BAJO
- **Categoría**: UX
- **Rol / ruta**: `ESCUELA_ADMIN` / `/escuela/codigos`
- **Evidencia**: `src/app/escuela/codigos/page.tsx:59-67`
  ```tsx
  {c.activo && (
    <form action={desactivarCodigoAction} className="mt-3">
      <input type="hidden" name="id" value={c.id} />
      <button type="submit" className="text-xs text-alerta hover:underline">
        Desactivar
      </button>
    </form>
  )}
  ```
- **Pasos para reproducir**:
  1. En `/escuela/codigos`, hacer un toque o clic accidental en el enlace/botón rojo "Desactivar".
  2. El código pasa instantáneamente a estado inactivo (`activo: false`).
- **Resultado esperado vs actual**:
  - *Esperado*: Acciones destructivas o irreversibles que bloquean el registro de familias deben solicitar confirmación modal ("¿Seguro que deseas desactivar este código?").
  - *Actual*: Se dispara inmediatamente sin confirmación.
- **Corrección sugerida**:
  Envolver la acción en un componente con modal o `confirm()` antes del despacho.
- **Estado de verificación**: VERIFICADO en código (`src/app/escuela/codigos/page.tsx:59-67`).

---

### QA-010 — Endpoint de escudo escolar sin validación de sesión de soporte para SUPER_ADMIN
- **Severidad**: BAJO
- **Categoría**: arquitectura
- **Rol / ruta**: `SUPER_ADMIN` / `GET /api/archivos/escudo/[escuelaId]`
- **Evidencia**: `src/app/api/archivos/escudo/[escuelaId]/route.ts:19`
  ```typescript
  if (ctx.rol !== "SUPER_ADMIN" && ctx.escuelaId !== escuelaId) {
    return NO_ENCONTRADA();
  }
  ```
- **Pasos para reproducir**:
  1. Como `SUPER_ADMIN` sin sesión de soporte abierta, hacer `GET /api/archivos/escudo/<escuelaId>`.
  2. El servidor responde con el escudo de esa escuela.
- **Resultado esperado vs actual**:
  - *Esperado*: Conforme al principio de acceso cero ambiental, el `SUPER_ADMIN` no debería acceder al detalle de ningún recurso de tenant sin sesión de soporte, manteniendo uniformidad arquitectónica.
  - *Actual*: Se permite acceso directo global al escudo de cualquier escuela.
- **Corrección sugerida**:
  Validar soporte activo: `if (ctx.rol === "SUPER_ADMIN" && ctx.soporte?.escuelaId !== escuelaId) return NO_ENCONTRADA();`.
- **Estado de verificación**: VERIFICADO en código (`src/app/api/archivos/escudo/[escuelaId]/route.ts:19`).

---

### QA-011 — Ausencia de feedback accesible en switches y toggles táctiles
- **Severidad**: BAJO
- **Categoría**: a11y
- **Rol / ruta**: Varios paneles
- **Evidencia**: `src/components/ui/Badge.tsx`, `src/components/categoria/CamposRangosFisicos.tsx`
- **Pasos para reproducir**:
  1. Recorrer con lector de pantalla los campos de rango físico en `/escuela/categorias`.
  2. Algunos inputs numéricos de calibración carecen de `aria-describedby` apuntando a las notas de orientación pedagógica.
- **Resultado esperado vs actual**:
  - *Esperado*: Los textos explicativos de ayuda deben estar vinculados programáticamente a los inputs.
  - *Actual*: Se presentan únicamente como párrafos visuales adyacentes.
- **Corrección sugerida**:
  Asignar IDs a las ayudas y vincularlos con `aria-describedby`.
- **Estado de verificación**: VERIFICADO en código.

---

## Mejoras propuestas

### MEJ-001 — Recibo digital y comprobante PDF descargable para la familia
- **Para quién**: familia | escuela
- **Problema actual**: Cuando la escuela aprueba un pago en `/escuela/pagos`, la cuota pasa a `PAGADA`, pero la familia no tiene ningún documento descargable formal (PDF o recibo digital) que certifique la cancelación de la mensualidad o matrícula.
- **Propuesta**: Generar automáticamente un recibo de caja digital descargable con hash de verificación, logo de la escuela y desglose de conceptos pagados.
- **Impacto**: ALTO (disminuye reclamos de acudientes y profesionaliza la imagen del club) | **Esfuerzo**: M

---

### MEJ-002 — Modo Offline y soporte PWA para toma de datos en cancha
- **Para quién**: DT
- **Problema actual**: Muchos campos deportivos y canchas de fútbol base sufren de cobertura celular deficiente o intermitente. Si el DT pierde señal en pleno entrenamiento o jornada de medición, el Modo Sesión o el formulario de evaluación no pueden despachar a las Server Actions.
- **Propuesta**: Implementar almacenamiento local en IndexedDB con sincronización diferida al recuperar conexión (Service Worker PWA para el panel DT).
- **Impacto**: ALTO (experiencia sin fricción en el terreno de juego real) | **Esfuerzo**: L

---

### MEJ-003 — Vinculación de ejercicios recomendados a los Objetivos de Desarrollo
- **Para quién**: DT | familia
- **Problema actual**: Cuando el DT fija un objetivo (ej. "Mejorar Tiro a 75 antes del 30 de noviembre"), la familia ve la meta numérica en el hub, pero no sabe qué ejercicios específicos realizar en casa o qué hábitos practicar para alcanzarla.
- **Propuesta**: Añadir un catálogo pedagógico de ejercicios sugeridos por stat (video/instrucción corta) que el DT pueda seleccionar al asignar el objetivo.
- **Impacto**: MEDIO (gamificación y acompañamiento formativo de alto valor) | **Esfuerzo**: M

---

### MEJ-004 — Notificaciones y alertas automáticas de cobranza por WhatsApp
- **Para quién**: escuela | familia
- **Problema actual**: El cobro mensual depende de que la familia ingrese voluntariamente a la web o que el administrador escolar envíe recordatorios manualmente uno a uno.
- **Propuesta**: Integrar recordatorios automáticos vía WhatsApp Business API (o Resend Email) 3 días antes del vencimiento y el día del corte.
- **Impacto**: ALTO (reduce drásticamente la tasa de morosidad escolar) | **Esfuerzo**: M

---

### MEJ-005 — Idempotencia en Server Actions de mutación financiera y deportiva
- **Para quién**: equipo técnico
- **Problema actual**: Acciones como `reportarPagoAction`, `crearEvaluacionAction` o `registrarMembresiaAction` dependen del cliente para no duplicar peticiones ante reintentos de red o doble clic.
- **Propuesta**: Implementar cabecera o campo oculto con UUID `idempotencyKey` verificado en Redis/base de datos antes de ejecutar la mutación.
- **Impacto**: MEDIO (integridad referencial ante fallos de red móvil) | **Esfuerzo**: S

---

## Fuera de alcance / no verificado

1. **Integración bancaria en tiempo real (Pasarelas de pago PSE / Wompi / Bold)**: Fuera de alcance porque la plataforma opera actualmente con el modelo de reporte de comprobantes y validación manual por tesorería escolar.
2. **Pruebas de carga concurrentes a escala masiva (>1.000 usuarios concurrentes en Supabase)**: No ejecutadas localmente para no saturar el pooler remoto de prueba; verificado el límite de conexiones y la arquitectura de rate limit en Upstash.
3. **Validación legal externa de la Política de Habeas Data**: La auditoría detectó los campos con placeholders en `/legal`, pero la redacción definitiva del texto legal requiere dictamen de un abogado especialista en derecho colombiano de protección de datos personales.
