-- Curva de desarrollo: bonus de MEN por asistencia (recalculado por cron)
ALTER TABLE "Jugador" ADD COLUMN "menBonus" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Jugador" ADD COLUMN "menBonusActualizado" DATETIME;
