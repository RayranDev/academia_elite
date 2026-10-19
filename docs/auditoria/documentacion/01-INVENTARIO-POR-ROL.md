# Inventario Funcional por Rol

Este documento inventaría cada una de las rutas y pantallas (`page.tsx`) de la plataforma, organizadas por rol operativo. Para cada ruta se detalla su propósito de negocio, qué elementos y datos visualiza el usuario, qué acciones interactivas puede ejecutar, qué Server Actions o servicios se invocan y las reglas de negocio aplicables.

---

## 1. Rutas Públicas y de Acceso Común

### 1.1 `/` — Raíz / Entrada
- **Propósito**: Puerta de entrada a la aplicación.
- **Qué ve el usuario**: Redirección automática si hay sesión activa hacia el panel correspondiente (`/admin`, `/escuela`, `/dt`, `/jugador`). Si no hay sesión, muestra la bienvenida pública con accesos al login, registro con código e información institucional.
- **Acciones posibles**: Navegar a `/login` o `/codigo`.
- **Server Action / Servicio**: `src/proxy.ts` (evaluación de sesión y rol).

### 1.2 `/(auth)/login` — Inicio de Sesión
- **Propósito**: Autenticación de usuarios existentes mediante correo electrónico y contraseña.
- **Qué ve el usuario**: Formulario de login (`LoginForm.tsx`) con campos de correo y contraseña, enlace a recuperación de contraseña (`/recuperar`) y acceso alternativo mediante código de un solo uso OTP (`/codigo`).
- **Acciones posibles**: Enviar credenciales, alternar visibilidad de contraseña, solicitar inicio con OTP.
- **Server Action / Servicio**: Invoca `login(formData)` en `src/actions/auth.actions.ts`.
- **Reglas de negocio**:
  - Rate limiting estricto de 5 intentos por minuto por combinación de IP y correo electrónico (`rateLimit`).
  - Respuestas de error intencionalmente genéricas ("Credenciales inválidas") para impedir la enumeración de cuentas.
  - Al autenticar con éxito, redirige al panel según el rol (`panelPorRol`).

### 1.3 `/(auth)/registro/[codigo]` — Registro de Familia con Código de Invitación
- **Propósito**: Auto-registro de un nuevo acudiente y alta inicial de su hijo/a utilizando un código emitido por la escuela.
- **Qué ve el usuario**: Formulario de registro (`RegistroForm.tsx`) con nombre de la escuela y categoría preseleccionada según el código de la URL, datos personales del acudiente (nombre, email, teléfono, contraseña), datos del menor (nombre, apellido, fecha de nacimiento, posición) y aceptación obligatoria de la Política de Tratamiento de Datos Personales.
- **Acciones posibles**: Registrarse como nuevo usuario o vincular a un menor si el acudiente ya dispone de cuenta previa (`VincularHijoForm.tsx`).
- **Server Action / Servicio**: `registrarConCodigoAction` o `vincularHijoAction` en `src/actions/registro.actions.ts`.
- **Reglas de negocio**:
  - El código debe estar `activo: true`, no haber alcanzado sus `usosMaximos` y su fecha `expiraEn` debe ser posterior a la actual.
  - El jugador nace en estado `PENDIENTE` (no aparece en la plantilla activa hasta que el DT lo aprueba).
  - Guarda la prueba de aceptación legal (`terminosAceptadosEn`, `terminosVersion`).

### 1.4 `/codigo` — Acceso Rápido con Código OTP
- **Propósito**: Acceso sin contraseña mediante código de 6 dígitos enviado por correo electrónico.
- **Qué ve el usuario**: Formulario en dos pasos (`OtpLoginForm.tsx`): 1. Ingreso de correo electrónico. 2. Ingreso del código numérico de 6 dígitos recibido.
- **Acciones posibles**: Solicitar código OTP, validar código e ingresar.
- **Server Action / Servicio**: `solicitarOtpAction` y `verificarOtpAction` en `src/actions/otp.actions.ts`.
- **Reglas de negocio**:
  - Código numérico con expiración corta (15 minutos).
  - Almacenamiento seguro del hash SHA-256 del token (`TokenAuth`).
  - Máximo 3 intentos de verificación fallidos antes de invalidar el código para frenar ataques de fuerza bruta.

