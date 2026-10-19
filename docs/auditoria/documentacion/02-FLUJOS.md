# Flujos de Punta a Punta

Este documento describe los procesos operativos clave de **Fútbol Career Mode** mediante diagramas de secuencia y estados en sintaxis Mermaid, detallando la interacción entre el usuario, la interfaz de usuario (UI), las Server Actions, la capa de servicios de dominio, los repositorios y la base de datos PostgreSQL.

---

## 1. Flujo: Registro de Familia con Código de Invitación

Permite a un nuevo acudiente incorporarse a la escuela y registrar a su hijo/a utilizando un código emitido por la administración.

```mermaid
sequenceDiagram
    autonumber
    actor Familia as Acudiente (Familia)
    participant UI as Página /registro/[codigo]
    participant Action as registrarConCodigoAction
    participant Service as registro.service
    participant Repo as jugador / user repo
    participant DB as PostgreSQL (Prisma)

    Familia->>UI: Ingresa al link /registro/COD-123
    UI->>Action: safeParse(datosFormulario)
    Action->>Service: registrarConCodigo(input, ip)
    Service->>Repo: validarCodigo(escuelaId, "COD-123")
    alt Código inválido, vencido o agotado
        Service-->>Action: ValidationError("Código no disponible")
        Action-->>UI: { ok: false, error: "..." }
        UI-->>Familia: Muestra mensaje de error
    else Código vigente
        Service->>DB: $transaction()
        Note over Service,DB: Crea User (rol JUGADOR, passwordHash bcrypt)<br/>Crea Jugador (estado PENDIENTE, codigoRef)<br/>Incrementa usos en CodigoInvitacion<br/>Registra aceptación de Términos (Habeas Data)
        DB-->>Service: Transacción exitosa
        Service-->>Action: { userId, jugadorId }
        Action->>UI: { ok: true, redirectTo: "/login" }
        UI-->>Familia: Redirige con aviso de bienvenida
    end
```

---

## 2. Flujo: Alta Asistida de Jugador (por DT o Escuela)

Permite al club dar de alta a un menor de forma asistida en la cancha o en la oficina administrativa, generando credenciales temporales para la familia.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as DT / Escuela Admin
    participant UI as Modal Alta / Formulario por pasos
    participant Action as crearJugadorCompletoAction
    participant Service as alta-jugador.service
    participant Hash as password / token helper
    participant DB as PostgreSQL

    Admin->>UI: Completa Paso 1 (Identidad) + Paso 2 (Ficha/Salud) + Paso 3 (Acudiente)
    UI->>Action: safeParse(altaJugadorSchema)
    Action->>Service: crearJugadorCompleto(ctx, data)
    Note over Service: Aplica requireRole(['ESCUELA_ADMIN', 'DT', 'SUPER_ADMIN'])<br/>Valida alcance de categorías si es DT
    Service->>Hash: generarPasswordTemporal()
    Service->>DB: $transaction()
    Note over Service,DB: Inserta Jugador (estado ACTIVO)<br/>Crea Ficha Médica (con consentimiento explícito)<br/>Crea User acudiente vinculado con hash seguro<br/>Registra en AuditLog
    DB-->>Service: OK
    Service-->>Action: { jugador, credencialesTemporales }
    Action-->>UI: { ok: true, data: { email, passwordTemporal } }
    UI-->>Admin: Muestra la contraseña temporal una sola vez para entregar a la familia
```

---

## 3. Flujo: Evaluación Deportiva y Nacimiento de la Carta

El núcleo de la gamificación: el entrenador toma mediciones reales, el motor matemático calcula los atributos y nace el cromo virtual.

```mermaid
sequenceDiagram
    autonumber
    actor DT as Director Técnico
    participant UI as /dt/jugadores/[id]/evaluar
    participant Action as crearEvaluacionAction
    participant EvalService as evaluacion.service
    participant StatsEngine as stats-engine (Puro)
    participant DB as PostgreSQL

    DT->>UI: Digita 4 pruebas físicas + 4 notas técnicas + 4 mentalidad
    UI->>Action: safeParse(evaluacionSchema)
    Action->>EvalService: crearEvaluacion(ctx, input)
    EvalService->>EvalService: categoriasDelDt(ctx)
    Note over EvalService: Verifica que el jugador pertenezca a sus categorías
    EvalService->>DB: Obtiene rangos de la categoría + umbrales de la escuela + bonus de logros
    DB-->>EvalService: Rangos, Umbrales, Logros pendientes
    EvalService->>StatsEngine: computeStats(medidas, opciones)
    Note over StatsEngine: Normaliza físicas a escala 40-99<br/>Normaliza notas técnicas y mentalidad<br/>Pondera según posición (o fórmula portero)<br/>Aplica bonus de logros (tope máx 3)<br/>Calcula OVR y asigna nivel (Bronce/Plata/Oro/Héroe)
    StatsEngine-->>EvalService: ResultadoStats { rit, tir, pas, reg, def, fis, men, ovr, nivel }
    EvalService->>DB: $transaction()
    Note over EvalService,DB: Inserta Evaluacion (inmutable)<br/>Inserta StatsCalculados (snapshot vinculado)<br/>Marca logros como consumidos
    DB-->>EvalService: Transacción confirmada
    EvalService-->>Action: ResultadoStats
    Action-->>UI: { ok: true, data }
    UI-->>DT: Celebra con confeti y presenta la nueva carta del jugador
