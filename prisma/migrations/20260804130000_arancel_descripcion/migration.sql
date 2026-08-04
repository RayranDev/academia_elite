-- Campo de descripcion libre para Arancel, sobre todo para el concepto OTRO:
-- sin esto, un precio "OTRO" queda sin contexto para cuando alguien lo
-- audite despues (reportado en uso real, 2026-08-04).
ALTER TABLE "Arancel" ADD COLUMN "descripcion" TEXT;
