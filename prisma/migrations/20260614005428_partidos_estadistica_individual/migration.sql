-- CreateTable
CREATE TABLE "EstadisticaPartido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "titular" BOOLEAN NOT NULL DEFAULT false,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,
    "asistencias" INTEGER NOT NULL DEFAULT 0,
    "amarillas" INTEGER NOT NULL DEFAULT 0,
    "roja" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EstadisticaPartido_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EstadisticaPartido_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evento" (
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
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "resultadoLocal" INTEGER,
    "resultadoVisitante" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evento_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evento_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evento" ("canchaId", "categoriaId", "createdAt", "esLocal", "escuelaId", "fin", "id", "inicio", "notas", "resultadoLocal", "resultadoVisitante", "rival", "tipo", "titulo") SELECT "canchaId", "categoriaId", "createdAt", "esLocal", "escuelaId", "fin", "id", "inicio", "notas", "resultadoLocal", "resultadoVisitante", "rival", "tipo", "titulo" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE INDEX "Evento_escuelaId_categoriaId_inicio_idx" ON "Evento"("escuelaId", "categoriaId", "inicio");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EstadisticaPartido_escuelaId_jugadorId_idx" ON "EstadisticaPartido"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "EstadisticaPartido_eventoId_jugadorId_key" ON "EstadisticaPartido"("eventoId", "jugadorId");