```

---

## 4. Flujo: Curva de Desarrollo y Recálculo Diario de Mentalidad (MEN)

Muestra cómo la disciplina y la asistencia real en campo modifican el atributo MEN diariamente sin alterar las notas físicas o técnicas.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Vercel Cron (03:00 UTC)
    participant Route as GET /api/cron/men-diario
    participant CurvaService as curva.service
    participant Repo as asistencia / jugador repo
    participant DB as PostgreSQL

    Cron->>Route: GET con Authorization: Bearer CRON_SECRET
    Route->>CurvaService: recalcularMenDiario()
    CurvaService->>Repo: listarJugadoresActivosConStats()
    loop Por cada jugador activo
        CurvaService->>Repo: obtenerAsistenciasRecientes(jugadorId, ultimos30Dias)
        Note over CurvaService: Cuenta entrenamientos y partidos asistidos<br/>Calcula ganancia por asistencia (+0.5 por entreno, +1 por partido)<br/>Calcula penalizaciones si ausencias > umbral<br/>Aplica tope de bonus de la escuela (default +3)
        CurvaService->>DB: Actualiza bonus en StatsCalculados vigentes y recalcula OVR con ovrConMen()
    end
    CurvaService-->>Route: { actualizados: N }
    Route-->>Cron: 200 OK
```

---

## 5. Flujo: Modo Sesión — Partido en Vivo y Cierre

Conducción interactiva de un partido oficial desde el dispositivo móvil del entrenador.

```mermaid
sequenceDiagram
    autonumber
    actor DT as Director Técnico
    participant UI as /dt/eventos/[id]/sesion
    participant Action as sesion.actions
    participant Service as sesion.service
    participant DB as PostgreSQL
    actor Familia as Familiares

    DT->>UI: Pulsa "Iniciar Partido"
    UI->>Action: avanzarPeriodoAction(eventoId, "PRIMER_TIEMPO")
    Action->>Service: arranca reloj de juego

    loop Durante el partido (en vivo)
        DT->>UI: Anota gol a favor (+1) y selecciona autor
        UI->>Action: ajustarGolVivoAction(eventoId, jugadorId, delta: +1)
        Action->>Service: actualiza marcador y suma gol a EstadísticaPartido en DB
        DT->>UI: Saca tarjeta amarilla o azul a un jugador
        UI->>Action: fijarTarjetasSesionAction(eventoId, jugadorId, tarjetas)
        Action->>Service: guarda sanción en Asistencia / Estadistica
    end

    DT->>UI: Finaliza el segundo tiempo y pulsa "Cerrar Partido"
    UI->>Action: cerrarSesionAction(eventoId, notaGeneral, estadisticas)
    Action->>Service: cerrarSesionEvento()
    Service->>DB: Guarda acta final de estadísticas (minutos, goles, asistencias)
    Service->>DB: Inserta Notificacion masiva a todas las familias convocadas
    Service-->>Action: OK
    Action-->>UI: { ok: true }
    Familia->>Familia: Recibe notificación del resultado final en su Hub
```

---

## 6. Flujo: Cobranza, Reporte de Pago y Desbloqueo por Mora

Gestión del ciclo económico del club deportivo y conciliación bancaria.

