-- CreateTable
CREATE TABLE "DescuentoRegla" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescuentoRegla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JugadorDescuento" (
    "jugadorId" TEXT NOT NULL,
    "reglaId" TEXT NOT NULL,
    "asignadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JugadorDescuento_pkey" PRIMARY KEY ("jugadorId","reglaId")
);

-- CreateIndex
CREATE INDEX "DescuentoRegla_escuelaId_categoriaId_idx" ON "DescuentoRegla"("escuelaId", "categoriaId");

-- AddForeignKey
ALTER TABLE "DescuentoRegla" ADD CONSTRAINT "DescuentoRegla_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescuentoRegla" ADD CONSTRAINT "DescuentoRegla_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JugadorDescuento" ADD CONSTRAINT "JugadorDescuento_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JugadorDescuento" ADD CONSTRAINT "JugadorDescuento_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "DescuentoRegla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
