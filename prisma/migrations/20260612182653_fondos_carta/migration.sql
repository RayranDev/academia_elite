-- CreateTable
CREATE TABLE "FondoCarta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estilo" TEXT NOT NULL,
    "requisitoTipo" TEXT NOT NULL,
    "requisitoValor" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "FondoDesbloqueado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jugadorId" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "desbloqueadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FondoDesbloqueado_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FondoDesbloqueado_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "FondoCarta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Jugador" (
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
    "avatarConfig" TEXT,
    "consentimientoFoto" BOOLEAN NOT NULL DEFAULT false,
    "consentimientoFotoFecha" DATETIME,
    "fondoEquipadoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Jugador_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Jugador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Jugador_padreUserId_fkey" FOREIGN KEY ("padreUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Jugador_cuentaUserId_fkey" FOREIGN KEY ("cuentaUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Jugador_fondoEquipadoId_fkey" FOREIGN KEY ("fondoEquipadoId") REFERENCES "FondoCarta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Jugador" ("apellido", "avatarConfig", "categoriaId", "consentimientoFoto", "consentimientoFotoFecha", "createdAt", "cuentaUserId", "dorsal", "escuelaId", "estado", "fechaNacimiento", "fotoUrl", "id", "nombre", "padreUserId", "posicion") SELECT "apellido", "avatarConfig", "categoriaId", "consentimientoFoto", "consentimientoFotoFecha", "createdAt", "cuentaUserId", "dorsal", "escuelaId", "estado", "fechaNacimiento", "fotoUrl", "id", "nombre", "padreUserId", "posicion" FROM "Jugador";
DROP TABLE "Jugador";
ALTER TABLE "new_Jugador" RENAME TO "Jugador";
CREATE UNIQUE INDEX "Jugador_cuentaUserId_key" ON "Jugador"("cuentaUserId");
CREATE INDEX "Jugador_escuelaId_categoriaId_idx" ON "Jugador"("escuelaId", "categoriaId");
CREATE INDEX "Jugador_padreUserId_idx" ON "Jugador"("padreUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FondoCarta_codigo_key" ON "FondoCarta"("codigo");

-- CreateIndex
CREATE INDEX "FondoDesbloqueado_jugadorId_idx" ON "FondoDesbloqueado"("jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "FondoDesbloqueado_jugadorId_fondoId_key" ON "FondoDesbloqueado"("jugadorId", "fondoId");
