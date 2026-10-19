// Reglas del modo --estricto de build.mjs: qué hallazgos hacen fallar la construcción.
// Se separan del script principal para poder probarlas sin lanzar Chromium.

/**
 * @typedef {Object} FugaTecnica
 * @property {string} archivo
 * @property {number} linea
 * @property {string} texto
 * @property {string} motivo
 */

/**
 * Convierte los avisos de fugas técnicas de la capa pública en problemas del modo estricto.
 * Una fuga es texto técnico (ruta, atributo HTML, nombre de función...) en lo que lee el usuario final.
 * @param {FugaTecnica[]} fugas
 * @returns {string[]}
 */
export function problemasDeFugas(fugas) {
  return fugas.map((f) => `${f.archivo}:${f.linea}: fuga técnica en la capa pública "${f.texto}" (${f.motivo})`);
}

/**
 * @param {{ archivo: string, linea: number, href: string }[]} imagenesFaltantes
 * @returns {string[]}
 */
export function problemasDeImagenes(imagenesFaltantes) {
  return imagenesFaltantes.map((i) => `${i.archivo}:${i.linea}: falta la imagen ${i.href}`);
}