### 1.5 `/recuperar` — Recuperación de Contraseña
- **Propósito**: Restablecimiento autoservicio de contraseña olvidada.
- **Qué ve el usuario**: Formulario de dos pasos (`RecuperarForm.tsx`): solicitud de correo y confirmación de código recibido con nueva contraseña.
- **Acciones posibles**: Solicitar código de recuperación, definir nueva contraseña.
- **Server Action / Servicio**: `solicitarRecuperacionAction` y `confirmarRecuperacionAction` en `src/actions/recuperacion.actions.ts`.
- **Reglas de negocio**:
  - Respuestas genéricas anti-enumeración de usuarios.
  - Token de un solo uso con hash SHA-256.

### 1.6 `/legal` — Política de Tratamiento de Datos Personales
- **Propósito**: Consulta pública de los términos legales, finalidades y política de Habeas Data bajo la Ley 1581 de 2012 de Colombia.
- **Qué ve el usuario**: Documento estructurado con 12 secciones que cubren responsable, finalidades, tratamiento de datos sensibles de menores (salud y fotografía), derechos ARCO y canales de atención.

### 1.7 `/e/[slug]` — Landing Pública de Escuela
- **Propósito**: Escaparate público y portal de captura de interesados para cada escuela deportiva.
- **Qué ve el usuario**: Marca visual de la escuela (logo, colores institucionales), titular, descripción, galería ilustrada (`HeroIlustracion`), información de contacto (WhatsApp, Instagram, email) y formulario de contacto para aspirantes (`LeadForm`).
- **Acciones posibles**: Enviar formulario de contacto/interés.
- **Server Action / Servicio**: `POST /api/leads`.
- **Reglas de negocio**:
  - Protegido con honeypot y tiempo mínimo de llenado (≥ 2s) anti-bot.
  - Rate limiting de 8 envíos por hora por IP.
  - Si la escuela está inactiva o no existe, retorna 404 estricto para no confirmar existencia.

### 1.8 `/bloqueado` — Pantalla de Acceso Restringido por Mora
- **Propósito**: Notificar a la familia cuando su acceso ha sido restringido por decisión administrativa o deuda financiera.
- **Qué ve el usuario**: Mensaje explicativo del bloqueo, motivos específicos y botones para acceder a `/jugador/mensajes` (comunicación directa) o `/jugador/pagos` (regularización de deuda), además del botón de cierre de sesión.

---

## 2. Rol: Súper Administrador (`/admin`)

### 2.1 `/admin/escuelas` — Catálogo Global de Escuelas
- **Propósito**: Supervisión de todos los tenants registrados en la plataforma.
- **Qué ve el usuario**: Listado de escuelas con nombre, slug, estado (activa/inactiva), color primario, cantidad de jugadores y botón de acción para abrir sesión de soporte. Diálogo para alta directa de escuela (`NuevaEscuelaDialog.tsx`).
- **Acciones posibles**: Crear escuela directa, activar/desactivar escuela, abrir sesión de soporte para un tenant.
- **Server Actions**: `crearEscuelaAction` en `src/actions/admin.actions.ts`, `iniciarSoporteAction` en `src/actions/soporte.actions.ts`.

### 2.2 `/admin/escuelas/[id]` — Detalle de Escuela en Modo Soporte
- **Propósito**: Auditoría o asistencia técnica a una escuela puntual.
- **Qué ve el usuario**: Banner persistente de soporte (`SoporteBanner.tsx`) indicando modo (solo lectura o escritura habilitada), listado de categorías, entrenadores y jugadores del tenant.
- **Acciones posibles**: Finalizar soporte, solicitar habilitación de escritura justificando motivo, consultar registros del tenant.
- **Server Actions**: `finalizarSoporteAction`, `habilitarEscrituraSoporteAction` en `src/actions/soporte.actions.ts`.
- **Reglas de negocio**:
  - Sin sesión de soporte activa para ese ID específico, lanza `ForbiddenError` o `TenantMismatchError` (cero acceso ambiental, M2).