```mermaid
sequenceDiagram
    autonumber
    actor Escuela as Administración
    actor Familia as Acudiente
    participant UI as Interfaz Web
    participant PagoAction as pago.actions
    participant PagoService as pago.service
    participant Storage as Supabase Storage / Local
    participant DB as PostgreSQL

    Escuela->>UI: En /escuela/membresias pulsa "Generar cuotas del mes"
    UI->>DB: Crea filas Membresia para todos los jugadores activos según arancel
    Note over DB: Estado inicial: PENDIENTE

    Familia->>UI: Ingresa a /jugador/pagos y ve cuota PENDIENTE
    Familia->>UI: Adjunta foto del comprobante de Nequi/Transferencia y pulsa "Reportar Pago"
    UI->>PagoAction: reportarPagoAction(formData)
    PagoAction->>PagoService: reportarPago(ctx, input, [bufferComprobante])
    PagoService->>Storage: Guarda imagen WebP cifrada con UUID en bucket privado
    PagoService->>DB: Crea Pago (estado REPORTADO) vinculado a la Membresia
    PagoService-->>UI: { ok: true }

    Escuela->>UI: Revisa /escuela/pagos y abre el comprobante bancario
    Escuela->>UI: Pulsa "Aprobar Pago"
    UI->>PagoAction: aprobarPagoEscuelaAction(pagoId)
    PagoAction->>PagoService: aprobarPagoEscuela(ctx, pagoId)
    PagoService->>DB: $transaction()
    Note over PagoService,DB: Pago pasa a APROBADO<br/>Membresia pasa a PAGADA con fecha actual<br/>Si el usuario estaba bloqueado por mora, se remueve el bloqueo
    DB-->>PagoService: OK
    PagoService-->>UI: Pago aprobado con éxito
```

---

## 7. Flujo: Sesión de Soporte del Súper Administrador (M2)

Garantía de privacidad de menores: el administrador de la plataforma nunca accede a los datos de una escuela sin una sesión formalmente justificada y auditada.

```mermaid
sequenceDiagram
    autonumber
    actor SA as Súper Admin
    participant UI as /admin/escuelas
    participant SoporteAction as soporte.actions
    participant SoporteService as soporte.service
    participant DB as PostgreSQL

    SA->>UI: Selecciona una escuela y pulsa "Abrir Soporte"
    UI->>SoporteAction: iniciarSoporteAction({ escuelaId, motivo: "Revisión técnica de nómina" })
    SoporteAction->>SoporteService: iniciarSoporte(ctx, input)
    SoporteService->>DB: Crea registro en SoporteSesion (soloLectura: true, motivo, actorId)
    SoporteService->>DB: Registra evento en AuditLog
    SoporteService-->>SoporteAction: OK
    SoporteAction-->>UI: Soporte activo (Solo Lectura)

    alt Si el Súper Admin intenta escribir sin habilitar permisos
        SA->>UI: Intenta editar un jugador o parámetro
        UI->>SoporteService: assertSoportePuedeEscribir(ctx)
        SoporteService-->>UI: ForbiddenError("Sesión de soporte en solo lectura")
    else Habilitación consciente de escritura
        SA->>UI: En el banner pulsa "Habilitar Escritura" e ingresa motivo de cambio
        UI->>SoporteAction: habilitarEscrituraSoporteAction(motivo)
        SoporteAction->>SoporteService: habilitarEscrituraSoporte(ctx, motivo)
        SoporteService->>DB: Actualiza SoporteSesion (soloLectura: false) y registra en AuditLog
        SoporteService-->>UI: Escritura habilitada
    end

    SA->>UI: Al terminar, pulsa "Finalizar Soporte"
    UI->>SoporteAction: finalizarSoporteAction()
    SoporteAction->>SoporteService: finalizarSoporte(ctx)
    SoporteService->>DB: Cierra SoporteSesion con finalizadoEn y audita salida
```

---

## 8. Flujo: Captura de Leads y Conversión a Escuela

Ingreso de nuevas academias a la plataforma a través de la landing pública.

```mermaid
sequenceDiagram
    autonumber
    actor Prospecto as Director de Escuela Interesado
    participant Landing as Landing /e/[slug] o Web Comercial
    participant Api as POST /api/leads
    participant LeadService as lead.service
    participant Email as resend / email.service
    actor SA as Súper Admin
    participant AdminUI as /admin/leads

    Prospecto->>Landing: Llena formulario (Nombre, Escuela, Teléfono, Correo)
    Landing->>Api: POST /api/leads con verificación de honeypot
    Api->>LeadService: crearLead(datos)
    LeadService->>Email: Envia correo de confirmación al lead y alerta al equipo comercial
    LeadService-->>Api: { ok: true }
    Api-->>Prospecto: "Gracias por contactarnos"

    SA->>AdminUI: Revisa el nuevo prospecto en `/admin/leads`
    SA->>AdminUI: Pulsa "Convertir a Escuela" indicando slug y admin inicial
    AdminUI->>LeadService: convertirLeadEnEscuela(leadId, datos)
    Note over LeadService: Crea registro Escuela<br/>Crea Categorías base por defecto<br/>Crea User ESCUELA_ADMIN con password temporal<br/>Marca Lead como CONVERTIDO
    LeadService-->>AdminUI: { adminEmail, passwordTemporal }
    AdminUI-->>SA: Muestra credenciales iniciales para entrega al cliente
```
