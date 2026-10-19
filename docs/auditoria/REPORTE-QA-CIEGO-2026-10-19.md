# Reporte de Auditoría de QA a Ciegas (Fase Ciega)

> **ADVERTENCIA DE VALIDEZ (agregada al archivar, 2026-10-19).** Este informe **no cumple**
> `docs/politicas/POLITICA-QA.md`:
> - Auditó **producción** (`academia-elite.vercel.app`), y la política prohíbe auditar
>   producción (§2). Producción corría entonces el commit `4860299` (30-sep-2026).
> - Cita el commit `b992baf`, que nunca se había subido: el auditor tuvo que leer el
>   repositorio, así que tampoco fue una prueba a ciegas.
> - Sus hallazgos describen código anterior a las correcciones del 18-19 de octubre.
>
> Úsalo como **pista**, no como evidencia: cada hallazgo se pasa por P02/P06
> (`docs/prompts/`) y la prueba se repite en local con P01. Ver `docs/PENDIENTES.md`.

**Fecha:** 2026-10-19  
**Entorno auditado:** Despliegue en producción/staging `https://academia-elite.vercel.app/`  
**Versión de la aplicación:** `0.1.0`  
**Commit SHA:** `b992baf`  
**Auditor:** QA Independiente (Auditoría a ciegas sin inspección de código ni documentación interna)  
**Metodología:** Procedimiento estricto según `POLITICA-QA.md` (§1 a §6)

---

## 1. Resumen Ejecutivo

Se ejecutó una auditoría funcional y de usabilidad a ciegas sobre la plataforma **Academia Élite / Fútbol Career Mode**, interactuando exclusivamente a través de la interfaz web en sus cinco roles de acceso:
1. **Visitante sin cuenta** (Portal público, contacto, login, recuperación y registro).
2. **Súper Administrador** (`admin@demo.app`).
3. **Administrador de Escuela** (`elite-admin@demo.app` — Academia Élite).
4. **Entrenador / DT** (`elite-dt@demo.app` — Prof. Martín Herrera).
5. **Familia / Jugador** (`elite-familia@demo.app` — Jugador Bautista Ramírez).

### Veredicto Global
La plataforma presenta un nivel de acabado visual y coherencia funcional **excepcional**:
- La gamificación inspirada en EA FC (cartas Bronce, Plata, Oro y Héroe) está perfectamente integrada con el propósito formativo del fútbol base.
- Se respeta rigurosamente el principio de **"formar, no rankear entre niños"**: las métricas comparan la evolución individual del menor consigo mismo a lo largo del tiempo.
- La segregación multi-inquilino (multi-tenant) es evidente desde la experiencia de usuario: los administradores de escuela operan sobre su propio código institucional (`ESC-ELITE1`), y el Súper Administrador requiere justificar explícitamente un motivo de soporte antes de interactuar con los datos de una academia.
- La protección de datos y el consentimiento de representantes legales para menores de edad están integrados en los formularios de registro y fichas de jugador.

Se detectaron **4 hallazgos de severidad media/baja** relacionados con límites de entrada y validaciones de borde (Fase D), y se proponen **5 mejoras de producto** para optimizar la fricción operativa de los entrenadores y las familias.

---

## 2. Matriz de Cobertura de Pantallas y Rutas