### 2.3 `/admin/leads` y `/admin/leads/[id]` — Pipeline Comercial (Mini-CRM)
- **Propósito**: Gestión de prospectos que solicitaron información para abrir una escuela.
- **Qué ve el usuario**: Tabla de leads clasificados por estado (NUEVO, CONTACTADO, EN_SEGUIMIENTO, DESCARTADO, CONVERTIDO), notas de seguimiento, historial de contacto y botón para "Convertir a Escuela".
- **Acciones posibles**: Cambiar estado, agendar fecha de próximo contacto, agregar notas, convertir lead creando automáticamente la escuela y la cuenta de su administrador.
- **Server Actions**: `actualizarLeadAction`, `agregarNotaLeadAction`, `convertirLeadAction` en `src/actions/admin.actions.ts`.

### 2.4 `/admin/usuarios` — Directorio Global de Cuentas
- **Propósito**: Gobernanza y administración de cuentas de usuario de toda la plataforma.
- **Qué ve el usuario**: Lista paginada con filtros por rol y escuela, estado de activación, estado de bloqueo y fecha de registro.
- **Acciones posibles**: Modificar datos de usuario, alternar estado activo/inactivo, forzar reseteo de contraseña generando credencial temporal criptográfica.
- **Server Actions**: `editarUsuarioAdminAction`, `resetPasswordUsuarioAdminAction` en `src/actions/gestion.actions.ts`.

### 2.5 `/admin/parametros` — Parámetros Globales del Motor y Calibración
- **Propósito**: Calibración matemática del motor de stats y de la curva de desarrollo.
- **Qué ve el usuario**:
  - Peso de Mentalidad en el OVR (`PESO_MEN_EN_OVR`, fijo en 0.1 por defecto).
  - Umbrales de carta globales (Plata 65, Oro 75, Héroe 85).
  - Parámetros de la curva de asistencia (ganancia por entreno, por partido, tope de bonus, penalización por faltas).
  - Marcas físicas mínimas y máximas por grupo de edad (Sub-8 a Sub-16).
  - Selector para overrides por escuela puntual (en soporte).
- **Acciones posibles**: Modificar constantes globales, fijar overrides específicos por escuela, calibrar rangos por categoría.
- **Server Actions**: `actualizarParametroAction`, `fijarMetricaEscuelaAction`, `quitarMetricaEscuelaAction`, `fijarRangosCategoriaAction` en `src/actions/admin.actions.ts`.

### 2.6 `/admin/simulador` — Simulador de Cartas
- **Propósito**: Banco de pruebas interactivo del motor de stats sin impacto en base de datos.
- **Qué ve el usuario**: Sliders y campos numéricos para las 12 pruebas físicas y técnicas, selector de posición táctica, selector de grupo de edad o categoría, previsualización de la carta en tiempo real y botón de exportación de plantilla de cálculo en Excel con fórmulas vivas.
- **Server Action / Handler**: `GET /api/plantilla-simulador`.

### 2.7 `/admin/fondos` — Catálogo de Fondos de Carta
- **Propósito**: Gestión del catálogo visual de estilos de carta.
- **Qué ve el usuario**: Galería de fondos activos e inactivos, editor de CSS crudo para efectos visuales (brillos, animaciones), condiciones de desbloqueo (nivel de carta, logro requerido).
- **Acciones posibles**: Crear nuevo fondo, editar reglas CSS, activar o retirar fondos.
- **Server Actions**: `crearFondoAction`, `actualizarFondoAction`, `desactivarFondoAction` en `src/actions/fondo.actions.ts`.

