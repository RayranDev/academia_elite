-- CreateTable
CREATE TABLE "LogroEscuela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "desde" DATETIME,
    "hasta" DATETIME,
    CONSTRAINT "LogroEscuela_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Logro" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "escuelaId" TEXT
);
INSERT INTO "new_Logro" ("codigo", "descripcion", "icono", "id", "nombre", "repetible", "statBonus", "tipo", "valorBonus") SELECT "codigo", "descripcion", "icono", "id", "nombre", "repetible", "statBonus", "tipo", "valorBonus" FROM "Logro";
DROP TABLE "Logro";
ALTER TABLE "new_Logro" RENAME TO "Logro";
CREATE UNIQUE INDEX "Logro_codigo_key" ON "Logro"("codigo");
CREATE INDEX "Logro_posicion_activo_idx" ON "Logro"("posicion", "activo");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "escuelaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueoTipo" TEXT,
    "bloqueoMensaje" TEXT,
    "bloqueadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("activo", "createdAt", "email", "escuelaId", "id", "nombre", "passwordHash", "rol", "updatedAt") SELECT "activo", "createdAt", "email", "escuelaId", "id", "nombre", "passwordHash", "rol", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_escuelaId_idx" ON "User"("escuelaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LogroEscuela_escuelaId_idx" ON "LogroEscuela"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "LogroEscuela_escuelaId_logroId_key" ON "LogroEscuela"("escuelaId", "logroId");
