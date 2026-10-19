// Inventario de pantallas: convierte las carpetas de src/app en rutas.

import fs from "node:fs";
import path from "node:path";

/** Raíz de la aplicación por rol (carpeta de primer nivel dentro de src/app). */
export const CARPETAS_ROL = ["admin", "escuela", "dt", "jugador"];

/**
 * Convierte la ruta de un `page.tsx` (relativa a src/app) en el patrón de URL.
 * Ignora los route groups `(grupo)` y los slots `@slot`; conserva `[param]`.
 * @param {string} rutaRelativa Ej.: "dt/jugadores/[id]/evaluar/page.tsx"
 * @returns {string} Ej.: "/dt/jugadores/[id]/evaluar"
 */
export function rutaDesdePagina(rutaRelativa) {
  const segmentos = rutaRelativa
    .replace(/\\/g, "/")
    .split("/")
    .filter((s) => s.length > 0);
  // Quita el nombre del archivo (page.tsx).
  segmentos.pop();
  const utiles = segmentos.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return "/" + utiles.join("/");
}

/**
 * Normaliza una ruta para comparar: el nombre del parámetro no importa
 * (`[id]` y `[jugadorId]` son la misma pantalla) y se quita la barra final.
 * @param {string} ruta
 */
export function normalizarRuta(ruta) {
  const sinBarra = ruta.length > 1 ? ruta.replace(/\/+$/, "") : ruta;
  return sinBarra.replace(/\[\.{0,3}[^\]]+\]/g, "[]");
}

/**
 * Recorre un directorio y devuelve las rutas relativas de todos los page.tsx.
 * @param {string} directorio
 * @param {string} [base]
 * @returns {string[]}
 */
function listarPaginas(directorio, base = directorio) {
  /** @type {string[]} */
  const resultado = [];
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const completa = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      resultado.push(...listarPaginas(completa, base));
    } else if (/^page\.(tsx|ts|jsx|js)$/.test(entrada.name)) {
      resultado.push(path.relative(base, completa));
    }
  }
  return resultado;
}

/**
 * Devuelve las rutas de pantalla agrupadas por id de rol.
 * @param {string} raizApp Ruta absoluta a src/app.
 * @param {{ id: string, prefijoRuta: string }[]} roles
 * @returns {Record<string, string[]>}
 */
export function inventariarPantallas(raizApp, roles) {
  const paginas = listarPaginas(raizApp).map(rutaDesdePagina);
  /** @type {Record<string, string[]>} */
  const porRol = {};
  for (const rol of roles) {
    porRol[rol.id] = paginas
      .filter((ruta) => ruta === rol.prefijoRuta || ruta.startsWith(rol.prefijoRuta + "/"))
      .sort((a, b) => a.localeCompare(b));
  }
  return porRol;
}