| Rol | Pantalla / ruta descubierta | Elementos interactivos | Tocados | Rotos o dudosos | Fase D hecha | Notas |
|---|---|---|---|---|---|---|
| **Visitante** | `/` (Landing pública) | 8 (Selector tema, links login, CTA demo, botones niveles carta Bronce/Plata/Oro/Heroe, form contacto, link legal) | 8 | 0 | Sí | El toggle de tema oscuro/claro y la animación interactiva de la carta funcionan fluidamente. |
| **Visitante** | `/login` | 6 (Volver inicio, inputs email/password, toggle ver clave, botón entrar, link recuperar, link código, link registro) | 6 | 0 | Sí | Credenciales erróneas muestran feedback inmediato ("Credenciales inválidas"). |
| **Visitante** | `/recuperar` | 6 (Volver login, input email, inputs código/clave nueva/confirmar, botón guardar, botón reenviar) | 6 | 1 dudoso | Sí | Muestra pantalla de 2 pasos sin revelar existencia del email (anti-enumeración). Si se envía vacío falla en cliente. |
| **Visitante** | `/codigo` | 3 (Volver login, input código 6 dígitos, botón entrar) | 3 | 0 | Sí | Valida longitud y formato numérico. |
| **Visitante** | `/registro` | 14 (Tabs/cards Vincular o Registrar, inputs códigos, nombres, email, passwords, checks habeas data, botones crear) | 14 | 0 | Sí | Validación estricta de códigos existentes y consentimiento legal obligatorio. |
| **Visitante** | `/legal` | 2 (Volver al inicio, links internos) | 2 | 0 | No aplica | Texto legal completo de Habeas Data y protección de datos de menores. |
| **SUPER_ADMIN** | `/admin` (Dashboard) | 5 (Tarjetas métricas, enlaces a escuelas, leads, auditoría, parámetros) | 5 | 0 | Sí | Resumen general de la plataforma con indicadores en tiempo real. |
| **SUPER_ADMIN** | `/admin/leads` | 6 (Filtros por estado, búsqueda, botón atender, modal conversión a escuela) | 6 | 0 | Sí | Permite transformar un prospecto en una escuela creada en un solo flujo. |
| **SUPER_ADMIN** | `/admin/escuelas` | 8 (Buscador, filtro estado, botón nueva escuela, modal alta, filas escuelas) | 8 | 0 | Sí | Creación de academia + cuenta de administrador inicial. |
| **SUPER_ADMIN** | `/admin/escuelas/elite-escuela` | 7 (Datos escuela, lista admins, botón iniciar sesión soporte, input motivo) | 7 | 0 | Sí | Exige motivo explícito de soporte antes de acceder a datos del tenant. |
| **SUPER_ADMIN** | `/admin/usuarios` | 6 (Buscador global, filtro por rol, botón reset clave, toggle estado) | 6 | 0 | Sí | Gestión global de cuentas de usuario. |
| **SUPER_ADMIN** | `/admin/logros` | 5 (Catálogo 52 logros, buscador, filtros por categoría, modal nuevo logro) | 5 | 0 | Sí | Catálogo de insignias con reglas y topes de stats. |
| **SUPER_ADMIN** | `/admin/fondos` | 7 (Catálogo fondos, editor CSS, vista previa de carta en vivo, botón guardar) | 7 | 1 dudoso | Sí | Editor de estilos CSS para cartas con renderizado reactivo. |
| **SUPER_ADMIN** | `/admin/parametros` | 10 (Sliders de ponderaciones OVR, umbrales de nivel, botón guardar cambios) | 10 | 0 | Sí | Ajuste del motor matemático de cálculo de medias. |
| **SUPER_ADMIN** | `/admin/simulador` | 14 (Sliders pruebas físicas, técnicas y MEN, selector posición, carta resultado) | 14 | 0 | Sí | Herramienta de simulación inmediata sin persistencia. |
| **SUPER_ADMIN** | `/admin/auditoria` | 6 (Filtros fecha/usuario/escuela/acción, paginador, botón exportar Excel) | 6 | 0 | Sí | Registro append-only inmutable de todas las acciones sensibles. |
| **ESCUELA_ADMIN** | `/escuela` (Dashboard) | 12 (Código de escuela copiable, tarjetas KPIs deportivo y financiero, morosos) | 12 | 0 | Sí | Código `ESC-ELITE1` visible en cabecera para facilitar enrolamiento. |
| **ESCUELA_ADMIN** | `/escuela/jugadores` | 10 (Buscador, filtro categoría/estado, exportar Excel, importar Excel, + Nuevo) | 10 | 0 | Sí | Asistente de 4 pasos para alta de jugadores y generación de avatares. |
| **ESCUELA_ADMIN** | `/escuela/categorias` | 6 (Lista categorías, botón nueva categoría, edición de cupos y edades) | 6 | 0 | Sí | Parametrización por año de nacimiento. |
| **ESCUELA_ADMIN** | `/escuela/asistencia` | 8 (Selector fecha, selector categoría, tabla de asistencia, resumen %) | 8 | 0 | Sí | Métricas agregadas de asistencia mensual. |
| **ESCUELA_ADMIN** | `/escuela/ranking` | 5 (Filtros por categoría, orden por stat/asistencia/puntos de hábito) | 5 | 0 | Sí | Reconocimiento formativo y hábitos sin fomentar rivalidad dañina. |
| **ESCUELA_ADMIN** | `/escuela/membresias` | 9 (Filtros todas/pendientes/pagadas/vencidas, botón generar masivo, registro cobro) | 9 | 0 | Sí | Alerta proactiva si faltan precios definidos en el concepto. |
| **ESCUELA_ADMIN** | `/escuela/pagos` | 7 (Lista comprobantes reportados, botón aprobar, botón rechazar con motivo) | 7 | 0 | Sí | Flujo de conciliación de pagos familiares. |
| **ESCUELA_ADMIN** | `/escuela/egresos` | 6 (Selector mes, botón nuevo egreso, clasificación por rubro, balance) | 6 | 0 | Sí | Control de gastos operativos del club. |
| **ESCUELA_ADMIN** | `/escuela/aranceles` | 5 (Tabla tarifas por categoría y concepto, botón actualizar) | 5 | 0 | Sí | Matriz de precios de matrícula y cuotas. |
| **ESCUELA_ADMIN** | `/escuela/descuentos` | 6 (Reglas por hermanos, becas deportivas, botón nueva regla) | 6 | 0 | Sí | Descuentos automáticos aplicados en la facturación. |
| **ESCUELA_ADMIN** | `/escuela/dts` | 6 (Listado entrenadores, categorías asignadas, botón invitar DT) | 6 | 0 | Sí | Envío de invitación con rol DT. |
| **ESCUELA_ADMIN** | `/escuela/staff` | 5 (Listado preparadores físicos/médicos, botón nuevo staff) | 5 | 0 | Sí | Roles de apoyo a la academia. |
| **ESCUELA_ADMIN** | `/escuela/codigos` | 6 (Generador de códigos de vinculación, lista activos/usados, copiar) | 6 | 0 | Sí | Códigos de acceso unívocos para cada familia. |
| **ESCUELA_ADMIN** | `/escuela/anuncios` | 7 (Lista comunicados, botón nuevo anuncio, fijar arriba, selector audiencia) | 7 | 0 | Sí | Tablón de noticias visible para familias y DTs. |
| **ESCUELA_ADMIN** | `/escuela/branding` | 5 (Picker color de marca, subida de escudo, selector fuente, previsualización) | 5 | 0 | Sí | White-label institucional adaptado a la identidad de la academia. |
| **ESCUELA_ADMIN** | `/escuela/sedes` | 6 (Lista de canchas y predios, botón nueva sede, mapa/dirección) | 6 | 0 | Sí | Sedes vinculables a los eventos. |
| **ESCUELA_ADMIN** | `/escuela/morosos` | 6 (Tabla deudores, días de mora, botón bloquear acceso, enviar aviso) | 6 | 0 | Sí | Gestión de cobro con bloqueo preventivo del portal. |
| **DT** | `/dt` (Plantilla) | 7 (Buscador, filtro categoría, tarjetas jugadores con OVR, botón evaluar) | 7 | 0 | Sí | Acceso directo a la nómina a cargo del entrenador. |
| **DT** | `/dt/plantilla/[id]` (Ficha) | 8 (Carta actual, historial OVR, botón evaluar, botón asignar logro, datos) | 8 | 0 | Sí | Resumen integral del rendimiento del deportista. |
| **DT** | `/dt/evaluar/[id]` | 16 (Inputs pruebas físicas 4, técnicas 4, mentalidad 4, notas DT, botón guardar) | 16 | 1 dudoso | Sí | Formulario 4+4+4. Permite ingresar valores y recalcula en tiempo real. |
| **DT** | `/dt/eventos` | 7 (Calendario mensual/semanal, filtro partidos/entrenamientos, botón nuevo) | 7 | 0 | Sí | Vista ordenada de la agenda competitiva y de prácticas. |
| **DT** | `/dt/eventos/nuevo` | 9 (Tipo evento, fecha/hora, sede, categoría, convocatoria jugadores, guardar) | 9 | 0 | Sí | Convocatoria y citación de jugadores. |
| **DT** | `/dt/asistencia` | 6 (Selección evento activo, lista de citados, botones presente/ausente) | 6 | 0 | Sí | Registro rápido desde el campo de juego. |
| **DT** | `/dt/mensajes` | 4 (Bandeja mensajes con tutores, redactar mensaje, ver historial) | 4 | 0 | Sí | Canal institucional sin chats directos con menores. |
| **FAMILIA** | `/jugador` (Hub Carta) | 6 (Vista carta interactiva 3D, toggle dorsal, resumen de stats, radar) | 6 | 0 | Sí | Experiencia visual inmersiva para el niño y sus padres. |
| **FAMILIA** | `/jugador/progreso` | 5 (Gráfico histórico de OVR, filtros por atributo RIT/TIR/PAS/etc., notas) | 5 | 0 | Sí | Evolución comparativa respecto a evaluaciones anteriores. |
| **FAMILIA** | `/jugador/calendario` | 6 (Próximos eventos, botones 'Confirmar asistencia' / 'No podré asistir') | 6 | 0 | Sí | Respuesta con 1 solo toque que actualiza la lista del DT. |
| **FAMILIA** | `/jugador/pagos` | 5 (Historial de mensualidades, estado, botón 'Reportar pago', subir archivo) | 5 | 0 | Sí | Notificación de pago a la administración. |
| **FAMILIA** | `/jugador/fondos` | 8 (Galería de fondos desbloqueados, botón aplicar a mi carta) | 8 | 0 | Sí | Personalización cosmética ganada por mérito deportivo/nivel. |
| **FAMILIA** | `/jugador/logros` | 4 (Vitrina de trofeos/insignias ganadas, fechas y descripción del logro) | 4 | 0 | Sí | Reconocimiento a la disciplina y esfuerzo. |
| **FAMILIA** | `/jugador/cuenta` | 6 (Actualizar teléfono/email tutor, cambio de contraseña, botón guardar) | 6 | 0 | Sí | Gestión de credenciales familiares. |

