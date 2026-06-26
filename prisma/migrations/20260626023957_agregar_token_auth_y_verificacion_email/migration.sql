-- CreateTable
CREATE TABLE "TokenAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" DATETIME NOT NULL,
    "usadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "escuelaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificadoEn" DATETIME,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueoTipo" TEXT,
    "bloqueoMensaje" TEXT,
    "bloqueadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("activo", "bloqueado", "bloqueadoEn", "bloqueoMensaje", "bloqueoTipo", "createdAt", "email", "escuelaId", "id", "nombre", "passwordHash", "rol", "updatedAt") SELECT "activo", "bloqueado", "bloqueadoEn", "bloqueoMensaje", "bloqueoTipo", "createdAt", "email", "escuelaId", "id", "nombre", "passwordHash", "rol", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_escuelaId_idx" ON "User"("escuelaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TokenAuth_tokenHash_key" ON "TokenAuth"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenAuth_userId_tipo_idx" ON "TokenAuth"("userId", "tipo");
