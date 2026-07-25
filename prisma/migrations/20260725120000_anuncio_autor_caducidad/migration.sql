-- Anuncios: autor (para mostrar quién publicó) y caducidad opcional (al vencer,
-- el anuncio deja de mostrarse a las familias pero sigue en el panel). Columnas
-- nullable: no rompen los anuncios existentes. La tabla ya tiene RLS.
ALTER TABLE "Anuncio" ADD COLUMN "autorId" TEXT;
ALTER TABLE "Anuncio" ADD COLUMN "caducaEn" TIMESTAMP(3);
