import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Prepara una base AISLADA para los E2E antes de cada corrida.
 *
 * Por qué: la suite corría contra el mismo schema `public` que se usa a mano.
 * Eso la hacía mentir de dos formas — los datos sembrados podían quedar
 * modificados por el uso manual, y cada corrida acumulaba eventos que
 * desestabilizaban a los specs siguientes. Un gate que falla al azar no es un
 * gate.
 *
 * Cómo: los E2E viven en su propio schema Postgres (`e2e`) DENTRO de la misma
 * base. Se recrea y siembra antes de cada corrida, así el estado es siempre el
 * mismo. No hace falta infraestructura nueva.
 *
 * SEGURIDAD: el reset se hace con `DROP SCHEMA "e2e"` explícito y NUNCA con
 * `prisma migrate reset`, que apunta al schema por defecto y podría borrar
 * `public` —los datos reales— si la URL no llevara el parámetro esperado.
 */
const SCHEMA = "e2e";

/** Misma conexión, apuntada al schema aislado. */
export function urlDeE2E(url: string): string {
  const u = new URL(url);
  u.searchParams.set("schema", SCHEMA);
  return u.toString();
}

export default async function globalSetup(): Promise<void> {
  const pooler = process.env.DATABASE_URL;
  // Las migraciones necesitan conexión directa (sin pgbouncer).
  const directa = process.env.DIRECT_URL ?? pooler;
  if (!pooler || !directa) {
    throw new Error(
      "Faltan DATABASE_URL / DIRECT_URL para preparar la base de E2E.",
    );
  }

  // 1) Recrear SOLO el schema de pruebas. Explícito: no puede tocar `public`.
  const client = new Client({ connectionString: directa });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${SCHEMA}"`);
  } finally {
    await client.end();
  }

  // 2) Migrar y sembrar dentro de ese schema.
  const env = {
    ...process.env,
    DATABASE_URL: urlDeE2E(pooler),
    DIRECT_URL: urlDeE2E(directa),
  };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
}
