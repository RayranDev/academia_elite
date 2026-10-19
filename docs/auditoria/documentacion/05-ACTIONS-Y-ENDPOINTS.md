# Catálogo de Server Actions y Route Handlers

Este documento cataloga de forma exhaustiva las 28 suites de Server Actions (`src/actions/`) y los 19 Route Handlers (`src/app/api/`) del sistema, detallando sus roles autorizados, guards de seguridad, esquemas de entrada Zod, estructuras de retorno y efectos colaterales (auditoría, correos, notificaciones, revalidación de caché).

---

## 1. Convenciones y Contratos de Comunicación

### 1.1 Contrato de Retorno de Server Actions (`src/lib/action-result.ts`)
La gran mayoría de las Server Actions devuelven el tipo discriminado `ActionResult<T>`:
```typescript
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; issues?: Record<string, string[]> };
```
- **Mapeo de errores (`mapError`)**: Atrapa excepciones del dominio (`ValidationError`, `ForbiddenError`, `TenantMismatchError`), preserva las señales de control de Next.js (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`) re-lanzándolas, y convierte errores desconocidos en mensajes genéricos para evitar fugas de información interna.
- **Acciones `Promise<void>`**: Utilizadas en formularios HTML simples sin `useActionState` donde el resultado es una redirección inmediata (`redirect()`) o manejado por `error.tsx` del segmento.

### 1.2 Barrera de Seguridad en el Borde
Toda acción protegida inicia resolviendo el contexto del usuario:
```typescript
const ctx = await requireAuthContext();
```
Y aplicando guards declarativos de `src/lib/auth/guards.ts`:
- `requireRole(ctx, ROLES_PERMITIDOS)`: Valida el rol activo en sesión.
- `assertTenant(ctx, escuelaId)`: Garantiza que el recurso pertenece a la escuela del usuario (lanza `TenantMismatchError` que resuelve en 404).
- `assertSoportePuedeEscribir(ctx)`: Bloquea mutaciones de `SUPER_ADMIN` si la sesión de soporte es de solo lectura.
- `assertOwnPlayer(ctx, jugadorId, propios)`: Restringe al familiar únicamente a sus hijos vinculados.

---

## 2. Catálogo de Server Actions (`src/actions/`)

| Archivo / Acción | Rol Requerido | Guards Aplicados | Entrada (Zod / Params) | Retorno | Efectos Colaterales (AuditLog / Emails / Cache) |
|---|---|---|---|---|---|
| **`alta-jugador.actions.ts`** | | | | | |
| `crearJugadorCompletoAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `altaJugadorCompletaSchema` | `ActionResult<{ jugadorId, emailTutor, passwordTemporal? }>` | Crea Usuario, Jugador, FichaMedica, Membresia. AuditLog: `JUGADOR_CREADO`. Email: bienvenida con credenciales si es nuevo tutor. `revalidatePath('/escuela/jugadores')`. |
| **`admin.actions.ts`** | | | | | |
| `convertirLeadAction` | `SUPER_ADMIN` | `requireRole` | `convertirLeadSchema` | `ActionResult<{ adminEmail, passwordTemporal }>` | Convierte Lead a Escuela, crea Usuario admin escuela, seed de parámetros. AuditLog: `LEAD_CONVERTIDO`. Email: resend bienvenida. Revalida `/admin/leads`, `/admin/escuelas`. |
| `crearEscuelaAction` | `SUPER_ADMIN` | `requireRole` | `crearEscuelaSchema` | `ActionResult<{ adminEmail, passwordTemporal }>` | Crea Escuela directa con su admin. AuditLog: `ESCUELA_CREADA`. Revalida `/admin/escuelas`. |
| `editarLeadAction` | `SUPER_ADMIN` | `requireRole` | `editarLeadSchema` | `ActionResult` | Actualiza estado/datos del lead comercial. Revalida `/admin/leads`. |
| `agregarNotaLeadAction` | `SUPER_ADMIN` | `requireRole` | `agregarNotaSchema` | `ActionResult` | Agrega nota de seguimiento. Revalida `/admin/leads`. |
| `actualizarParametroAction` | `SUPER_ADMIN` | `requireRole` | `actualizarParametroSchema` | `ActionResult` | Modifica `ParametroFormula`. AuditLog: `PARAMETRO_ACTUALIZADO`. Revalida `/admin/formula`. |
| `fijarMetricaEscuelaAction` | `SUPER_ADMIN` | `requireRole` | `clave: string, valor: number` | `ActionResult` | Override de parámetro a nivel escuela. Revalida `/admin/escuelas/[id]`. |
| `quitarMetricaEscuelaAction`| `SUPER_ADMIN` | `requireRole` | `clave: string` | `ActionResult` | Elimina override de escuela. Revalida `/admin/escuelas/[id]`. |
| `fijarRangosCategoriaAction`| `SUPER_ADMIN` | `requireRole` | `editarRangosCategoriaSchema` | `ActionResult` | Define percentiles físicos de evaluación. Revalida `/admin/formula`. |
| **`arancel.actions.ts`** | | | | | |
| `crearArancelAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `arancelSchema` | `ActionResult` | Registra arancel/tarifa base. AuditLog: `ARANCEL_CREADO`. Revalida `/escuela/aranceles`. |
| `editarArancelAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `arancelSchema` | `ActionResult` | Modifica tarifa. AuditLog: `ARANCEL_EDITADO`. Revalida `/escuela/aranceles`. |
| `desactivarArancelAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `id: string` | `ActionResult` | Desactiva arancel (soft-disable). Revalida `/escuela/aranceles`. |
| **`auth.actions.ts`** | | | | | |
| `login` | Público | Rate limit en borde | `loginSchema` (`email, password`) | `ActionResult<{ rol, urlDestino }>` | Autenticación con bcrypt, setea cookies de sesión HTTP-only NextAuth. Registro de último acceso. |
| `logout` | Autenticado | Ninguno | Ninguna | `Promise<void>` | Invalida sesión NextAuth y redirige a `/login`. |
| **`categoria-rango.actions.ts`** | | | | | |
| `editarRangosCategoriaAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `editarRangosCategoriaSchema` | `ActionResult` | Ajusta percentiles físicos de evaluación para categorías de su escuela. Revalida `/escuela/categorias`. |
| **`concepto-cobro.actions.ts`** | | | | | |
| `crearConceptoAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `conceptoCobroSchema` | `ActionResult` | Crea concepto adicional (torneo, indumentaria, matrícula). Revalida `/escuela/conceptos`. |
| `editarConceptoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `conceptoCobroSchema` | `ActionResult` | Edita concepto. Revalida `/escuela/conceptos`. |
| `borrarConceptoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `id: string` | `ActionResult` | Elimina concepto si no tiene cuotas atadas. Revalida `/escuela/conceptos`. |
| **`cuenta.actions.ts`** | | | | | |
| `actualizarMiJugadorAction` | `JUGADOR` | `requireRole`, `assertOwnPlayer` | `actualizarMiJugadorSchema` | `ActionResult` | Actualiza EPS, posición secundaria, dorsal preferido. Revalida `/jugador/perfil`. |
| `actualizarMisDatosAction` | Todos | `requireAuthContext` | `actualizarMisDatosSchema` | `ActionResult` | Modifica teléfono y nombre propio del tutor/DT/admin. Revalida `/cuenta` o perfil. |
| `solicitarCambioEmailAction` | Todos | `requireAuthContext` | `solicitarCambioEmailSchema` | `ActionResult` | Envía token de verificación al nuevo correo. Email: verificación. |
| `confirmarCambioEmailAction` | Todos | `requireAuthContext` | `confirmarCambioEmailSchema` | `ActionResult` | Valida token y actualiza email de cuenta. AuditLog: `EMAIL_ACTUALIZADO`. |
| **`descuento.actions.ts`** | | | | | |
| `crearDescuentoReglaAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `descuentoReglaSchema` | `ActionResult` | Crea regla de beca/hermanos/descuento comercial. Revalida `/escuela/descuentos`. |
| `editarDescuentoReglaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `descuentoReglaSchema` | `ActionResult` | Edita porcentajes o vigencia de regla. Revalida `/escuela/descuentos`. |
| `desactivarDescuentoReglaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `id: string` | `ActionResult` | Desactiva regla. Revalida `/escuela/descuentos`. |
| `asignarJugadoresDescuentoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `reglaId, jugadorIds[]` | `ActionResult` | Asigna regla masivamente a jugadores. Revalida `/escuela/descuentos`. |
| **`dt.actions.ts`** | | | | | |
| `aprobarSolicitudAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult` | Aprueba solicitud de vinculación de alumno. Notificación al tutor. Revalida `/dt/solicitudes`. |
| `rechazarSolicitudAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult` | Rechaza solicitud. Revalida `/dt/solicitudes`. |
| `crearEvaluacionAction` | `DT` | `requireRole`, `assertTenant` | `evaluacionSchema` | `ActionResult<ResultadoStats>` | Ejecuta motor de stats, persiste Evaluación inmutable, actualiza carta activa. Notificación al jugador. Revalida `/dt/evaluar`, `/dt/jugadores/[id]`. |
| `crearObjetivoAction` | `DT` | `requireRole`, `assertTenant` | `objetivoSchema` | `ActionResult` | Crea meta de mejora para el jugador. Revalida `/dt/jugadores/[id]`. |
| `importarEvaluacionesAction`| `DT` | `requireRole`, `requireEscuela` | `archivo: File` | `ActionResult<ResultadoImportEval>` | Procesa Excel masivo de evaluaciones. AuditLog: `EVALUACIONES_IMPORTADAS`. Revalida `/dt`. |
| **`egreso.actions.ts`** | | | | | |
| `registrarEgresoAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `egresoSchema` | `ActionResult` | Registra gasto operativo (canchas, sueldos, materiales). Revalida `/escuela/egresos`. |
| `eliminarEgresoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `id: string` | `ActionResult` | Elimina egreso registrado por error. Revalida `/escuela/egresos`. |
| **`escuela.actions.ts`** | | | | | |
| `actualizarBrandingAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `brandingSchema` (`colorPrimario, lema`) | `ActionResult` | Actualiza CSS `--brand` de la escuela. Revalida `/escuela/configuracion`. |
| `subirEscudoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `escudo: File` | `ActionResult<{ escudoUrl }>` | Valida imagen, stripped EXIF, almacena y actualiza logo. Revalida `/escuela/configuracion`. |
| `crearCategoriaAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `categoriaSchema` | `ActionResult` | Crea categoría deportiva (ej. Sub-13). Revalida `/escuela/categorias`. |
| `crearSedeAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `sedeSchema` | `Promise<void>` | Crea sede física. Redirige o revalida `/escuela/sedes`. |
| `crearCanchaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `canchaSchema` | `Promise<void>` | Asocia cancha a una sede. Revalida `/escuela/sedes`. |
| `crearDtAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `crearDtSchema` | `ActionResult<{ email, passwordTemporal }>` | Da de alta usuario DT con password temporal criptográfico. Revalida `/escuela/dts`. |
| `crearCodigoAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `crearCodigoSchema` | `ActionResult<{ codigo }>` | Genera token alfanumérico para registro autónomo. Revalida `/escuela/codigos`. |
| `desactivarCodigoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `codigoId: string` | `Promise<void>` | Invalida código de invitación. Revalida `/escuela/codigos`. |
| `enviarCodigoInvitacionAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `codigoId, email` | `ActionResult` | Envía código por correo mediante plantilla transaccional. |
| **`evento.actions.ts`** | | | | | |
| `crearEventoAction` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `requireEscuela` | `eventoSchema` | `ActionResult<{ eventoId }>` | Programa partido, entrenamiento o torneo con lista de convocados. Notificaciones. Revalida `/escuela/eventos`, `/dt/agenda`. |
| `confirmarConvocatoriaAction`| `JUGADOR` | `requireRole`, `assertOwnPlayer`| `eventoId, asistencia: 'SI'\|'NO'` | `ActionResult` | Confirma o rechaza llamado al evento. Revalida `/jugador/eventos`. |
| `pasarListaAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `eventoId, asistencias[]` | `ActionResult` | Marca presencia, ausencia, tardanza o justificación. Revalida `/dt/agenda`. |
| `cargarResultadoAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `resultadoSchema` | `ActionResult` | Cierra partido con marcador, goles y figuras. Revalida `/dt/agenda`. |
| `guardarEstadisticasAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `eventoId, statsJugadores[]` | `ActionResult` | Registra minutos jugados, goles, asistencias y tarjetas. Revalida `/dt/agenda`. |
| `editarEventoAction` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `assertTenant` | `editarEventoSchema` | `ActionResult` | Modifica fecha/lugar de evento. Revalida calendarios. |
| `cancelarEventoAction` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `assertTenant` | `eventoId, motivo` | `ActionResult` | Cancela evento y notifica a convocados. Revalida agendas. |
| **`fondo.actions.ts`** | | | | | |
| `crearFondoAction` | `SUPER_ADMIN` | `requireRole` | `fondoSchema` | `ActionResult` | Da de alta fondo cosmético de carta (CSS/efectos). Revalida `/admin/fondos`. |
| `editarFondoAction` | `SUPER_ADMIN` | `requireRole` | `fondoSchema` | `ActionResult` | Modifica reglas CSS o nivel de desbloqueo. Revalida `/admin/fondos`. |
| `eliminarFondoAction` | `SUPER_ADMIN` | `requireRole` | `id: string` | `ActionResult` | Elimina fondo del catálogo global. Revalida `/admin/fondos`. |
| **`gestion.actions.ts`** | | | | | |
| `obtenerFichaMedicaAction` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult<FichaMedica>` | Retorna datos clínicos y aptitud física. |
| `actualizarFichaMedicaAction`| `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `fichaMedicaSchema` | `ActionResult` | Actualiza EPS, alergias, grupo sanguíneo y vencimiento de apto médico. Revalida `/escuela/jugadores/[id]`. |
| `editarJugadorAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `editarJugadorSchema` | `ActionResult` | Modifica nombre, categoría, posición, dorsal. Revalida `/escuela/jugadores/[id]`. |
| `cambiarEstadoJugadorAction`| `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId, estado` | `ActionResult` | Cambia estado (`ACTIVO`, `INACTIVO`, `LESIONADO`). Revalida `/escuela/jugadores`. |
| `eliminarJugadorAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult` | Baja lógica (`deletedAt: now()`). AuditLog: `JUGADOR_ELIMINADO`. Revalida `/escuela/jugadores`. |
| `restaurarJugadorAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult` | Restaura alumno eliminado (`deletedAt: null`). AuditLog: `JUGADOR_RESTAURADO`. Revalida `/escuela/jugadores`. |
| `bloquearAccesoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId, motivo` | `ActionResult` | Bloquea visualización de carta/semana por mora u orden directiva. AuditLog: `ACCESO_BLOQUEADO`. Revalida. |
| `desbloquearAccesoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult` | Levanta bloqueo. AuditLog: `ACCESO_DESBLOQUEADO`. Revalida. |
| `bloquearAccesoJugadoresAction`| `ESCUELA_ADMIN`| `requireRole`, `assertTenant` | `jugadorIds[], motivo` | `ActionResult` | Bloqueo por lote. AuditLog masivo. Revalida. |
| `resetPasswordFamiliaAction`| `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `usuarioId: string` | `ActionResult<{ passwordTemporal }>` | Genera nueva clave temporal criptográfica para el tutor. AuditLog. Revalida. |
| `resetPasswordFamiliaDtAction`| `DT` | `requireRole`, `assertTenant` | `usuarioId: string` | `ActionResult<{ passwordTemporal }>` | Clave temporal generada por DT para familias sin acceso. Revalida. |
| `actualizarDtAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `editarDtSchema` | `ActionResult` | Modifica nombre, teléfono y categorías asignadas al DT. Revalida `/escuela/dts`. |
| `resetPasswordDtAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `usuarioId: string` | `ActionResult<{ passwordTemporal }>` | Resetea contraseña de DT. AuditLog. Revalida `/escuela/dts`. |
| `editarUsuarioAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `editarUsuarioSchema` | `ActionResult` | Edita datos de usuarios del staff. Revalida `/escuela/staff`. |
| `resetPasswordUsuarioAction`| `ESCUELA_ADMIN`| `requireRole`, `assertTenant` | `usuarioId: string` | `ActionResult<{ passwordTemporal }>` | Resetea clave de usuario interno. AuditLog. Revalida. |
| `editarEscuelaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `editarEscuelaSchema` | `ActionResult` | Modifica datos institucionales (nombre, teléfono, dirección). Revalida. |
| `cambiarMiPasswordAction` | Todos | `requireAuthContext` | `cambiarPasswordSchema` | `ActionResult` | Actualiza password tras verificar contraseña actual. Revalida. |
| `importarJugadoresAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `archivo: File` | `ActionResult<{ total, creados }>`| Carga masiva de alumnos vía Excel. AuditLog: `JUGADORES_IMPORTADOS`. Revalida `/escuela/jugadores`. |
| **`jugador.actions.ts`** | | | | | |
| `subirFotoAction` | `JUGADOR`, `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertOwnPlayer`| `jugadorId, foto: File` | `ActionResult<{ url }>` | Pipeline WebP, stripped EXIF, UUID, subida a storage privado. Revalida cartas. |
| `actualizarAvatarAction` | `JUGADOR` | `requireRole`, `assertOwnPlayer`| `jugadorId, avatarConfig` | `ActionResult` | Genera avatar SVG DiceBear localmente sin llamadas externas. Revalida `/jugador/perfil`. |
| `equiparFondoAction` | `JUGADOR` | `requireRole`, `assertOwnPlayer`| `jugadorId, fondoId` | `ActionResult` | Equipa fondo cosmético en la carta si cumple el nivel requerido. Revalida `/jugador/carta`. |
| `actualizarConsentimientoAction`| `JUGADOR`| `requireRole`, `assertOwnPlayer`| `jugadorId, consentimiento: boolean`| `ActionResult` | Registra consentimiento de Habeas Data para uso de imagen. AuditLog: `CONSENTIMIENTO_ACTUALIZADO`. |
| **`landing.actions.ts`** | | | | | |
| `actualizarLandingAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `landingConfigSchema` | `ActionResult` | Configura textos, beneficios y enlaces de la página pública de captación. Revalida `/escuela/landing`. |
| **`logro.actions.ts`** | | | | | |
| `crearLogroAdminAction` | `SUPER_ADMIN` | `requireRole` | `logroGlobalSchema` | `ActionResult` | Registra logro e insignia en el catálogo global. Revalida `/admin/logros`. |
| `editarLogroAdminAction` | `SUPER_ADMIN` | `requireRole` | `logroGlobalSchema` | `ActionResult` | Modifica icono, rareza o puntos de logro global. Revalida `/admin/logros`. |
| `activarLogroAdminAction` | `SUPER_ADMIN` | `requireRole` | `id, activo` | `ActionResult` | Habilita/deshabilita logro global. Revalida `/admin/logros`. |
| `crearLogroDtAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `logroEscuelaSchema` | `ActionResult` | Crea insignia personalizada de escuela. Revalida `/dt/logros`. |
| `configurarLogroDtAction` | `DT`, `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `logroEscuelaSchema` | `ActionResult` | Edita logro de escuela. Revalida `/dt/logros`. |
| `otorgarLogroDtAction` | `DT` | `requireRole`, `assertTenant` | `logroId, jugadorId, motivo` | `ActionResult` | Asigna insignia a alumno. Notificación al jugador. Revalida carta. |
| **`membresia.actions.ts`** | | | | | |
| `registrarMembresiaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `membresiaSchema` | `ActionResult` | Asocia plan arancelario a alumno. AuditLog. Revalida `/escuela/membresias`. |
| `generarCuotasAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `generarCuotasSchema` | `ActionResult<{ generadas }>` | Genera mensualidades para el período escolar. Revalida `/escuela/membresias`. |
| `cambiarEstadoMembresiaAction`| `ESCUELA_ADMIN`| `requireRole`, `assertTenant` | `membresiaId, estado` | `ActionResult` | Suspende, activa o cancela membresía. Revalida `/escuela/membresias`. |
| **`mensaje.actions.ts`** | | | | | |
| `crearConversacionAction` | `DT`, `ESCUELA_ADMIN`, `JUGADOR`| `requireRole`, `assertTenant` | `conversacionSchema` | `ActionResult<{ conversacionId }>`| Inicia hilo privado. Notificación a destinatarios. Revalida `/mensajes`. |
| `responderAction` | Todos autenticados | `requireRole`, `assertTenant` | `mensajeSchema` | `Promise<void>` | Envía mensaje al hilo existente. Revalida `/mensajes/[id]`. |
| `publicarAnuncioAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `anuncioSchema` | `ActionResult<{ anuncioId }>` | Publica circular masiva a la comunidad escolar. Notificación masiva. Revalida `/anuncios`. |
| `eliminarAnuncioAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `anuncioId: string` | `ActionResult` | Elimina circular. Revalida `/anuncios`. |
| **`notificacion.actions.ts`** | | | | | |
| `marcarLeidaAction` | Todos autenticados | `requireAuthContext` | `id: string` | `ActionResult` | Actualiza `leida: true` en notificación personal. |
| `marcarTodasLeidasAction` | Todos autenticados | `requireAuthContext` | Ninguna | `ActionResult` | Marca leídas todas las alertas del usuario activo. |
| **`otp.actions.ts`** | | | | | |
| `solicitarOtpAction` | Público | Rate limit en borde | `emailSchema` | `ActionResult` | Genera código OTP de 6 dígitos, expira en 10 min. Email transaccional. |
| `ingresarConOtpAction` | Público | Rate limit en borde | `otpAuthSchema` | `ActionResult<{ urlDestino }>` | Verifica código de un solo uso, autentica sesión NextAuth sin password. |
| **`pago.actions.ts`** | | | | | |
| `reportarPagoAction` | `JUGADOR` | `requireRole`, `assertTenant` | `reportarPagoSchema` + `comprobante: File` | `ActionResult<{ pagoId }>` | Sube recibo bancario, crea Pago en estado `PENDIENTE`. Revalida `/jugador/pagos`. |
| `cuotasReportablesEscuelaAction`| `ESCUELA_ADMIN`| `requireRole`, `assertTenant` | `jugadorId: string` | `ActionResult<Cuota[]>` | Consulta saldos pendientes para cobro manual en oficina. |
| `registrarPagoEscuelaAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `pagoEscuelaSchema` | `ActionResult` | Registra cobro en efectivo/datáfono directo. Marca cuota `PAGADA`. AuditLog. Revalida `/escuela/pagos`. |
| `aprobarPagoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `pagoId, metodo, ref` | `ActionResult` | Concilia transferencia familiar, liquida cuota. Notificación. AuditLog: `PAGO_APROBADO`. Revalida. |
| `aprobarPagosLoteAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `pagoIds[]` | `ActionResult<{ aprobados }>` | Conciliación bancaria masiva. AuditLogs múltiples. Revalida `/escuela/pagos`. |
| `rechazarPagoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `pagoId, motivo` | `ActionResult` | Rechaza comprobante ilegible o no acreditado. Notificación al tutor. Revalida `/escuela/pagos`. |
| `anularPagoAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `pagoId, motivo` | `ActionResult` | Revierte pago liquidado por error, reabre cuotas. AuditLog: `PAGO_ANULADO`. Revalida. |
| **`progreso.actions.ts`** | | | | | |
| `validarSemanaAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `fechaLunesISO: string` | `ActionResult<{ recalculados }>` | Ejecuta cierre semanal y actualización de curva de desarrollo (MEN). Revalida `/escuela/progreso`. |
| `validarSemanaDtAction` | `DT` | `requireRole`, `requireEscuela` | `fechaLunesISO: string` | `ActionResult<{ recalculados }>` | Ejecuta validación de asistencia y micro-ciclo semanal para su categoría. Revalida `/dt`. |
| **`recuperacion.actions.ts`** | | | | | |
| `recuperarPasswordAction` | Público | Rate limit en borde | `emailSchema` | `ActionResult` | Envía enlace temporal para restablecimiento. Email transaccional. |
| `fijarPasswordAction` | Público | Rate limit en borde | `fijarPasswordSchema` (`token, password`) | `ActionResult` | Valida token criptográfico y fija nueva clave bcrypt. |
| `reenviarVerificacionAction`| Todos autenticados | `requireAuthContext` | Ninguna | `ActionResult` | Reenvía correo de confirmación de email. |
| `verificarMiEmailAction` | Todos autenticados | `requireAuthContext` | `token: string` | `ActionResult` | Valida token y marca `emailVerified = true`. |
| **`registro.actions.ts`** | | | | | |
| `registrarConCodigoAction` | Público | Rate limit en borde | `registroCodigoSchema` | `ActionResult<{ jugadorId }>` | Registro autónomo de familia mediante código de escuela. Vincula tutor y alumno. |
| `vincularHijoAction` | `JUGADOR` | `requireRole` | `vincularHijoSchema` (`codigo`) | `ActionResult<{ jugadorId }>` | Asocia un segundo o tercer hijo a la misma cuenta parental. Revalida `/jugador/perfil`. |
| **`sesion.actions.ts`** | | | | | |
| `iniciarSesionAction` | `DT` | `requireRole`, `assertTenant` | `eventoId: string` | `ActionResult` | Inicia sesión de entrenamiento/partido en vivo. Cambia estado a `EN_CURSO`. Revalida `/dt/sesion/[id]`. |
| `marcarAsistenciaAction` | `DT` | `requireRole`, `assertTenant` | `eventoId, jugadorId, estado` | `ActionResult` | Pasa lista en tiempo real durante la sesión. Revalida `/dt/sesion/[id]`. |
| `reprogramarEIniciarSesionAction`| `DT`| `requireRole`, `assertTenant` | `eventoId, nuevaFecha` | `ActionResult` | Ajusta hora e inicia entrenamiento sobre la marcha. Revalida. |
| `cerrarSesionAction` | `DT` | `requireRole`, `assertTenant` | `eventoId: string` | `ActionResult` | Cierra evento, calcula asistencias y computa minutos. Revalida `/dt/agenda`. |
| `agregarConvocadoAction` | `DT` | `requireRole`, `assertTenant` | `eventoId, jugadorId` | `ActionResult` | Suma a un alumno que llegó a la cancha sin convocatoria previa. Revalida. |
| `crearObservacionAction` | `DT` | `requireRole`, `assertTenant` | `observacionSchema` | `ActionResult` | Guarda nota técnica confidencial sobre el desempeño del alumno. Revalida. |
| `registrarGolAction` | `DT` | `requireRole`, `assertTenant` | `eventoId, jugadorId, minuto` | `ActionResult` | Anota gol en partido en vivo. Revalida marcador. |
| `avanzarPeriodoAction` | `DT` | `requireRole`, `assertTenant` | `eventoId: string` | `ActionResult` | Cambia de 1T a Entretiempo o 2T. Revalida. |
| `registrarPenalAction` | `DT` | `requireRole`, `assertTenant` | `eventoId, jugadorId, resultado`| `ActionResult` | Registra penal en definición. Revalida. |
| `fijarTarjetasAction` | `DT` | `requireRole`, `assertTenant` | `eventoId, jugadorId, amarillas, roja`| `ActionResult` | Actualiza disciplina del partido. Revalida. |
| **`soporte.actions.ts`** | | | | | |
| `iniciarSoporteAction` | `SUPER_ADMIN` | `requireRole` | `iniciarSoporteSchema` (`escuelaId, motivo`) | `ActionResult` | Abre sesión de soporte técnico con auditoría estricta. Estado inicial: SOLO LECTURA. Revalida. |
| `finalizarSoporteAction` | `SUPER_ADMIN` | `requireRole` | Ninguna | `ActionResult` | Cierra sesión de soporte y revoca accesos temporales. AuditLog: `SOPORTE_FINALIZADO`. |
| `habilitarEscrituraSoporteAction`| `SUPER_ADMIN`| `requireRole` | `habilitarEscrituraSchema` (`motivo`) | `ActionResult` | Eleva sesión de soporte a modo ESCRITURA previa justificación auditada. |
| **`staff.actions.ts`** | | | | | |
| `crearStaffAction` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | `staffSchema` | `ActionResult<{ passwordTemporal }>` | Da de alta preparador físico, kinesiólogo o administrativo. Revalida `/escuela/staff`. |
| `editarStaffAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `staffSchema` | `ActionResult` | Edita cargo y permisos de staff. Revalida `/escuela/staff`. |
| `eliminarStaffAction` | `ESCUELA_ADMIN` | `requireRole`, `assertTenant` | `id: string` | `ActionResult` | Desvincula miembro del staff. Revalida `/escuela/staff`. |

---

## 3. Catálogo de Route Handlers (`src/app/api/`)

| Ruta HTTP | Método | Rol / Auth | Seguridad / Rate Limit | Propósito / Respuesta |
|---|---|---|---|---|
| `/api/archivos/foto/[jugadorId]` | `GET` | Autenticado | Guard `assertTenant` / `assertOwnPlayer`. `Cache-Control: no-store`. | Sirve la foto oficial de un menor tras verificar permisos. Servida como WebP desde storage privado. *(Nota: QA-001 halló bypass de SUPER_ADMIN sin sesión de soporte activa).* |
| `/api/archivos/comprobante/[pagoId]`| `GET`| `ESCUELA_ADMIN`, `JUGADOR`| Valida tenant y pertenencia de la cuota. `Cache-Control: private, no-store`. | Retorna imagen o PDF del comprobante bancario reportado. |
| `/api/archivos/escudo/[escuelaId]` | `GET` | Autenticado | Valida sesión activa. | Retorna el escudo institucional en formato WebP recomprimido. |
| `/api/archivos/escudo-publico/[slug]`| `GET`| Público | Libre (CDN friendly) | Permite renderizar el escudo en landings públicas de escuelas y formularios de inscripción. |
| `/api/asistencia-export` | `GET` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `requireEscuela` | Genera y descarga reporte Excel (`.xlsx`) con sábana de asistencias por categoría y período. |
| `/api/auditoria-export` | `GET` | `SUPER_ADMIN`, `ESCUELA_ADMIN`| `requireRole`, `assertTenant` | Exporta logs de auditoría en formato Excel para control de cumplimiento y seguridad. |
| `/api/contactos-export` | `GET` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | Descarga base de datos de tutores, teléfonos y emergencias en Excel. *(Nota: QA-002 halló bug de zona horaria en fecha de nacimiento).* |
| `/api/evaluaciones-export` | `GET` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `requireEscuela` | Exporta historial de tests físicos, notas técnicas y OVR en Excel. |
| `/api/jugadores-export` | `GET` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | Exporta listado completo de deportistas matriculados con estado, categoría y datos médicos. |
| `/api/membresias-export` | `GET` | `ESCUELA_ADMIN` | `requireRole`, `requireEscuela` | Exporta padrón de afiliados, aranceles pactados y estados de cuenta. |
| `/api/resultados-export` | `GET` | `ESCUELA_ADMIN`, `DT` | `requireRole`, `requireEscuela` | Exporta balance de partidos jugados, victorias, goles anotados y estadísticas de competencia. |
| `/api/plantilla-evaluaciones` | `GET` | `DT`, `ESCUELA_ADMIN` | `requireRole` | Descarga plantilla oficial en Excel formateada con macros/fórmulas para carga masiva de tests. |
| `/api/plantilla-jugadores` | `GET` | `ESCUELA_ADMIN` | `requireRole` | Descarga plantilla Excel oficial para importación masiva de nuevos alumnos. |
| `/api/plantilla-simulador` | `GET` | `ESCUELA_ADMIN`, `SUPER_ADMIN`| `requireRole` | Descarga simulador de stats en Excel con fórmulas del motor v1.1 embebidas. |
| `/api/leads` | `POST` | Público | Rate limit en memoria (8 req/h por IP). Valida Zod + sanitización `textoSeguro`. | Recepción de formularios comerciales en landing pública. Notificación por correo al equipo. |
| `/api/salir` | `GET`, `POST`| Público | Limpieza de cookies de sesión | Endpoint de deslogueo y redirección limpia. |
| `/api/auth/[...nextauth]` | `GET`, `POST`| NextAuth interno | Manejo de sesión NextAuth v4 | Enrutador interno del protocolo de autenticación JWT. |
| `/api/cron/men-diario` | `GET` | Vercel Cron | `Authorization: Bearer CRON_SECRET` | Proceso batch nocturno: calcula y aplica la curva de desarrollo (MEN) para todos los alumnos activos. |
| `/api/cron/limpiar-notificaciones`| `GET`| Vercel Cron | `Authorization: Bearer CRON_SECRET` | Proceso batch mensual: purga notificaciones leídas con más de 90 días de antigüedad. |