### 2.8 `/admin/logros` — Catálogo Global de Logros
- **Propósito**: Creación de insignias y condecoraciones del sistema.
- **Qué ve el usuario**: Lista de logros de plataforma, tipo (HITO o BONUS), atributo beneficiado (RIT, TIR, PAS, REG, DEF, FIS, MEN), valor de incremento y reglas de elegibilidad.
- **Server Actions**: `crearLogroAction`, `actualizarLogroAction`, `desactivarLogroAction` en `src/actions/logro.actions.ts`.

### 2.9 `/admin/auditoria` — Registro de Eventos de Seguridad
- **Propósito**: Cumplimiento normativo y trazabilidad forense.
- **Qué ve el usuario**: Visor cronológico de `AuditLog` con filtros por actor, acción, entidad y fechas, con opción de descarga en archivo Excel.
- **Server Handler**: `GET /api/auditoria-export`.

### 2.10 `/admin/cuenta` — Configuración de Perfil
- **Propósito**: Gestión de credenciales propias del administrador.
- **Acciones posibles**: Cambio seguro de contraseña mediante `cambiarMiPasswordAction`.

---

## 3. Rol: Administrador de Escuela (`/escuela`)

### 3.1 `/escuela` — Dashboard Principal
- **Propósito**: Centro de mando deportivo y financiero de la institución.
- **Qué ve el usuario**:
  - Resumen deportivo: jugadores activos, OVR promedio del club, evaluaciones pendientes o vencidas, tasa de asistencia mensual.
  - Resumen financiero: cuotas al día, cuotas pendientes, monto total en mora, familias bloqueadas.
  - Enlaces de salto directo hacia listas filtradas.

### 3.2 `/escuela/jugadores` — Gestión Integral del Plantel
- **Propósito**: Nómina completa de deportistas de la escuela.
- **Qué ve el usuario**: Tabla con búsqueda, filtros por categoría y estado (ACTIVO, INACTIVO, PENDIENTE, ELIMINADO). Indicadores de estado de ficha médica, apto vencido y alerta de mora.
- **Acciones posibles**:
  - "+ Nuevo jugador": asistente guiado por pasos (identidad, ficha médica, acudiente y credenciales).
  - Editar datos deportivos, cambiar estado activo/inactivo.
  - Ver ficha médica sensible (bajo modal auditado).
  - Bloquear / desbloquear acceso de la familia.
  - Resetear contraseña del tutor.
  - Descargar nómina de jugadores en Excel (`GET /api/jugadores-export`).
  - Descargar contactos de acudientes en Excel (`GET /api/contactos-export`).
  - Descargar evaluaciones históricas (`GET /api/evaluaciones-export`).
- **Server Actions**: `crearJugadorCompletoAction`, `editarJugadorAction`, `cambiarEstadoJugadorGestionAction`, `bloquearAccesoAction`, `desbloquearAccesoAction`, `resetPasswordFamiliaAction`, `actualizarFichaMedicaAction` en `src/actions/gestion.actions.ts`.

### 3.3 `/escuela/categorias` — Configuración de Categorías
- **Propósito**: Estructura de divisiones y rangos físicos propios.
- **Qué ve el usuario**: Categorías existentes (ej. Sub-10, Sub-12 o categorías libres sin edad). Para cada categoría, calibración física personalizada (mínimos y máximos esperados para Sprint, Salto, Agilidad y Yo-Yo).
- **Acciones posibles**: Crear categoría, editar rangos físicos.
- **Server Actions**: `crearCategoriaAction` en `src/actions/escuela.actions.ts`, `fijarRangosCategoriaEscuelaAction` en `src/actions/categoria-rango.actions.ts`.

### 3.4 `/escuela/aranceles` — Lista de Precios
- **Propósito**: Matriz de precios por categoría y concepto de cobro.
- **Qué ve el usuario**: Precios configurados para mensualidad, matrícula, uniformes o torneos. Precios generales ("todas las categorías") o excepciones específicas. Programación de aumentos futuros con vigencia automática.
- **Server Actions**: `crearArancelAction`, `actualizarArancelAction`, `eliminarArancelAction` en `src/actions/arancel.actions.ts`.

