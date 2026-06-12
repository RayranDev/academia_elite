-- CreateTable
CREATE TABLE "ParametroEscuela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParametroEscuela_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ParametroEscuela_escuelaId_idx" ON "ParametroEscuela"("escuelaId");

-- CreateIndex
CREATE UNIQUE INDEX "ParametroEscuela_escuelaId_clave_key" ON "ParametroEscuela"("escuelaId", "clave");
