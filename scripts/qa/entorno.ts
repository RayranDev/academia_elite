/**
 * Entorno QA AISLADO y DESATENDIDO (`npm run qa:entorno`).
 *
 * Por qué existe: la base de `.env` local es la MISMA que usa producción
 * (mismo proyecto Supabase, schema `public`). Un agente que levante la app y
 * pruebe (crear logros, evaluaciones, subir fotos, editar pagos) escribiría en
 * producción, y `db:reset` / `db:seed` borran esas tablas. Este script levanta
 * un entorno que NO puede tocar nada real:
 *
 *   - Base: schema Postgres `qa` DENTRO de la misma base (misma técnica que los
 *     E2E con `e2e`, ver `tests/e2e/global-setup.ts`). Se recrea con
 *     `DROP SCHEMA "qa" CASCADE` explícito y NUNCA con `prisma migrate reset`
 *     (que apunta al schema por defecto y podría borrar `public`).
 *   - Aserción dura: si la URL resultante no declara el schema `qa` (o declara
 *     `public`), se aborta antes de tocar nada.
 *   - Archivos: `ALMACENAMIENTO_LOCAL_DIR` (disco local bajo scratch/qa) en vez
 *     del bucket real de Supabase.
 *   - Efectos externos apagados: correo en modo consola, sin Upstash, sin
 *     Supabase.
 *   - Build propio (`NEXT_DIST_DIR`): la suite e2e o un `npm run build`
 *     reescriben `.next` y no deben romper este servidor.
 *
 * Una sola instancia a la vez. Se detiene con `npm run qa:detener`.
 *
 * Flags:  --puerto=3300 (por defecto)   --sin-build (reutiliza el build QA)
 */
import "dotenv/config";
import { execSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { schemaDeUrl } from "../guardia-borrado.mjs";
import { DEMO_PASSWORD } from "../../prisma/seed-credenciales";
import { detectarTipoImagen, procesarFoto } from "../../src/lib/foto/process";
import { guardarEnDisco } from "../../src/lib/foto/almacenamiento-local";
import {
  DIR_QA,
  DIR_UPLOADS,
  DIST_DIR_QA,
  RAIZ,
  RUTA_ENTORNO,
  RUTA_LOG,
  SCHEMA_QA,
  borrarEntorno,
  dormir,
  escuchaEnPuerto,
  leerEntorno,
  matarArbol,
  pidVivo,
  puertoLibre,
  type CuentaDemo,
  type EntornoQa,
} from "./lib";

const ESPERA_MAX_MS = 120_000;

function fallar(mensaje: string): never {
  console.error(`\nqa:entorno: ${mensaje}`);
  process.exit(1);
}

function leerFlags() {
  let puerto = 3300;
  let sinBuild = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--sin-build") sinBuild = true;
    else if (arg.startsWith("--puerto=")) puerto = Number(arg.slice("--puerto=".length));
    else fallar(`flag desconocido: ${arg}`);
  }
  if (!Number.isInteger(puerto) || puerto < 1024 || puerto > 65535) {
    fallar("--puerto debe ser un entero entre 1024 y 65535.");
  }
  return { puerto, sinBuild };
}

/** Misma conexión, apuntada al schema `qa`. Con aserción dura. */
function urlDeQa(url: string): string {
  const u = new URL(url);
  u.searchParams.set("schema", SCHEMA_QA);
  const resultado = u.toString();
  asegurarSchemaQa(resultado);
  return resultado;
}

/** Aborta si la URL no apunta EXACTAMENTE al schema `qa` (jamás `public`). */
function asegurarSchemaQa(url: string): void {
  const lectura = schemaDeUrl(url);
  // `!== "qa"` ya excluye "public"; se compara con el literal a propósito.
  if (!lectura.ok || lectura.schema !== SCHEMA_QA) {
    fallar(
      `la URL no apunta al schema "${SCHEMA_QA}" (declara "${lectura.ok ? lectura.schema : "?"}"). ` +
        "Abortado sin tocar nada.",
    );
  }
}

async function recrearSchema(urlDirecta: string): Promise<void> {
  // Se conecta con la URL directa SIN `?schema=` (lo ignora pg de todos modos).
  const client = new Client({ connectionString: urlDirecta });
  await client.connect();
  try {
    // Explícito y con literal fijo: no puede tocar `public`.
    await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA_QA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${SCHEMA_QA}"`);
  } finally {
    await client.end();
  }
}

