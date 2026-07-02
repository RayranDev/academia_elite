-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "escuelaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificadoEn" TIMESTAMP(3),
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueoTipo" TEXT,
    "bloqueoMensaje" TEXT,
    "bloqueadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escuela" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "codigoRef" TEXT,
    "logoUrl" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#4ADE80',
    "frecuenciaEvaluacionDias" INTEGER NOT NULL DEFAULT 30,
    "topeBonusEntreEvals" INTEGER NOT NULL DEFAULT 3,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escuela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancha" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "anioDesde" INTEGER NOT NULL,
    "anioHasta" INTEGER NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrenador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,

    CONSTRAINT "Entrenador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrenadorCategoria" (
    "entrenadorId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "EntrenadorCategoria_pkey" PRIMARY KEY ("entrenadorId","categoriaId")
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "padreUserId" TEXT,
    "cuentaUserId" TEXT,
    "codigoJugador" TEXT,
    "codigoRef" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "posicion" TEXT NOT NULL,
    "dorsal" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fotoUrl" TEXT,
    "avatarConfig" TEXT,
    "consentimientoFoto" BOOLEAN NOT NULL DEFAULT false,
    "consentimientoFotoFecha" TIMESTAMP(3),
    "fondoEquipadoId" TEXT,
    "menBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "menBonusActualizado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoInvitacion" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "usosMaximos" INTEGER NOT NULL DEFAULT 1,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CodigoInvitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluacion" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "sprint30mSeg" DOUBLE PRECISION NOT NULL,
    "saltoVerticalCm" DOUBLE PRECISION NOT NULL,
    "agilidadIllinoisSeg" DOUBLE PRECISION NOT NULL,
    "resistenciaYoyoNivel" DOUBLE PRECISION NOT NULL,
    "controlBalon" DOUBLE PRECISION NOT NULL,
    "pase" DOUBLE PRECISION NOT NULL,
    "tiro" DOUBLE PRECISION NOT NULL,
    "regate" DOUBLE PRECISION NOT NULL,
    "actitud" DOUBLE PRECISION NOT NULL,
    "concentracion" DOUBLE PRECISION NOT NULL,
    "trabajoEquipo" DOUBLE PRECISION NOT NULL,
    "resiliencia" DOUBLE PRECISION NOT NULL,
    "observacionesPrivadas" TEXT,

    CONSTRAINT "Evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatsCalculados" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "rit" INTEGER NOT NULL,
    "tir" INTEGER NOT NULL,
    "pas" INTEGER NOT NULL,
    "reg" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "fis" INTEGER NOT NULL,
    "men" INTEGER NOT NULL,
    "ovr" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    "bonusAplicado" INTEGER NOT NULL DEFAULT 0,
    "versionFormula" TEXT NOT NULL DEFAULT 'v1.1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatsCalculados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "canchaId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "rival" TEXT,
    "esLocal" BOOLEAN,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "resultadoLocal" INTEGER,
    "resultadoVisitante" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadisticaPartido" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "titular" BOOLEAN NOT NULL DEFAULT false,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,
    "asistencias" INTEGER NOT NULL DEFAULT 0,
    "amarillas" INTEGER NOT NULL DEFAULT 0,
    "roja" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EstadisticaPartido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JugadorConvocado" (
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "confirmacion" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "confirmadoEn" TIMESTAMP(3),

    CONSTRAINT "JugadorConvocado_pkey" PRIMARY KEY ("eventoId","jugadorId")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cerrada" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leidoPorDestinatario" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "autorRol" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "visibleJugador" BOOLEAN NOT NULL DEFAULT false,
    "fijado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "url" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "statBonus" TEXT,
    "valorBonus" INTEGER,
    "repetible" BOOLEAN NOT NULL DEFAULT false,
    "icono" TEXT NOT NULL,
    "posicion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "escuelaId" TEXT,

    CONSTRAINT "Logro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogroEscuela" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "desde" TIMESTAMP(3),
    "hasta" TIMESTAMP(3),

    CONSTRAINT "LogroEscuela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogroJugador" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "otorgadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bonusConsumido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LogroJugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjetivoJugador" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "creadoPorEntrenadorId" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "valorMeta" INTEGER NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "ObjetivoJugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgresoSemanal" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "academico" BOOLEAN NOT NULL DEFAULT false,
    "comportamiento" BOOLEAN NOT NULL DEFAULT false,
    "puntualidad" BOOLEAN NOT NULL DEFAULT false,
    "ayudaCasa" BOOLEAN NOT NULL DEFAULT false,
    "valores" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "validadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgresoSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nombreEscuela" TEXT NOT NULL,
    "contactoNombre" TEXT NOT NULL,
    "contactoEmail" TEXT NOT NULL,
    "telefono" TEXT,
    "ciudad" TEXT,
    "mensaje" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "origen" TEXT,
    "responsableId" TEXT,
    "proximaAccion" TEXT,
    "fechaProximoContacto" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNota" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroFormula" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametroFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FondoCarta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estilo" TEXT NOT NULL,
    "colorTexto" TEXT,
    "requisitoTipo" TEXT NOT NULL,
    "requisitoValor" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "efecto" TEXT NOT NULL DEFAULT 'NINGUNO',
    "efectoParams" JSONB,

    CONSTRAINT "FondoCarta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FondoDesbloqueado" (
    "id" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "desbloqueadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FondoDesbloqueado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroEscuela" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametroEscuela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "escuelaId" TEXT,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membresia" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "monto" DOUBLE PRECISION,

    CONSTRAINT "Membresia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoporteSesion" (
    "id" TEXT NOT NULL,
    "superAdminId" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "soloLectura" BOOLEAN NOT NULL DEFAULT true,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEn" TIMESTAMP(3),

    CONSTRAINT "SoporteSesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_escuelaId_idx" ON "User"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAuth_tokenHash_key" ON "TokenAuth"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenAuth_userId_tipo_idx" ON "TokenAuth"("userId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Escuela_slug_key" ON "Escuela"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Escuela_codigoRef_key" ON "Escuela"("codigoRef");

-- CreateIndex
CREATE INDEX "Sede_escuelaId_idx" ON "Sede"("escuelaId");

-- CreateIndex
CREATE INDEX "Categoria_escuelaId_idx" ON "Categoria"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrenador_userId_key" ON "Entrenador"("userId");

-- CreateIndex
CREATE INDEX "Entrenador_escuelaId_idx" ON "Entrenador"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_cuentaUserId_key" ON "Jugador"("cuentaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_codigoJugador_key" ON "Jugador"("codigoJugador");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_codigoRef_key" ON "Jugador"("codigoRef");

-- CreateIndex
CREATE INDEX "Jugador_escuelaId_categoriaId_idx" ON "Jugador"("escuelaId", "categoriaId");

-- CreateIndex
CREATE INDEX "Jugador_padreUserId_idx" ON "Jugador"("padreUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoInvitacion_codigo_key" ON "CodigoInvitacion"("codigo");

-- CreateIndex
CREATE INDEX "CodigoInvitacion_escuelaId_idx" ON "CodigoInvitacion"("escuelaId");

-- CreateIndex
CREATE INDEX "Evaluacion_escuelaId_jugadorId_idx" ON "Evaluacion"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "StatsCalculados_evaluacionId_key" ON "StatsCalculados"("evaluacionId");

-- CreateIndex
CREATE INDEX "StatsCalculados_escuelaId_jugadorId_idx" ON "StatsCalculados"("escuelaId", "jugadorId");

-- CreateIndex
CREATE INDEX "Evento_escuelaId_categoriaId_inicio_idx" ON "Evento"("escuelaId", "categoriaId", "inicio");

-- CreateIndex
CREATE INDEX "EstadisticaPartido_escuelaId_jugadorId_idx" ON "EstadisticaPartido"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "EstadisticaPartido_eventoId_jugadorId_key" ON "EstadisticaPartido"("eventoId", "jugadorId");

-- CreateIndex
CREATE INDEX "Asistencia_escuelaId_jugadorId_idx" ON "Asistencia"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_eventoId_jugadorId_key" ON "Asistencia"("eventoId", "jugadorId");

-- CreateIndex
CREATE INDEX "Conversacion_escuelaId_jugadorId_idx" ON "Conversacion"("escuelaId", "jugadorId");

-- CreateIndex
CREATE INDEX "Mensaje_conversacionId_createdAt_idx" ON "Mensaje"("conversacionId", "createdAt");

-- CreateIndex
CREATE INDEX "Anuncio_escuelaId_categoriaId_createdAt_idx" ON "Anuncio"("escuelaId", "categoriaId", "createdAt");

-- CreateIndex
CREATE INDEX "Notificacion_userId_leida_createdAt_idx" ON "Notificacion"("userId", "leida", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Logro_codigo_key" ON "Logro"("codigo");

-- CreateIndex
CREATE INDEX "Logro_posicion_activo_idx" ON "Logro"("posicion", "activo");

-- CreateIndex
CREATE INDEX "LogroEscuela_escuelaId_idx" ON "LogroEscuela"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "LogroEscuela_escuelaId_logroId_key" ON "LogroEscuela"("escuelaId", "logroId");

-- CreateIndex
CREATE INDEX "LogroJugador_escuelaId_jugadorId_idx" ON "LogroJugador"("escuelaId", "jugadorId");

-- CreateIndex
CREATE INDEX "ObjetivoJugador_escuelaId_jugadorId_idx" ON "ObjetivoJugador"("escuelaId", "jugadorId");

-- CreateIndex
CREATE INDEX "ProgresoSemanal_escuelaId_jugadorId_idx" ON "ProgresoSemanal"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgresoSemanal_jugadorId_semana_key" ON "ProgresoSemanal"("jugadorId", "semana");

-- CreateIndex
CREATE INDEX "LeadNota_leadId_createdAt_idx" ON "LeadNota"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParametroFormula_clave_key" ON "ParametroFormula"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "FondoCarta_codigo_key" ON "FondoCarta"("codigo");

-- CreateIndex
CREATE INDEX "FondoDesbloqueado_jugadorId_idx" ON "FondoDesbloqueado"("jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "FondoDesbloqueado_jugadorId_fondoId_key" ON "FondoDesbloqueado"("jugadorId", "fondoId");

-- CreateIndex
CREATE INDEX "ParametroEscuela_escuelaId_idx" ON "ParametroEscuela"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "ParametroEscuela_escuelaId_clave_key" ON "ParametroEscuela"("escuelaId", "clave");

-- CreateIndex
CREATE INDEX "AuditLog_escuelaId_createdAt_idx" ON "AuditLog"("escuelaId", "createdAt");

-- CreateIndex
CREATE INDEX "Membresia_escuelaId_idx" ON "Membresia"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "Membresia_escuelaId_jugadorId_periodo_key" ON "Membresia"("escuelaId", "jugadorId", "periodo");

-- CreateIndex
CREATE INDEX "SoporteSesion_superAdminId_finalizadaEn_idx" ON "SoporteSesion"("superAdminId", "finalizadaEn");

-- CreateIndex
CREATE INDEX "SoporteSesion_escuelaId_idx" ON "SoporteSesion"("escuelaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAuth" ADD CONSTRAINT "TokenAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sede" ADD CONSTRAINT "Sede_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrenador" ADD CONSTRAINT "Entrenador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrenador" ADD CONSTRAINT "Entrenador_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrenadorCategoria" ADD CONSTRAINT "EntrenadorCategoria_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Entrenador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrenadorCategoria" ADD CONSTRAINT "EntrenadorCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_padreUserId_fkey" FOREIGN KEY ("padreUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_cuentaUserId_fkey" FOREIGN KEY ("cuentaUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_fondoEquipadoId_fkey" FOREIGN KEY ("fondoEquipadoId") REFERENCES "FondoCarta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoInvitacion" ADD CONSTRAINT "CodigoInvitacion_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Entrenador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatsCalculados" ADD CONSTRAINT "StatsCalculados_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatsCalculados" ADD CONSTRAINT "StatsCalculados_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadisticaPartido" ADD CONSTRAINT "EstadisticaPartido_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadisticaPartido" ADD CONSTRAINT "EstadisticaPartido_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JugadorConvocado" ADD CONSTRAINT "JugadorConvocado_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JugadorConvocado" ADD CONSTRAINT "JugadorConvocado_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroEscuela" ADD CONSTRAINT "LogroEscuela_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroJugador" ADD CONSTRAINT "LogroJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroJugador" ADD CONSTRAINT "LogroJugador_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoJugador" ADD CONSTRAINT "ObjetivoJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgresoSemanal" ADD CONSTRAINT "ProgresoSemanal_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNota" ADD CONSTRAINT "LeadNota_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondoDesbloqueado" ADD CONSTRAINT "FondoDesbloqueado_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondoDesbloqueado" ADD CONSTRAINT "FondoDesbloqueado_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "FondoCarta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametroEscuela" ADD CONSTRAINT "ParametroEscuela_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
