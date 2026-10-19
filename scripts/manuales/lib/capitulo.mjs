// Construye un capítulo (una ficha) listo para renderizar: capa de usuario, fugas, bloques e imágenes.

import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import sharp from "sharp";
import { sintetizarBloques } from "./bloques.mjs";
import { anotarLineas, filtrarCapaUsuario, neutralizarFugas, textoPlano } from "./capa-usuario.mjs";

/**
 * @typedef {Object} Capitulo
 * @property {string} id Identificador para anclas (cap-1…).
 * @property {number} numero Número de capítulo dentro del manual (desde 1).
 * @property {string} titulo
 * @property {any[]} bloques Tokens y bloques sintéticos (figura, callout), sin el H1.
 * @property {{ version: string, sha: string, fecha: string } | null} verificacion
 * @property {import("./capa-usuario.mjs").Fuga[]} fugas
 * @property {{ archivo: string, linea: number, href: string }[]} imagenesFaltantes
 * @property {string[]} seccionesOmitidas
 * @property {string} archivoRelativo
 */

/**
 * Procesa el Markdown de una ficha o de la introducción.
 * @param {{ cuerpo: string, archivo: string, archivoRelativo: string, lineasFrontMatter: number }} ficha
 * @param {{ resolverImagenes?: boolean }} [opciones]
 * @returns {Promise<Omit<Capitulo, "id" | "numero">>}
 */
export async function procesarFicha(ficha, { resolverImagenes = true } = {}) {
  const tokens = anotarLineas(marked.lexer(ficha.cuerpo));
  const { tokens: visibles, verificacion, seccionesOmitidas } = filtrarCapaUsuario(tokens);

  const fugas = neutralizarFugas(visibles, {
    archivo: ficha.archivoRelativo,
    desplazamiento: ficha.lineasFrontMatter,
  });

  const bloques = sintetizarBloques(visibles);

  const indiceH1 = bloques.findIndex((b) => b.type === "heading" && b.depth === 1);
  const titulo = indiceH1 >= 0 ? textoPlano(bloques[indiceH1].tokens).trim() : path.basename(ficha.archivo, ".md");
  if (indiceH1 >= 0) bloques.splice(indiceH1, 1);

  /** @type {Capitulo["imagenesFaltantes"]} */
  const imagenesFaltantes = [];
  if (resolverImagenes) {
    for (const bloque of bloques) {
      if (bloque.type !== "figura") continue;
      const rutaImagen = path.resolve(path.dirname(ficha.archivo), decodeURI(bloque.href));
      if (!fs.existsSync(rutaImagen)) {
        bloque.faltante = true;
        imagenesFaltantes.push({
          archivo: ficha.archivoRelativo,
          linea: (bloque._linea ?? 1) + ficha.lineasFrontMatter,
          href: bloque.href,
        });
        continue;
      }
      const buffer = fs.readFileSync(rutaImagen);
      const { width, height } = await sharp(buffer).metadata();
      bloque.datos = buffer;
      bloque.ancho = width ?? 800;
      bloque.alto = height ?? 600;
      bloque.tipoImagen = /\.jpe?g$/i.test(rutaImagen) ? "jpg" : "png";
    }
  }

  return {
    titulo,
    bloques,
    verificacion,
    fugas,
    imagenesFaltantes,
    seccionesOmitidas,
    archivoRelativo: ficha.archivoRelativo,
  };
}
