-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notificacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "url" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Notificacion" ("createdAt", "cuerpo", "id", "leida", "tipo", "titulo", "url", "userId") SELECT "createdAt", "cuerpo", "id", "leida", "tipo", "titulo", "url", "userId" FROM "Notificacion";
DROP TABLE "Notificacion";
ALTER TABLE "new_Notificacion" RENAME TO "Notificacion";
CREATE INDEX "Notificacion_userId_leida_createdAt_idx" ON "Notificacion"("userId", "leida", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