### 3.5 `/escuela/conceptos` — Conceptos de Cobro Personalizados
- **Propósito**: Catálogo de conceptos facturables de la escuela.
- **Qué ve el usuario**: Conceptos del sistema (MENSUALIDAD, MATRICULA) y conceptos adicionales creados por el club (indumentaria, transportes, giras).
- **Server Actions**: `crearConceptoAction`, `actualizarConceptoAction`, `desactivarConceptoAction` en `src/actions/concepto-cobro.actions.ts`.

### 3.6 `/escuela/descuentos` — Reglas de Descuento y Becas
- **Propósito**: Automatización de beneficios económicos.
- **Qué ve el usuario**: Reglas automáticas (descuento para segundo hermano, beca deportiva por mérito, pronto pago) fijadas en porcentaje o monto fijo.
- **Server Actions**: `crearDescuentoReglaAction`, `actualizarDescuentoReglaAction`, `eliminarDescuentoReglaAction` en `src/actions/descuento.actions.ts`.

### 3.7 `/escuela/membresias` — Cobranza y Emisión de Cuotas
- **Propósito**: Generación masiva y seguimiento mensual de obligaciones de pago.
- **Qué ve el usuario**:
  - Botón "Generar cuotas del mes" (creación idempotente de cuotas para todos los jugadores activos según aranceles vigentes).
  - Panel de registro manual de cobros y estados de cuenta.
  - Tabla de cuotas con filtros por período, concepto y estado (PENDIENTE, PAGADA, VENCIDA).
  - Exportación de membresías a Excel (`GET /api/membresias-export`).
- **Server Actions**: `generarCuotasMesAction`, `registrarMembresiaAction`, `cambiarEstadoMembresiaAction`, `aplicarDescuentoManualAction` en `src/actions/membresia.actions.ts`.

### 3.8 `/escuela/pagos` — Bandeja de Conciliación de Pagos
- **Propósito**: Aprobación o rechazo de pagos reportados por las familias.
- **Qué ve el usuario**: Pagos en estado REPORTADO, montos, medios de pago (transferencia, Nequi, efectivo), referencias bancarias y visor del comprobante digital.
- **Acciones posibles**: Aprobar pago (marca cuotas pagadas y libera mora), aprobar pagos en lote, rechazar pago con motivo, anular pago registrado previamente por error. Registrar cobro directo en ventanilla.
- **Server Actions**: `aprobarPagoEscuelaAction`, `aprobarPagosLoteEscuelaAction`, `rechazarPagoEscuelaAction`, `anularPagoEscuelaAction`, `registrarPagoEscuelaAction` en `src/actions/pago.actions.ts`.

### 3.9 `/escuela/morosos` — Gestión de Cartera Vencida
- **Propósito**: Control focalizado de familias con cuotas impagas.
- **Qué ve el usuario**: Lista de acudientes en mora, antigüedad de la deuda, total adeudado y botón de "Bloqueo Masivo de Acceso".
- **Server Action**: `bloquearAccesoMasivoAction` en `src/actions/gestion.actions.ts`.

### 3.10 `/escuela/egresos` — Control de Gastos
- **Propósito**: Registro de salidas de dinero del club (alquiler de canchas, honorarios, insumos).
- **Qué ve el usuario**: Resumen de ingresos netos vs egresos del mes (caja neta) y formulario de registro.
- **Server Actions**: `registrarEgresoAction`, `eliminarEgresoAction` en `src/actions/egreso.actions.ts`.

### 3.11 `/escuela/dts` y `/escuela/staff` — Gestión del Cuerpo Técnico y Administrativo
- **Propósito**: Cuentas del cuerpo técnico y colaboradores (kinesiólogos, preparadores).
- **Qué ve el usuario**: Lista de entrenadores con categorías asignadas y credenciales temporales emitidas.
- **Server Actions**: `crearDtAction`, `actualizarDtAction`, `resetPasswordDtAction` en `src/actions/escuela.actions.ts`, y acciones en `src/actions/staff.actions.ts`.

