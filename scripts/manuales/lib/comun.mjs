// Rutas del repositorio y carga de roles y fichas.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";
import { parsearFrontMatter } from "./frontmatter.mjs";
import { anotarLineas, filtrarCapaUsuario, textoPlano } from "./capa-usuario.mjs";
import { calcularCobertura } from "./cobertura.mjs";
import { inventariarPantallas } from "./rutas.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

export const RAIZ = path.resolve(AQUI, "..", "..", "..");
export const DIR_MANUALES = path.join(RAIZ, "docs", "manuales");
export const DIR_FUENTES = path.join(DIR_MANUALES, "fuentes");
export const DIR_IMG = path.join(DIR_MANUALES, "img");
export const DIR_SALIDA = path.join(DIR_MANUALES, "salida");
export const DIR_APP = path.join(RAIZ, "src", "app");

/**
 * @typedef {Object} Rol
 * @property {string} id
 * @property {string} etiqueta
 * @property {string} titulo
 * @property {string} subtitulo
 * @property {string} audiencia
 * @property {string} prefijoRuta
 * @property {string} archivo
 * @property {{ ruta: string, razon?: string }[]} [exclusiones]
 */

/** @returns {Rol[]} */
export function leerRoles() {
  const contenido = fs.readFileSync(path.join(DIR_MANUALES, "roles.json"), "utf8");
  return JSON.parse(contenido).roles;
}

/** Versión de la aplicación (package.json). */
export function versionDeLaApp() {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8")).version;
}

/** Ruta POSIX relativa a la raíz del repo (para mensajes). */
export function relativa(absoluta) {
  return path.relative(RAIZ, absoluta).split(path.sep).join("/");
}

/**
 * @typedef {Object} Ficha
 * @property {string} archivo Ruta absoluta.
 * @property {string} archivoRelativo Ruta POSIX relativa al repo.
 * @property {string} rol Id del rol (del front-matter).
 * @property {string} modulo
 * @property {number} orden
 * @property {string[]} rutas
 * @property {string} estado `vigente` o `por reverificar`.
 * @property {string} cuerpo Markdown sin front-matter.
 * @property {number} lineasFrontMatter
 * @property {{ version: string, sha: string, fecha: string } | null} verificacion
 * @property {string[]} errores Problemas de formato de la ficha.
 */

/**
 * Lee todas las fichas de docs/manuales/fuentes/<rol>/*.md.
 * @param {Rol[]} roles
 * @returns {Ficha[]}
 */
export function cargarFichas(roles) {
  const idsValidos = new Set(roles.map((r) => r.id));
  /** @type {Ficha[]} */
  const fichas = [];
  if (!fs.existsSync(DIR_FUENTES)) return fichas;

  for (const carpeta of fs.readdirSync(DIR_FUENTES, { withFileTypes: true })) {
    if (!carpeta.isDirectory()) continue;
    const dirRol = path.join(DIR_FUENTES, carpeta.name);
    for (const nombre of fs.readdirSync(dirRol).filter((n) => n.endsWith(".md")).sort()) {
      const archivo = path.join(dirRol, nombre);
      const { datos, cuerpo, lineasFrontMatter } = parsearFrontMatter(fs.readFileSync(archivo, "utf8"));
      /** @type {string[]} */
      const errores = [];

      const rol = typeof datos.rol === "string" ? datos.rol : "";
      if (!rol) errores.push("falta `rol` en el front-matter");
      else if (!idsValidos.has(rol)) errores.push(`rol desconocido: "${rol}"`);
      else if (rol !== carpeta.name) errores.push(`la ficha está en la carpeta "${carpeta.name}" pero declara rol "${rol}"`);

      const tokens = anotarLineas(marked.lexer(cuerpo));
      const h1 = tokens.find((t) => t.type === "heading" && t.depth === 1);
      const modulo = typeof datos.modulo === "string" && datos.modulo ? datos.modulo : h1 ? textoPlano(h1.tokens).trim() : nombre;

      if (typeof datos.orden !== "number") errores.push("falta `orden` numérico en el front-matter");
      if (!Array.isArray(datos.rutas) || datos.rutas.length === 0) errores.push("falta `rutas` (lista) en el front-matter");

      const { verificacion } = filtrarCapaUsuario(tokens);

      fichas.push({
        archivo,
        archivoRelativo: relativa(archivo),
        rol,
        modulo,
        orden: typeof datos.orden === "number" ? datos.orden : 9999,
        rutas: Array.isArray(datos.rutas) ? datos.rutas : [],
        estado: typeof datos.estado === "string" && datos.estado ? datos.estado : "vigente",
        cuerpo,
        lineasFrontMatter,
        verificacion,
        errores,
      });
    }
  }
  return fichas;
}

/**
 * ¿Este módulo se está ejecutando directamente (node archivo.mjs) y no importado?
 * @param {string} urlDelModulo `import.meta.url` del módulo que pregunta.
 */
export function esPrincipal(urlDelModulo) {
  return Boolean(process.argv[1]) && urlDelModulo === pathToFileURL(process.argv[1]).href;
}

/**
 * Cobertura de rutas de todos los roles, leyendo src/app y las fichas.
 * @param {Rol[]} roles
 * @param {Ficha[]} fichas
 */
export function obtenerCobertura(roles, fichas) {
  const inventario = inventariarPantallas(DIR_APP, roles);
  return { inventario, cobertura: calcularCobertura(roles, inventario, fichas) };
}
