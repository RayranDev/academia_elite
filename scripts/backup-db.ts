import "dotenv/config";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";

/**
 * Backup lógico de TODA la base (40 modelos) antes de correr las migraciones
 * de "categorías: años opcionales + calibración física por categoría real".
 * Un findMany() por modelo -> un JSON por tabla. No es un pg_dump binario
 * (no está instalado en este entorno) pero alcanza para restaurar filas si
 * algo sale mal.
 *
 * Ejecución manual (nunca en el build, este script no se commitea con datos):
 *   DIRECT_URL=<prod-directa> npx tsx scripts/backup-db.ts
 *
 * IMPORTANTE: el resultado contiene datos de menores (PII real). Se escribe
 * FUERA del repo (carpeta temp del sistema), nunca se commitea. Borrar una
 * vez confirmado que las migraciones fueron estables.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL o DATABASE_URL requerida.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Fuera del repo a propósito: carpeta temp del sistema, no `prisma/` ni `scripts/`.
const OUT_BASE = process.env.BACKUP_DIR ?? path.join(os.tmpdir(), "academia-elite-backup-db");

// Nombres de modelo (Prisma schema) -> nombre de delegate (primera letra minúscula).
const MODELOS = [
  "User", "TokenAuth", "Escuela", "Sede", "Cancha", "Categoria", "Entrenador",
  "EntrenadorCategoria", "Jugador", "CodigoInvitacion", "Evaluacion",
  "StatsCalculados", "Evento", "EstadisticaPartido", "JugadorConvocado",
  "Asistencia", "ObservacionJugador", "Conversacion", "Mensaje", "Anuncio",
  "Notificacion", "Logro", "LogroEscuela", "LogroJugador", "ObjetivoJugador",
  "ProgresoSemanal", "Lead", "LeadNota", "ParametroFormula", "FondoCarta",
  "FondoDesbloqueado", "ParametroEscuela", "AuditLog", "Membresia", "Arancel",
  "DescuentoRegla", "JugadorDescuento", "Staff", "Egreso", "SoporteSesion",
];

function delegateName(modelo: string): string {
  return modelo.charAt(0).toLowerCase() + modelo.slice(1);
}

// Serializa Decimal/Date/BigInt de forma segura y reversible.
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return { __decimal: value.toString() };
  if (value instanceof Date) return { __date: value.toISOString() };
  if (typeof value === "bigint") return { __bigint: value.toString() };
  return value;
}

async function main() {
  const marca = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUT_BASE, marca);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Backup lógico -> ${outDir}\n`);
  let totalFilas = 0;
  const resumen: { modelo: string; filas: number; bytes: number }[] = [];

  for (const modelo of MODELOS) {
    const delegate = (db as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[
      delegateName(modelo)
    ];
    if (!delegate) {
      console.warn(`  ⚠ sin delegate para ${modelo}, se salta`);
      continue;
    }
    const filas = await delegate.findMany();
    const json = JSON.stringify(filas, replacer, 2);
    const file = path.join(outDir, `${modelo}.json`);
    fs.writeFileSync(file, json, "utf8");
    totalFilas += filas.length;
    resumen.push({ modelo, filas: filas.length, bytes: Buffer.byteLength(json) });
    console.log(`  • ${modelo.padEnd(22)} ${String(filas.length).padStart(6)} filas`);
  }

  const manifest = {
    fecha: new Date().toISOString(),
    motivo: "Backup previo a migraciones: categorías años opcionales + calibración física por categoría real",
    totalFilas,
    tablas: resumen,
  };
  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n✅ Backup completo: ${totalFilas} filas en ${resumen.length} tablas.`);
  console.log(`   Manifest: ${path.join(outDir, "_manifest.json")}`);
}

main()
  .catch((e) => {
    console.error("❌ Backup falló:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
