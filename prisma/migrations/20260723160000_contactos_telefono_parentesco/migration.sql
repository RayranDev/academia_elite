-- Contactos / nómina (PLAN-UX-DT PR-5 §5.1): teléfono de la familia y parentesco
-- del acudiente, para el export de emergencias/ligas. Columnas nullable: no
-- rompen datos existentes. Las tablas User/Jugador ya tienen RLS habilitado, y
-- agregar una columna no lo altera, así que no hace falta reaplicarlo.
ALTER TABLE "User" ADD COLUMN "telefono" TEXT;
ALTER TABLE "Jugador" ADD COLUMN "parentescoAcudiente" TEXT;
