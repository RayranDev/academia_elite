// Copia el modelo de remocion de fondo (@imgly/background-removal-data) a
// public/imgly/ para servirlo desde el MISMO origen, sin CDN externo.
//
// Por que: son fotos de menores. La remocion de fondo corre 100% en el
// navegador y el modelo tampoco debe descargarse de un tercero (staticimgly.com).
// Sirviendo los assets desde /imgly/ el CSP queda en 'self' y no hay fuga de
// datos ni dependencia de un CDN ajeno.
//
// Solo se copia el modelo liviano ("small", ~40 MB) y el runtime onnxruntime-web.
// El paquete de datos completo pesa ~221 MB; copiar todo seria inutil porque en
// runtime solo se descarga el modelo elegido. public/imgly/ esta en .gitignore y
// se regenera en cada install (postinstall).

import { createRequire } from "node:module";
import {
  readFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let dataDist;
try {
  const pkgPath = require.resolve("@imgly/background-removal-data/package.json");
  dataDist = join(dirname(pkgPath), "dist");
} catch {
  console.warn(
    "[imgly] @imgly/background-removal-data no instalado; se omite la copia.",
  );
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(join(dataDist, "resources.json"), "utf8"));
const destDir = join(root, "public", "imgly");
mkdirSync(destDir, { recursive: true });

// Modelo liviano + todo el runtime WASM (la lib elige el .wasm segun el device).
const incluir = (key) =>
  key === "/models/small" || key.startsWith("/onnxruntime-web/");

const hashes = new Set();
for (const [key, entry] of Object.entries(manifest)) {
  if (!incluir(key)) continue;
  for (const chunk of entry.chunks) hashes.add(chunk.hash);
}

// El manifiesto se copia completo: la lib lo lee entero y solo pide las entradas
// del modelo elegido; las no copiadas nunca se solicitan.
copyFileSync(join(dataDist, "resources.json"), join(destDir, "resources.json"));

let copiados = 0;
let omitidos = 0;
let bytes = 0;
for (const hash of hashes) {
  const src = join(dataDist, hash);
  const dst = join(destDir, hash);
  if (!existsSync(src)) {
    console.warn(`[imgly] falta el chunk ${hash} en el paquete de datos.`);
    continue;
  }
  const size = statSync(src).size;
  bytes += size;
  if (existsSync(dst) && statSync(dst).size === size) {
    omitidos++;
    continue;
  }
  copyFileSync(src, dst);
  copiados++;
}

console.log(
  `[imgly] self-host listo en public/imgly/ ` +
    `(${copiados} copiados, ${omitidos} ya estaban, ${(bytes / 1048576).toFixed(1)} MB).`,
);
