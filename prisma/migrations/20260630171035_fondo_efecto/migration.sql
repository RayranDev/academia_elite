-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FondoCarta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estilo" TEXT NOT NULL,
    "colorTexto" TEXT,
    "requisitoTipo" TEXT NOT NULL,
    "requisitoValor" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "efecto" TEXT NOT NULL DEFAULT 'NINGUNO',
    "efectoParams" JSONB
);
INSERT INTO "new_FondoCarta" ("codigo", "colorTexto", "descripcion", "estilo", "id", "nombre", "orden", "requisitoTipo", "requisitoValor") SELECT "codigo", "colorTexto", "descripcion", "estilo", "id", "nombre", "orden", "requisitoTipo", "requisitoValor" FROM "FondoCarta";
DROP TABLE "FondoCarta";
ALTER TABLE "new_FondoCarta" RENAME TO "FondoCarta";
CREATE UNIQUE INDEX "FondoCarta_codigo_key" ON "FondoCarta"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
