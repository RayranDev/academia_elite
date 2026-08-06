-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff_escuelaId_idx" ON "Staff"("escuelaId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