### 3.12 `/escuela/sedes` — Infraestructura Deportiva
- **Propósito**: Catálogo de predios deportivos y canchas.
- **Qué ve el usuario**: Sedes creadas con sus respectivas canchas vinculadas.
- **Server Actions**: `crearSedeAction`, `crearCanchaAction` en `src/actions/escuela.actions.ts`.

### 3.13 `/escuela/codigos` — Códigos de Invitación
- **Propósito**: Generación de tokens alfanuméricos para enrolamiento de familias.
- **Qué ve el usuario**: Códigos generados, categoría asociada, usos consumidos vs límite, fecha de expiración y estado.
- **Server Actions**: `crearCodigoAction`, `desactivarCodigoAction`, `enviarCodigoInvitacionAction` en `src/actions/escuela.actions.ts`.

### 3.14 `/escuela/branding` — Identidad Visual y Landing
- **Propósito**: White-label institucional y configuración del portal público.
- **Qué ve el usuario**: Subida de escudo en PNG, selector de color primario (variable CSS `--brand`), frecuencia de evaluación en días y editor de la landing pública `/e/[slug]`.
- **Server Actions**: `actualizarBrandingAction`, `subirEscudoAction` en `src/actions/escuela.actions.ts`, `actualizarLandingAction` en `src/actions/landing.actions.ts`.

### 3.15 `/escuela/asistencia` y `/escuela/ranking` — Informes Deportivos
- **Propósito**: Monitoreo de evolución pedagógica y rendimiento en partidos.
- **Qué ve el usuario**: Semáforo de asistencia por categoría y rankings de OVR y goleadores del club, con exportación Excel (`GET /api/asistencia-export`, `GET /api/resultados-export`).

---

## 4. Rol: Director Técnico (`/dt`)

### 4.1 `/dt` — Home Operativo ("Hoy")
- **Propósito**: Resumen ejecutivo diario del entrenador a pie de cancha.
- **Qué ve el DT**:
  - Eventos de la jornada (entrenamientos o partidos programados para hoy) con botón de inicio directo al Modo Sesión.
  - Alerta de evaluaciones vencidas según la frecuencia de la escuela.
  - Solicitudes de ingreso de nuevos jugadores pendientes de aprobación.
- **Acciones posibles**: Iniciar sesión de evento, saltar a evaluar jugadores, aprobar/rechazar solicitudes.

### 4.2 `/dt/plantilla` — Plantilla de Jugadores
- **Propósito**: Vista visual del plantel asignado al DT.
- **Qué ve el DT**: Mini-cartas estilo EA FC de todos los jugadores activos en sus categorías, organizados por división y posición, con indicador rojo de evaluación vencida.
- **Acciones posibles**: "+ Nuevo jugador" (alta asistida en cancha sin exigir datos fiscales), evaluar jugador, importar jornada de mediciones masiva en Excel (`importarEvaluacionesAction`), descargar plantilla Excel con jugadores precargados (`GET /api/plantilla-evaluaciones`).

### 4.3 `/dt/jugadores/[id]` — Ficha Deportiva del Jugador
- **Propósito**: Radiografía integral de un jugador para el entrenador.
- **Qué ve el DT**:
  - Carta activa actual en gran formato.
  - Gráfica de evolución histórica de OVR y stats (`EvolutionChart.tsx`).
  - Vitrina de historia de cartas pasadas (`HistoriaCarta.tsx`).
  - Ficha médica de emergencia: contacto de acudiente, teléfono, autorización de traslado en ambulancia, alergias y vencimiento del apto médico (solo si hay consentimiento familiar de salud; nunca documento oficial ni EPS).
  - Indicador discreto de mora (sin revelar montos de deuda).
  - Historial de observaciones cargadas en entrenamientos y partidos.
  - Formulario de fijación de Objetivos de Desarrollo (stat meta + fecha límite).
  - Reseteo de contraseña de la familia si olvidó su acceso (`resetPasswordFamiliaDtAction`).
