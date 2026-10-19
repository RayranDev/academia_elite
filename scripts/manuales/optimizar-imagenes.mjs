// Uso: node scripts/manuales/optimizar-imagenes.mjs
// Optimiza las capturas de docs/manuales/img/**: máximo 1400 px de ancho y PNG
// comprimido (paleta cuando se puede). Conserva nombre y ruta. Idempotente:
// solo reescribe un archivo si el resultado pesa menos que el original.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DIR_IMG, esPrincipal, relativa } from "./lib/comun.mjs";

const ANCHO_MAXIMO = 1400;
/** Ahorro mínimo (fracción) para reescribir: evita desgastar un PNG ya optimizado. */
const AHORRO_MINIMO = 0.02;

/**
 * @param {string} directorio
 * @returns {string[]}
 */
function listarImagenes(directorio) {
  if (!fs.existsSync(directorio)) return [];
  /** @type {string[]} */
  const resultado = [];
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const completa = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...listarImagenes(completa));
    else if (/\.png$/i.test(entrada.name)) resultado.push(completa);
  }
  return resultado;
}

/** @param {number} bytes */
function formatoMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

/**
 * Optimiza un PNG y devuelve el buffer resultante.
 * @param {string} archivo
 */
async function optimizarPng(archivo) {
  const imagen = sharp(archivo, { failOn: "none" }).rotate();
  const { width, isPalette } = await imagen.metadata();
  // Idempotencia: un PNG de paleta que ya cabe en el ancho máximo salió de una pasada anterior;
  // volver a cuantizarlo solo lo degradaría.
  if (isPalette && (!width || width <= ANCHO_MAXIMO)) return null;
  const base = width && width > ANCHO_MAXIMO ? imagen.resize({ width: ANCHO_MAXIMO, withoutEnlargement: true }) : imagen;
  return base
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9, dither: 1.0 })
    .toBuffer();
}

export async function optimizarImagenes() {
  const archivos = listarImagenes(DIR_IMG).sort();
  let antes = 0;
  let despues = 0;
  let reescritas = 0;

  for (const archivo of archivos) {
    const tamanoAntes = fs.statSync(archivo).size;
    const buffer = await optimizarPng(archivo);
    const reescribir = buffer !== null && buffer.length < tamanoAntes * (1 - AHORRO_MINIMO);
    if (reescribir) {
      fs.writeFileSync(archivo, buffer);
      reescritas += 1;
    }
    const tamanoDespues = reescribir ? buffer.length : tamanoAntes;
    antes += tamanoAntes;
    despues += tamanoDespues;
    console.log(
      `${reescribir ? "optimizada" : "sin cambios"}  ${formatoMB(tamanoAntes)} -> ${formatoMB(tamanoDespues)}  ${relativa(archivo)}`,
    );
  }

  const ahorro = antes === 0 ? 0 : ((antes - despues) / antes) * 100;
  console.log(
    `\n${archivos.length} imágenes (${reescritas} reescritas). Antes: ${formatoMB(antes)}. Después: ${formatoMB(despues)}. Ahorro: ${ahorro.toFixed(1)} %.`,
  );
  return { archivos: archivos.length, reescritas, antes, despues };
}

if (esPrincipal(import.meta.url)) {
  optimizarImagenes().catch((error) => {
    console.error("No se pudieron optimizar las imágenes:", error);
    process.exitCode = 1;
  });
}
