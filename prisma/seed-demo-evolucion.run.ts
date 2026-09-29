// Tiene que ser el PRIMER import: normaliza DATABASE_URL antes de que
// `crearEvolucionDemo` cargue nada de `src/` (ver `seed-env.ts`).
import "./seed-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { crearEvolucionDemo } from "./seed-demo-evolucion";

/**
 * Runner standalone de `npm run db:seed:evolucion`: corre SOLO la demo de
 * evolución de sus propios 4 jugadores (no toca el resto del plantel ni la
 * escuela), para poder regenerarla rápido sin pasar por el `npm run db:seed`
 * completo (que limpia y recrea TODO). Sí recalcula, vía el cron real
 * (`recalcularMenDiario`), el bonus de MEN de TODOS los jugadores ACTIVO de
 * la plataforma — es tenant-global a propósito, ver `curva.service.ts`.
 *
 * `npm run db:seed` también la genera (encadenada al final de
 * `prisma/seed.ts`, después de `crearAcademiaElite`), así que este archivo
 * es solo el punto de entrada para correrla sola.
 */
const connectionString = process.env.DATABASE_URL!; // normalizada por seed-env
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

crearEvolucionDemo(db)
  .then(() => console.log("\n✅ Demo de evolución (Academia Élite) lista."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