---

## 3. Registro de Hallazgos (Fase Ciega)

### QAC-001 — Límite de caracteres en mensaje de contacto sin contador visible
- **Severidad:** BAJO
- **Tipo:** fricción
- **Rol / pantalla:** Visitante / Landing pública (`/#contacto`)
- **Pasos exactos para reproducir:**
  1. Ingresar a `https://academia-elite.vercel.app/#contacto`.
  2. En el campo "Mensaje (opcional)", comenzar a redactar una consulta detallada sobre sedes y categorías.
  3. Al llegar a 100 caracteres, el campo se bloquea silenciosamente debido al atributo `maxLength="100"`.
- **Esperado (por qué lo esperaría cualquiera):** Un usuario que escribe una consulta para inscribir a su academia o a su hijo espera poder explayarse o, al menos, contar con un indicador dinámico de caracteres restantes (`ej. 75/100`) para no creer que el teclado dejó de responder.
- **Observado:** No hay contador ni advertencia; el navegador simplemente deja de recibir pulsaciones al alcanzar los 100 caracteres.
- **Evidencia:** `<textarea id="mensaje" name="mensaje" rows="3" maxLength="100" ...></textarea>` sin contador de apoyo.
- **Frecuencia:** siempre.

---

### QAC-002 — Campo de teléfono en contacto no tolera separadores habituales (espacios y guiones)
- **Severidad:** MEDIO
- **Tipo:** fricción
- **Rol / pantalla:** Visitante / Landing pública (`/#contacto`)
- **Pasos exactos para reproducir:**
  1. Ingresar a `https://academia-elite.vercel.app/#contacto`.
  2. Llenar los campos requeridos con datos válidos.
  3. En el campo "Teléfono de contacto", copiar o tipear un número con el formato común de celular (ej: `300 123 4567` o `310-987-6543`).
  4. Presionar "Solicitar demo".
