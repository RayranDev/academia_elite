-- AlterTable
ALTER TABLE "Escuela" ADD COLUMN     "contactoEmail" TEXT,
ADD COLUMN     "contactoInstagram" TEXT,
ADD COLUMN     "contactoWhatsapp" TEXT,
ADD COLUMN     "landingDescripcion" TEXT,
ADD COLUMN     "landingHeroId" TEXT,
ADD COLUMN     "landingPublicada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landingTitular" TEXT;
