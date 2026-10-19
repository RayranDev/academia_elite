# Oportunidades de Mejora Detectadas

Este documento consolida las oportunidades de optimización funcional, técnica y de experiencia de usuario identificadas durante la auditoría técnica y documentación integral del repositorio.

---

### MEJ-DOC-001 — Integración de Pasarela de Pagos Digital (PSE / Wompi)
- **Para quién**: Familia y Administrador de Escuela
- **Observación**: `src/app/jugador/pagos/page.tsx:40-90` y `src/actions/pago.actions.ts:66`. El flujo de cobranza actual es completamente manual: el familiar transfiere por fuera, toma una captura de pantalla, la sube al sistema y el administrador debe cotejar extracto bancario contra imagen para conciliar.
- **Propuesta**: Integrar una pasarela de pago local en Colombia (Wompi o PayU) mediante webhooks seguros (`/api/pagos/webhook`). La aprobación de cuotas sería instantánea y automática, liberando horas de trabajo manual en la administración.
- **Impacto**: **Alto** (elimina fricción en cobro y mora) | **Esfuerzo**: **M**

---

### MEJ-DOC-002 — Protección de Estado en Formulario de Evaluación DT (React 19)
- **Para quién**: Director Técnico (DT)
- **Observación**: `src/components/dt/EvaluationForm.tsx:156, 165, 217` (`QA-003`). El formulario utiliza `useActionState` con campos no controlados para pruebas físicas y notas cualitativas. Cuando el servidor rechaza una validación Zod, React 19 limpia el DOM del formulario, obligando al DT a reescribir todas las mediciones de campo.
- **Propuesta**: Migrar el formulario al hook controlado del proyecto `useEnvioAccion` (`src/components/ui/`) o retener los valores previos en estado local (`useState`), preservando los datos escritos ante cualquier error de validación.
- **Impacto**: **Alto** (evita pérdida de datos críticos en cancha) | **Esfuerzo**: **S**

---

### MEJ-DOC-003 — Cierre de Brecha de Privacidad en Fotos para Super Admin (Regla M2)
- **Para quién**: Equipo Técnico y Cumplimiento Legal (Habeas Data)
- **Observación**: `src/app/api/archivos/foto/[jugadorId]/route.ts:26-37` (`QA-001`). El endpoint permite que un usuario con rol `SUPER_ADMIN` descargue la foto de cualquier menor sin verificar si tiene una sesión de soporte activa para esa escuela, violando la regla M2 y el principio de no acceso ambiental.
- **Propuesta**: Exigir `ctx.soporte?.escuelaId === jugador.escuelaId` cuando el usuario es `SUPER_ADMIN`, retornando 404 si no existe una sesión de soporte activa y justificada.
- **Impacto**: **Crítico** (blindaje de seguridad en datos de menores) | **Esfuerzo**: **S**

---

### MEJ-DOC-004 — Navegación Visible al Calendario de Eventos del Jugador
- **Para quién**: Familia y Jugador
- **Observación**: `src/app/jugador/layout.tsx:8-18` y `src/components/shell/TabBarMovil.tsx` (`QA-005`). La pantalla `/jugador/eventos` existe y está completamente desarrollada, pero no tiene enlace visible en la barra lateral ni en la barra de navegación móvil del portal familiar.
- **Propuesta**: Añadir el ítem "Partidos y Agenda" con el icono de calendario en el menú de navegación del layout de jugador.
- **Impacto**: **Medio** (habilita el acceso directo a convocatorias sin depender del hub) | **Esfuerzo**: **S**

---

### MEJ-DOC-005 — Estandarización de Server Actions a Contrato Uniforme `ActionResult`
- **Para quién**: Escuela y Director Técnico
- **Observación**: `src/actions/escuela.actions.ts:91, 105, 163` (`QA-004`). Acciones como `crearSedeAction`, `crearCanchaAction` y `desactivarCodigoAction` devuelven `Promise<void>` y lanzan excepciones directas. Si fallan, tumban la pantalla al `error.tsx` en vez de mostrar un toast o mensaje contextual accesible (`MensajeAccion`).
- **Propuesta**: Homogeneizar todas las Server Actions para que devuelvan `ActionResult<T>` y consumirlas con retroalimentación visual clara.
- **Impacto**: **Medio** (experiencia de usuario robusta sin pantallazos de error) | **Esfuerzo**: **M**

---

### MEJ-DOC-006 — Corrección de Zona Horaria en Exportaciones de Contactos
- **Para quién**: Administrador de Escuela
- **Observación**: `src/services/export-contactos.service.ts:75` (`QA-002`). La fecha de nacimiento del menor se formatea con `format(new Date(j.fechaNacimiento), "dd/MM/yyyy")`. Dado que se guarda como medianoche UTC, en procesos o servidores en Colombia (UTC-5) la fecha retrocede a las 19:00 del día anterior, exportando un día menos del real en Excel.
- **Propuesta**: Utilizar el helper del proyecto `formatearFechaCalendario` (`src/lib/fecha-calendario.ts`) que procesa la fecha como día de almanaque sin sesgo de huso horario.
- **Impacto**: **Medio** (integridad en fichas de contacto y emergencias) | **Esfuerzo**: **S**

---

### MEJ-DOC-007 — Protección contra Doble Envío en Evaluaciones Deportivas
- **Para quién**: Director Técnico y Rendimiento de Base de Datos
- **Observación**: `src/actions/dt.actions.ts:83` (`QA-007`). Si el DT hace doble clic sobre el botón "Guardar Evaluación" o experimenta latencia móvil en la cancha, se generan dos registros idénticos e inmutables en la tabla `Evaluacion`.
- **Propuesta**: Implementar token de idempotencia en la acción o deshabilitar reactivamente el botón de envío en el cliente durante la transición de guardado.
- **Impacto**: **Medio** (previene duplicación de registros históricos inmutables) | **Esfuerzo**: **S**

---

### MEJ-DOC-008 — Carga Masiva de Fotografías para Escuelas
- **Para quién**: Administrador de Escuela y DT
- **Observación**: `src/actions/jugador.actions.ts:17`. Las fotos de los alumnos deben subirse una por una desde la ficha individual de cada deportista, lo cual resulta impráctico al inicio de temporada para escuelas con 150+ alumnos.
- **Propuesta**: Crear un asistente de importación masiva en `/escuela/jugadores` que reciba un archivo comprimido `.zip` con nombres de archivo por documento/código (`10203040.jpg`) y procese la tubería WebP de forma asíncrona.
- **Impacto**: **Alto** (agiliza la adopción inicial del software) | **Esfuerzo**: **M**