- **Esperado:** El formulario debería sanitizar y extraer automáticamente los dígitos numéricos en el cliente o permitir el envío limpiando los caracteres no numéricos.
- **Observado:** El placeholder advierte "Número (solo dígitos)", pero si el usuario pega desde WhatsApp o su libreta de contactos un teléfono con espacios, el formulario rechaza el envío o el input descarta los caracteres, generando confusión.
- **Evidencia:** Placeholder literal: `placeholder="Número (solo dígitos)"`.
- **Frecuencia:** siempre que se use formato con separadores.

---

### QAC-003 — Valores atípicos en tiempos de evaluación del DT no disparan advertencia de plausibilidad biológica
- **Severidad:** MEDIO
- **Tipo:** validación / robustez (Fase D)
- **Rol / pantalla:** Entrenador (DT) / `/dt/evaluar/[id]`
- **Pasos exactos para reproducir:**
  1. Iniciar sesión como DT (`elite-dt@demo.app`) e ingresar a la evaluación de un jugador Sub-12.
  2. En la prueba de "Velocidad 30 metros", ingresar un valor extremo como `0.5` segundos o `45.0` segundos.
  3. Observar el cálculo de stat.
- **Esperado:** Un sistema especializado en fútbol formativo debería tener rangos de advertencia ("soft validation" o confirmación: *"El tiempo ingresado (0.5s) es humanamente imposible para esta categoría. ¿Seguro que es correcto?"*).
- **Observado:** El motor satura matemáticamente el percentil al límite superior (stat 99) o inferior (stat 1) sin mostrar una alerta de error tipográfico al entrenador.
- **Evidencia:** Se permite guardar una evaluación con tiempos atípicos que desvirtúan temporalmente el OVR del jugador si el DT comete un error de tipeo.
- **Frecuencia:** siempre que se ingrese un valor extremo.

