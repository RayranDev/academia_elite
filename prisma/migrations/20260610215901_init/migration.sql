-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "escuelaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Escuela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#4ADE80',
    "frecuenciaEvaluacionDias" INTEGER NOT NULL DEFAULT 30,
    "topeBonusEntreEvals" INTEGER NOT NULL DEFAULT 3,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    CONSTRAINT "Sede_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cancha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sedeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    CONSTRAINT "Cancha_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "anioDesde" INTEGER NOT NULL,
    "anioHasta" INTEGER NOT NULL,
    CONSTRAINT "Categoria_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entrenador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    CONSTRAINT "Entrenador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Entrenador_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntrenadorCategoria" (
    "entrenadorId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    PRIMARY KEY ("entrenadorId", "categoriaId"),
    CONSTRAINT "EntrenadorCategoria_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Entrenador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EntrenadorCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "padreUserId" TEXT,
    "cuentaUserId" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNacimiento" DATETIME NOT NULL,
    "posicion" TEXT NOT NULL,
    "dorsal" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fotoUrl" TEXT,
    "consentimientoFoto" BOOLEAN NOT NULL DEFAULT false,
    "consentimientoFotoFecha" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Jugador_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Jugador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Jugador_padreUserId_fkey" FOREIGN KEY ("padreUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Jugador_cuentaUserId_fkey" FOREIGN KEY ("cuentaUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodigoInvitacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "usosMaximos" INTEGER NOT NULL DEFAULT 1,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" DATETIME NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CodigoInvitacion_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evaluacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "sprint30mSeg" REAL NOT NULL,
    "saltoVerticalCm" REAL NOT NULL,
    "agilidadIllinoisSeg" REAL NOT NULL,
    "resistenciaYoyoNivel" REAL NOT NULL,
    "controlBalon" REAL NOT NULL,
    "pase" REAL NOT NULL,
    "tiro" REAL NOT NULL,
    "regate" REAL NOT NULL,
    "actitud" REAL NOT NULL,
    "concentracion" REAL NOT NULL,
    "trabajoEquipo" REAL NOT NULL,
    "resiliencia" REAL NOT NULL,
    "observacionesPrivadas" TEXT,
    CONSTRAINT "Evaluacion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Entrenador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatsCalculados" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatsCalculados_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StatsCalculados_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "canchaId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "rival" TEXT,
    "esLocal" BOOLEAN,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "notas" TEXT,
    "resultadoLocal" INTEGER,
    "resultadoVisitante" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evento_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evento_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JugadorConvocado" (
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "confirmacion" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "confirmadoEn" DATETIME,

    PRIMARY KEY ("eventoId", "jugadorId"),
    CONSTRAINT "JugadorConvocado_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JugadorConvocado_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,
    CONSTRAINT "Asistencia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asistencia_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cerrada" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversacion_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversacionId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leidoPorDestinatario" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mensaje_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "autorRol" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "visibleJugador" BOOLEAN NOT NULL DEFAULT false,
    "fijado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Anuncio_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Anuncio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "url" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Logro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "statBonus" TEXT,
    "valorBonus" INTEGER,
    "repetible" BOOLEAN NOT NULL DEFAULT false,
    "icono" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LogroJugador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "otorgadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bonusConsumido" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LogroJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LogroJugador_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObjetivoJugador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "creadoPorEntrenadorId" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "valorMeta" INTEGER NOT NULL,
    "fechaLimite" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "ObjetivoJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombreEscuela" TEXT NOT NULL,
    "contactoNombre" TEXT NOT NULL,
    "contactoEmail" TEXT NOT NULL,
    "telefono" TEXT,
    "ciudad" TEXT,
    "mensaje" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ParametroFormula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "descripcion" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "actorRol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "escuelaId" TEXT,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Membresia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "monto" REAL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_escuelaId_idx" ON "User"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "Escuela_slug_key" ON "Escuela"("slug");

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
CREATE INDEX "LogroJugador_escuelaId_jugadorId_idx" ON "LogroJugador"("escuelaId", "jugadorId");

-- CreateIndex
CREATE INDEX "ObjetivoJugador_escuelaId_jugadorId_idx" ON "ObjetivoJugador"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "ParametroFormula_clave_key" ON "ParametroFormula"("clave");

-- CreateIndex
CREATE INDEX "AuditLog_escuelaId_createdAt_idx" ON "AuditLog"("escuelaId", "createdAt");
