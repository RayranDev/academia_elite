import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  RANGOS_POR_GRUPO,
  PRUEBAS_FISICAS,
  claveRango,
  ETIQUETA_PRUEBA,
  type GrupoEdad,
} from "@/lib/stats-engine";
import { CATALOGO_LOGROS } from "./seed-logros";
import { FONDOS_PRESETS } from "@/lib/cartas/fondos-presets";

/**
 * Seed de PRODUCCIÓN. Deliberadamente separado del seed demo (`seed.ts`):
 * este script NO borra nada (solo upserts idempotentes) y NO crea datos demo.
 * Así es imposible ejecutar la limpieza demo contra la base de producción.
 *
 * Siembra únicamente:
 *  1. Parámetros de fórmula (peso MEN, umbrales de nivel, rangos físicos).
 *  2. Catálogo de logros.
 *  3. Catálogo de fondos de carta (base + presets con efectos).
 *  4. Un usuario SUPER_ADMIN real (password vía SEED_ADMIN_PASSWORD, one-shot;
 *     rotar tras el primer login).
 *
 * Ejecución manual y explícita (nunca en el build):
 *   DIRECT_URL=<prod-directa> SEED_ADMIN_PASSWORD=<fuerte> npx tsx prisma/seed-prod.ts
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL o DATABASE_URL requerida.");
}
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "ivanrairan@gmail.com";

// Los 7 fondos base (mismos valores que el seed demo).
const FONDOS_BASE = [
  { codigo: "CLASICO", nombre: "Clásico", descripcion: "El fondo de siempre.", estilo: "linear-gradient(160deg,#0b1220 0%,#1e293b 60%,#0b1220 100%)", colorTexto: "#e5e7eb", requisitoTipo: "SIEMPRE", requisitoValor: null, orden: 0 },
  { codigo: "COBRE", nombre: "Cobre", descripcion: "Edición cobre.", estilo: "linear-gradient(160deg,#8a5a34 0%,#d99a63 30%,#7a4a27 60%,#b87a47 100%)", colorTexto: "#fdeede", requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "2", orden: 1 },
  { codigo: "ESMERALDA", nombre: "Esmeralda", descripcion: "Constancia semana a semana.", estilo: "linear-gradient(160deg,#065f46 0%,#10b981 35%,#064e3b 70%,#022c22 100%)", colorTexto: "#ecfdf5", requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "4", orden: 2 },
  { codigo: "PLATA_LUX", nombre: "Plata lux", descripcion: "Cuando tu carta llega a Plata.", estilo: "linear-gradient(160deg,#9aa6b6 0%,#eef3f8 30%,#9aa6b6 60%,#d4dde7 100%)", colorTexto: "#1b2433", requisitoTipo: "NIVEL_CARTA", requisitoValor: "PLATA", orden: 3 },
  { codigo: "DORADA", nombre: "Dorada", descripcion: "Cuando tu carta llega a Oro.", estilo: "linear-gradient(160deg,#b88a1d 0%,#f7d558 28%,#c89b25 55%,#ffe98c 80%,#8f6b12 100%)", colorTexto: "#3a2c05", requisitoTipo: "NIVEL_CARTA", requisitoValor: "ORO", orden: 4 },
  { codigo: "RUBI", nombre: "Rubí", descripcion: "Por tu liderazgo en el equipo.", estilo: "linear-gradient(160deg,#9f1239 0%,#e11d48 35%,#7f1d1d 70%,#3b0a18 100%)", colorTexto: "#ffe4e6", requisitoTipo: "LOGRO", requisitoValor: "CAPITAN_VESTUARIO", orden: 5 },
  { codigo: "LEYENDA", nombre: "Leyenda", descripcion: "Solo para héroes.", estilo: "conic-gradient(from 180deg at 50% 50%, #4c1d95, #7c3aed, #f0abfc, #6d4cdf, #4c1d95)", colorTexto: "#f5d0ff", requisitoTipo: "NIVEL_CARTA", requisitoValor: "HEROE", orden: 6 },
] as const;

async function sembrarParametros(): Promise<number> {
  const parametros: { clave: string; valor: number; descripcion: string }[] = [
    { clave: "PESO_MEN_EN_OVR", valor: 0.1, descripcion: "Peso de MEN en el OVR (0.10)." },
    { clave: "UMBRAL_PLATA", valor: 65, descripcion: "OVR mínimo para nivel Plata." },
    { clave: "UMBRAL_ORO", valor: 75, descripcion: "OVR mínimo para nivel Oro." },
    { clave: "UMBRAL_HEROE", valor: 85, descripcion: "OVR mínimo para nivel Héroe." },
  ];
  for (const grupo of Object.keys(RANGOS_POR_GRUPO) as GrupoEdad[]) {
    for (const prueba of PRUEBAS_FISICAS) {
      const r = RANGOS_POR_GRUPO[grupo][prueba];
      const etiqueta = ETIQUETA_PRUEBA[prueba];
      const [mejor, peor] = r.inverso
        ? ["mínimo (mejor marca)", "máximo (peor marca)"]
        : ["mínimo (peor marca)", "máximo (mejor marca)"];
      parametros.push(
        { clave: claveRango(prueba, grupo, "MIN"), valor: r.min, descripcion: `${etiqueta} · ${grupo} · ${mejor}.` },
        { clave: claveRango(prueba, grupo, "MAX"), valor: r.max, descripcion: `${etiqueta} · ${grupo} · ${peor}.` },
      );
    }
  }
  // Upsert por clave: si el Súper Admin ya editó un valor en prod, NO se pisa
  // (solo se actualiza la descripción); los que faltan se crean con el default.
  for (const p of parametros) {
    await db.parametroFormula.upsert({
      where: { clave: p.clave },
      update: { descripcion: p.descripcion },
      create: p,
    });
  }
  return parametros.length;
}

async function sembrarLogros(): Promise<number> {
  for (const l of CATALOGO_LOGROS) {
    await db.logro.upsert({
      where: { codigo: l.codigo },
      update: {
        nombre: l.nombre,
        descripcion: l.descripcion,
        tipo: l.tipo,
        statBonus: l.statBonus ?? null,
        valorBonus: l.valorBonus ?? null,
        repetible: l.repetible ?? false,
        icono: l.icono,
        posicion: l.posicion ?? null,
      },
      create: l,
    });
  }
  return CATALOGO_LOGROS.length;
}

async function sembrarFondos(): Promise<number> {
  const fondos = [
    ...FONDOS_BASE.map((f) => ({ ...f, efecto: "NINGUNO", efectoParams: null })),
    ...FONDOS_PRESETS.map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      estilo: p.estilo,
      colorTexto: p.colorTexto,
      requisitoTipo: p.requisitoTipo,
      requisitoValor: p.requisitoValor,
      orden: p.orden,
      efecto: p.efecto,
      efectoParams: p.efectoParams,
    })),
  ];
  for (const f of fondos) {
    const efectoParams =
      f.efectoParams === null ? Prisma.JsonNull : (f.efectoParams as Prisma.InputJsonValue);
    const datos = { ...f, efectoParams };
    await db.fondoCarta.upsert({
      where: { codigo: f.codigo },
      update: datos,
      create: datos,
    });
  }
  return fondos.length;
}

async function sembrarSuperAdmin(): Promise<void> {
  const password = process.env.SEED_ADMIN_PASSWORD;
  const existente = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existente) {
    console.log(`   • SUPER_ADMIN ya existe (${ADMIN_EMAIL}) — sin cambios.`);
    return;
  }
  if (!password || password.length < 12) {
    throw new Error(
      "SEED_ADMIN_PASSWORD requerida (mínimo 12 caracteres) para crear el SUPER_ADMIN.",
    );
  }
  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(password, 12),
      nombre: "Súper Admin",
      rol: "SUPER_ADMIN",
      emailVerificadoEn: new Date(),
    },
  });
  console.log(`   • SUPER_ADMIN creado (${ADMIN_EMAIL}). Rotá la contraseña tras el primer login.`);
}

async function main() {
  console.log("🌱 Seed de PRODUCCIÓN (solo catálogos, upserts idempotentes)…");
  const nParams = await sembrarParametros();
  console.log(`   • Parámetros de fórmula: ${nParams}`);
  const nLogros = await sembrarLogros();
  console.log(`   • Logros: ${nLogros}`);
  const nFondos = await sembrarFondos();
  console.log(`   • Fondos de carta: ${nFondos}`);
  await sembrarSuperAdmin();
  console.log("✅ Seed de producción completado.");
}

main()
  .catch((e) => {
    console.error("❌ Seed de producción falló:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