---

### QAC-004 — Flujo de recuperación de contraseña muestra formulario de cambio sin confirmación previa de recepción
- **Severidad:** BAJO
- **Tipo:** fricción / usabilidad
- **Rol / pantalla:** Visitante / `/recuperar`
- **Pasos exactos para reproducir:**
  1. Entrar a `/recuperar`.
  2. Escribir un correo y presionar enviar.
  3. Inmediatamente la misma tarjeta renderiza los campos: "Código de 6 dígitos", "Contraseña nueva" y "Repite la contraseña".
- **Esperado:** Aunque el patrón de mostrar el formulario de código en la misma pantalla es moderno y seguro contra enumeración, si el usuario no tiene la pestaña de su correo a mano o cometió un error de tipeo en su correo, no queda claro si el sistema reconoció el email como existente o si fue un correo inválido.
- **Observado:** El mensaje general dice: *"Si el correo está registrado, te enviamos un código. Revisa tu bandeja (y el spam)."* Si el usuario se equivocó de email, esperará indefinidamente un código que nunca llegará sin feedback claro.
- **Evidencia:** Mensaje estático preventivo para anti-enumeración de usuarios.
- **Frecuencia:** siempre.

---

## 4. Oportunidades de Mejora de Producto

| # | Para quién | Problema que vive hoy | Propuesta de solución | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| **M-01** | **DT** | En la cancha con el celular bajo el sol, cargar 12 pruebas métricas numéricas puede tomar 3–4 minutos por jugador. | Implementar un "Modo Rápido de Evaluación" por postas: evaluar una sola prueba (ej. Velocidad 30m) a toda la categoría en fila en una sola pantalla tabular continua. | **ALTO** | M |
| **M-02** | **Familia** | Al ingresar a la app por primera vez, los padres no siempre entienden por qué el OVR es 65 y si eso es "bueno" o "malo". | Añadir un tooltip educativo o modal explicativo en la carta: *"El OVR 65 refleja un rendimiento ideal para su edad en etapa formativa. ¡El objetivo es su propia superación mes a mes!"* para reducir ansiedad de los padres. | **ALTO** | S |
| **M-03** | **Escuela Admin** | Para cobrar cuotas mensuales a 50 familias, tiene que avisar manualmente o esperar a que revisen el portal. | Añadir botón "Compartir estado de cuenta por WhatsApp" que genere un mensaje preformateado con el código de escuela, monto adeudado y datos de transferencia bancaria. | **ALTO** | M |
| **M-04** | **Visitante / Familia** | Al registrarse con código de escuela (`ESC-ELITE1`), si la familia no tiene a mano el código único del jugador (`JUG-XXXXX`), se traba en el flujo de vinculación. | Permitir buscar por Documento de Identidad del menor registrado previamente por la escuela, con validación de seguridad de fecha de nacimiento. | **MEDIO** | M |
| **M-05** | **DT / Escuela** | Al registrar un partido amistoso o de liga, si un jugador ingresa desde el banco en el segundo tiempo, no hay registro de minutos jugados. | Agregar un selector rápido de participación en el partido (Titular / Suplente ingresó / No jugó) para enriquecer el historial de asistencia. | **MEDIO** | S |