/**
 * Pone la foto del niño de marca (`public/nino_carta.png`, generado por IA, NO
 * es un menor real: ver docs/GUIA-DE-MARCA.md §1) en los jugadores demo, para
 * que las cartas muestren esa cara y no el avatar generado. Mismo pipeline que
 * la subida real (magic bytes + EXIF fuera + WebP), nombre UUID, guardado en el
 * almacenamiento LOCAL del entorno y SOLO dentro del schema `qa`.
 */
async function ponerFotoDeMarca(urlDirecta: string): Promise<number> {
  const ruta = path.join(RAIZ, "public", "nino_carta.png");
  if (!existsSync(ruta)) {
    fallar("falta public/nino_carta.png (personaje de marca).");
  }
  const original = readFileSync(ruta);
  if (!detectarTipoImagen(original)) {
    fallar("public/nino_carta.png no es una imagen válida.");
  }
  const procesada = await procesarFoto(original);

  const client = new Client({ connectionString: urlDirecta });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "${SCHEMA_QA}"."Jugador"`,
    );
    for (const { id } of rows) {
      // Un archivo por jugador, como en la realidad: borrar la foto de uno no
      // deja sin imagen a los demás.
      const nombre = `${randomUUID()}.webp`;
      await guardarEnDisco(DIR_UPLOADS, nombre, procesada);
      await client.query(
        `UPDATE "${SCHEMA_QA}"."Jugador"
            SET "fotoUrl" = $1, "consentimientoFoto" = true, "consentimientoFotoFecha" = now()
          WHERE id = $2`,
        [nombre, id],
      );
    }
    return rows.length;
  } finally {
    await client.end();
  }
}

async function leerCuentas(urlDirecta: string): Promise<CuentaDemo[]> {
  const client = new Client({ connectionString: urlDirecta });
  await client.connect();
  try {
    const { rows } = await client.query<CuentaDemo>(
      `SELECT u.email AS correo, u.rol AS rol, e.nombre AS escuela
         FROM "${SCHEMA_QA}"."User" u
         LEFT JOIN "${SCHEMA_QA}"."Escuela" e ON e.id = u."escuelaId"
        ORDER BY u.rol, u.email`,
    );
    return rows;
  } finally {
    await client.end();
  }
}

async function esperarLogin(url: string, hijoMurio: () => boolean): Promise<void> {
  const limite = Date.now() + ESPERA_MAX_MS;
  while (Date.now() < limite) {
    if (hijoMurio()) fallar(`el servidor terminó al arrancar. Revisa ${RUTA_LOG}.`);
    try {
      const res = await fetch(`${url}/login`, { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      // Todavía no escucha.
    }
    await dormir(1000);
  }
  fallar(`/login no respondió 200 en ${ESPERA_MAX_MS / 1000}s. Revisa ${RUTA_LOG}.`);
}

async function main() {
  const { puerto, sinBuild } = leerFlags();

  // 0) Una sola instancia a la vez.
  const previo = leerEntorno();
  if (previo) {
    if (pidVivo(previo.pid) && escuchaEnPuerto(previo.pid, previo.puerto)) {
      fallar(
        `ya hay un entorno QA activo (pid ${previo.pid}, ${previo.url}). ` +
          "Detenlo con `npm run qa:detener` antes de crear otro.",
      );
    }
    console.log("Se descarta un entorno.json obsoleto (su proceso ya no existe).");
    borrarEntorno();
  }
  if (!(await puertoLibre(puerto))) {
    fallar(`el puerto ${puerto} está ocupado por otro proceso. Usa --puerto=<otro>.`);
  }

  // 1) URLs del schema qa, con aserción dura ANTES de tocar nada.
  const pooler = process.env.DATABASE_URL;
  const directa = process.env.DIRECT_URL ?? pooler;
  if (!pooler || !directa) fallar("faltan DATABASE_URL / DIRECT_URL en .env.");
  const urlApp = urlDeQa(pooler);
  const urlDirecta = urlDeQa(directa);
  asegurarSchemaQa(urlApp);
  asegurarSchemaQa(urlDirecta);

  const baseUrl = `http://localhost:${puerto}`;
  const envQa: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: urlApp,
    DIRECT_URL: urlDirecta,
    AUTH_URL: baseUrl,
    NEXTAUTH_URL: baseUrl,
    // Correo en modo consola: sin clave Resend no se envía nada.
    RESEND_API_KEY: "",
    EMAIL_DEV_TO: "",
    EMAIL_EQUIPO: "",
    // Rate limit en memoria (el de Upstash es distribuido y persistente).
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    // Sin Supabase: los archivos van al disco local. Con SUPABASE_URL definida
    // junto a ALMACENAMIENTO_LOCAL_DIR el almacenamiento se niega a funcionar.
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
    ALMACENAMIENTO_LOCAL_DIR: DIR_UPLOADS,
    NEXT_DIST_DIR: DIST_DIR_QA,
    NEXT_TELEMETRY_DISABLED: "1",
  };

  mkdirSync(DIR_QA, { recursive: true });

  // 2) Recrear SOLO el schema qa, migrar y sembrar dentro de él.
  console.log(`> Recreando el schema "${SCHEMA_QA}" (DROP/CREATE explícito)…`);
  await recrearSchema(directa);
  rmSync(DIR_UPLOADS, { recursive: true, force: true });
  mkdirSync(DIR_UPLOADS, { recursive: true });
  console.log("> prisma migrate deploy…");
  execSync("npx prisma migrate deploy", { cwd: RAIZ, env: envQa, stdio: "inherit" });
  console.log("> prisma db seed…");
  execSync("npx prisma db seed", { cwd: RAIZ, env: envQa, stdio: "inherit" });

  // 3) Foto del niño de marca en las cartas demo.
  const nFotos = await ponerFotoDeMarca(directa);
  console.log(`> Foto de marca asignada a ${nFotos} jugadores demo (solo schema "${SCHEMA_QA}").`);

  // 4) Build propio del entorno QA.
  if (sinBuild) {
    if (!existsSync(path.join(RAIZ, DIST_DIR_QA, "BUILD_ID"))) {
      fallar("--sin-build pero no existe un build QA previo. Ejecuta sin esa flag.");
    }
    console.log("> Reutilizando el build QA existente (--sin-build).");
  } else {
    console.log("> npm run build (puede tardar unos minutos)…");
    const build = spawnSync("npm run build", {
      cwd: RAIZ,
      env: envQa,
      stdio: "inherit",
      shell: true,
    });
    if (build.status !== 0) fallar("el build falló.");
  }

  // 5) Servidor desacoplado: sobrevive a este script; se detiene con qa:detener.
  const nextBin = require.resolve("next/dist/bin/next");
  const fdLog = openSync(RUTA_LOG, "w");
  const hijo = spawn(process.execPath, [nextBin, "start", "-p", String(puerto)], {
    cwd: RAIZ,
    env: envQa,
    detached: true,
    stdio: ["ignore", fdLog, fdLog],
    windowsHide: true,
  });
  closeSync(fdLog);
  let murio = false;
  hijo.once("exit", () => {
    murio = true;
  });
  hijo.unref();
  const pid = hijo.pid;
  if (!pid) fallar("no se pudo lanzar el servidor.");

  try {
    await esperarLogin(baseUrl, () => murio);
  } catch (e) {
    matarArbol(pid);
    throw e;
  }

  // 6) Descriptor del entorno para el agente.
  const entorno: EntornoQa = {
    puerto,
    url: baseUrl,
    pid,
    schema: SCHEMA_QA,
    uploads: DIR_UPLOADS,
    passwordDemo: DEMO_PASSWORD,
    cuentas: await leerCuentas(directa),
    iniciadoEn: new Date().toISOString(),
  };
  writeFileSync(RUTA_ENTORNO, JSON.stringify(entorno, null, 2) + "\n");

  console.log("\n=== Entorno QA listo ===");
  console.log(`URL:        ${entorno.url}`);
  console.log(`PID:        ${entorno.pid}`);
  console.log(`Schema:     ${entorno.schema} (NO toca "public")`);
  console.log(`Uploads:    ${entorno.uploads}`);
  console.log(`Log:        ${RUTA_LOG}`);
  console.log(`Descriptor: ${RUTA_ENTORNO}`);
  console.log(`Contraseña de las cuentas demo: ${entorno.passwordDemo}`);
  for (const c of entorno.cuentas) {
    console.log(`  - ${c.rol.padEnd(13)} ${c.correo}${c.escuela ? `  (${c.escuela})` : ""}`);
  }
  console.log("\nPara terminar: npm run qa:detener");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