- **Server Actions**: `crearObjetivoAction` en `src/actions/dt.actions.ts`.

### 4.4 `/dt/jugadores/[id]/evaluar` — Formulario de Evaluación Deportiva
- **Propósito**: Registro de mediciones reales y nacimiento/actualización de la carta.
- **Qué ve el DT**:
  - 4 pruebas físicas en medidas reales: Sprint 30m (segundos), Salto vertical (cm), Agilidad Illinois (segundos), Resistencia Yo-Yo (nivel y fracción).
  - 4 notas técnicas (escala 1 a 10): Control, Pase, Tiro, Regate (para jugadores de campo); o Blocaje, Distribución, Juego Aéreo, Achique (para porteros).
  - 4 notas de mentalidad (escala 1 a 10): Actitud, Concentración, Trabajo en equipo, Resiliencia.
  - Campo de observaciones para la familia.
- **Acciones posibles**: Enviar evaluación y calcular carta.
- **Server Action**: `crearEvaluacionAction` en `src/actions/dt.actions.ts`.

### 4.5 `/dt/calendario` y `/dt/eventos` — Planificación de Jornadas
- **Propósito**: Programación de entrenamientos y partidos.
- **Qué ve el DT**: Calendario mensual/semanal de actividades.
- **Acciones posibles**:
  - Crear entrenamiento: convoca automáticamente a toda la categoría; opción de repetición semanal recurrente.
  - Crear partido: selección manual de jugadores convocados, cancha, rival, condición local/visitante.
  - Cancelar evento, editar fecha/hora.
- **Server Actions**: `crearEventoAction`, `editarEventoAction`, `cancelarEventoAction` en `src/actions/evento.actions.ts`.

### 4.6 `/dt/eventos/[id]/sesion` — Modo Sesión (En Vivo)
- **Propósito**: Conducción interactiva de la actividad a pie de campo desde el teléfono celular.
- **Qué ve el DT**:
  - En Entrenamiento: paso de lista rápido (Presente, Ausente, Justificado), registro de observaciones individuales por jugador, nota de cierre de sesión.
  - En Partido: marcador en vivo interactivo (+/- goles), registro de goleador, cronómetro por periodos (Primer Tiempo, Entretiempo, Segundo Tiempo, Penales, Finalizado), tarjetas disciplinarias en vivo (Amarilla, Roja, Tarjeta Azul), planilla estadística final de minutos jugados y asistencias.
- **Server Actions**: `guardarAsistenciaSesionAction`, `ajustarGolVivoAction`, `fijarTarjetasSesionAction`, `avanzarPeriodoAction`, `crearObservacionSesionAction`, `cerrarSesionAction` en `src/actions/sesion.actions.ts`.

### 4.7 `/dt/progreso` — Validación Semanal de Hábitos
- **Propósito**: Calificación formativa semanal del menor (disciplina, hidratación, nutrición, descanso).
- **Server Action**: `validarProgresoSemanalAction` en `src/actions/progreso.actions.ts`.

### 4.8 `/dt/logros` — Asignación de Reconocimientos
- **Propósito**: Otorgar insignias con bonus acumulables a las cartas de sus dirigidos.
- **Server Actions**: `otorgarLogroAction`, `crearLogroAction`, `programarVentanaLogroAction` en `src/actions/logro.actions.ts`.

### 4.9 `/dt/mensajes` y `/dt/mensajes/[id]` — Comunicación con Familias
- **Propósito**: Canales de mensajería interna 1 a 1 entre el DT y cada acudiente por jugador.
- **Server Action**: `enviarMensajeAction` en `src/actions/mensaje.actions.ts`.

---

## 5. Rol: Familia / Jugador (`/jugador`)