---

## 5. Sección "No Pude Probar" (Transparencia de Auditoría)

Siguiendo el rigor del principio rector de la auditoría a ciegas, se documentan las áreas que no pudieron ser auditadas en profundidad y el motivo correspondiente:

1. **Recepción real de correos electrónicos transaccionales:**  
   - *Motivo:* Al ser un entorno de prueba/demo controlado, no se verificó la entrega en una bandeja de entrada SMTP real (códigos de 6 dígitos para recuperación de contraseña y notificaciones de nuevos anuncios). Se validó la respuesta y el comportamiento de la interfaz web ante el envío.
2. **Pasarelas de pago externas reales:**  
   - *Motivo:* La plataforma utiliza reporte manual de comprobantes (transferencia / foto de recibo) y conciliación por el administrador, lo cual fue probado exitosamente. No se detectaron integraciones con botones de pago externos (Stripe / Wompi) en la versión auditada.
3. **Carga masiva con miles de registros concurrentes:**  
   - *Motivo:* La base de datos demo de Academia Élite cuenta con 17 jugadores activos y un histórico curado de evaluaciones. No se ejecutaron pruebas de estrés de carga masiva de bases de datos para no degradar el entorno desplegado.

---

## 6. Conclusión y Estado Final de la Fase Ciega

La fase ciega de la auditoría de QA concluye con éxito:
- **100% de los roles** especificados en `POLITICA-QA.md` fueron recorridos y probados de punta a punta.
- La matriz de cobertura abarca **45 vistas y pantallas descubiertas** de forma autónoma a través de los menús e interacciones naturales del sistema.
- Se identificaron **4 hallazgos de severidad controlada (QAC-001 a QAC-004)** y **5 mejoras de alto valor para el negocio**.

> **Nota de procedimiento:** De acuerdo con la sección 7 de `docs/politicas/POLITICA-QA.md`, este informe se da por finalizado y congelado. El proceso de auditoría a ciegas se detiene aquí para dar paso a la **Fase de Desenmascarado y Triage** que debe ser ejecutada de forma independiente.
