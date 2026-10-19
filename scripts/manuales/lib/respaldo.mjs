import fs from "node:fs";
import path from "node:path";

/** Cuántas copias anteriores se conservan por archivo. */
export const MAX_COPIAS = 5;

/**
 * Marca de tiempo ordenable (`AAAAMMDD-HHMMSS`, hora local) para nombrar copias.
 * @param {Date} fecha
 */
export function marcaDeTiempo(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}` +
    `-${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`
  );
}

/**
 * Antes de sobrescribir un manual generado, guarda el anterior en `anteriores/` junto al
 * archivo, con fecha y hora, y conserva solo las últimas `max` copias de ese archivo.
 *
 * Por qué: el .docx o el .pdf pueden haber pasado por Word (`manuales:word`) o haber sido
 * editados a mano, y regenerarlos los pisa. Las fuentes (fichas) siguen siendo la verdad,
 * pero una versión que gustó no debe perderse por correr el generador otra vez.
 *
 * @param {string} ruta archivo que está por escribirse
 * @param {{ ahora?: Date, max?: number }} [opciones]
 * @returns {string | null} ruta de la copia, o null si no había nada que respaldar
 */
export function respaldarAnterior(ruta, { ahora = new Date(), max = MAX_COPIAS } = {}) {
  if (!fs.existsSync(ruta)) return null;

  const carpeta = path.dirname(ruta);
  const ext = path.extname(ruta);
  const nombre = path.basename(ruta, ext);
  const destinoDir = path.join(carpeta, "anteriores");
  fs.mkdirSync(destinoDir, { recursive: true });

  const copia = path.join(destinoDir, `${nombre}_${marcaDeTiempo(ahora)}${ext}`);
  fs.copyFileSync(ruta, copia);

  // Poda: las marcas de tiempo ordenan alfabéticamente, así que las más viejas van primero.
  const prefijo = `${nombre}_`;
  const copias = fs
    .readdirSync(destinoDir)
    .filter((f) => f.startsWith(prefijo) && f.endsWith(ext))
    .sort();
  for (const vieja of copias.slice(0, Math.max(0, copias.length - max))) {
    fs.rmSync(path.join(destinoDir, vieja), { force: true });
  }
  return copia;
}