### 5.1 `/jugador` — Hub Principal (La Carta)
- **Propósito**: Experiencia central del deportista y su familia.
- **Qué ve el usuario**:
  - La carta virtual estilo EA FC con el OVR dinámico, fondo equipado, foto o avatar DiceBear, y los 6 atributos principales (RIT, TIR, PAS, REG, DEF, FIS) más el hexágono de Mentalidad (MEN).
  - Noticia destacada del club y anuncios recientes.
  - Próximo partido o entrenamiento con selector de confirmación de asistencia ("Voy" / "No voy").
  - Objetivos fijados por el entrenador con fecha límite.
  - Mini-gráfico de evolución.

### 5.2 `/jugador/calendario` y `/jugador/eventos` — Agenda de Convocatorias
- **Propósito**: Seguimiento de citas deportivas del menor.
- **Qué ve el usuario**: Detalle de convocatorias, horarios, cancha y confirmación de disponibilidad familiar.
- **Server Action**: `confirmarConvocatoriaAction` en `src/actions/evento.actions.ts`.

### 5.3 `/jugador/eventos/[id]` — Detalle de Partido y Estadísticas
- **Propósito**: Revisar el desempeño tras la finalización de un encuentro.
- **Qué ve el usuario**: Marcador final, minutos disputados, goles, asistencias, tarjetas y las observaciones públicas que el DT haya redactado sobre el menor.

### 5.4 `/jugador/pagos` — Gestión Financiera Familiar
- **Propósito**: Transparencia económica y reporte de cuotas.
- **Qué ve el usuario**: Estado de cuenta (al día o en mora), cuotas emitidas con valor neto (descuentos aplicados), historial de pagos anteriores con estado (REPORTADO, APROBADO, RECHAZADO).
- **Acciones posibles**: Seleccionar una o varias cuotas pendientes y reportar pago adjuntando medio (Nequi, Daviplata, Transferencia, Efectivo), referencia y foto del comprobante bancario.
- **Server Action**: `reportarPagoAction` en `src/actions/pago.actions.ts`.

### 5.5 `/jugador/perfil` — Foto y Consentimiento de Imagen
- **Propósito**: Personalización del cromo deportivo bajo estricta privacidad.
- **Qué ve el usuario**: Recortador interactivo de fotografía en el navegador (`react-easy-crop`) con herramienta WASM de remoción de fondo (`@imgly/background-removal`), selector alternativo de avatar generado DiceBear (`toon-head`), y casilla de consentimiento explícito de tratamiento de imagen de menores.
- **Acciones posibles**: Subir foto, revocar consentimiento en cualquier momento (la carta pasa de inmediato a mostrar avatar), cambiar avatar.
- **Server Actions**: `subirFotoAction`, `eliminarFotoAction`, `guardarAvatarAction`, `actualizarConsentimientoAction` en `src/actions/jugador.actions.ts`.

### 5.6 `/jugador/fondos` — Galería de Fondos de Carta
- **Propósito**: Gamificación estética de la carta.
- **Qué ve el usuario**: Fondos desbloqueados por mérito deportivo (Héroe, Oro, Plata, logros obtenidos) y fondos bloqueados con su requisito.
- **Acciones posibles**: Equipar fondo activo en la carta (`equiparFondoAction`).

### 5.7 `/jugador/logros` — Vitrina de Trofeos
- **Propósito**: Insignias ganadas por el menor, historial de condecoraciones y desglose de bonus acumulables para la siguiente medición deportiva.

### 5.8 `/jugador/progreso` — Registro Familiar de Hábitos
- **Propósito**: Co-responsabilidad formativa en la curva de desarrollo (registro de nutrición, sueño y disciplina en casa).
- **Server Action**: `validarProgresoSemanalAction` en `src/actions/progreso.actions.ts`.

### 5.9 `/jugador/cuenta` — Datos Fiscales y Contacto
- **Propósito**: Mantenimiento de información de contacto y facturación.
- **Qué ve el usuario**: Formulario de actualización de teléfono de emergencias e identificación fiscal del acudiente (CC, CE, NIT, dirección) para facturación electrónica opcional.
- **Server Actions**: `actualizarIdentidadFiscalAction`, `actualizarTelefonoAction`, `cambiarMiPasswordAction` en `src/actions/cuenta.actions.ts`.
