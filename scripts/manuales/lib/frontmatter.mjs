// Parser mínimo del front-matter YAML simple de las fichas de manual.
//
// Soporta únicamente lo que las fichas usan:
//   clave: texto            -> string
//   clave: 4                -> number
//   clave: ["a", "b"]       -> array (JSON o lista separada por comas entre corchetes)
// Sin dependencias: no es un parser YAML general a propósito.

/**
 * @typedef {Object} ResultadoFrontMatter
 * @property {Record<string, string | number | string[]>} datos Campos leídos.
 * @property {string} cuerpo Texto de la ficha sin el bloque de front-matter.
 * @property {number} lineasFrontMatter Líneas que ocupa el bloque (incluye ambos `---`), para conservar los números de línea.
 */

/**
 * @param {string} valorCrudo
 * @returns {string | number | string[]}
 */
function parsearValor(valorCrudo) {
  const valor = valorCrudo.trim();

  if (valor.startsWith("[") && valor.endsWith("]")) {
    try {
      const lista = JSON.parse(valor);
      if (Array.isArray(lista)) return lista.map((x) => String(x));
    } catch {
      // Cae al parseo tolerante de abajo (comillas simples, sin comillas).
    }
    const interior = valor.slice(1, -1).trim();
    if (!interior) return [];
    return interior
      .split(",")
      .map((x) => x.trim().replace(/^["']|["']$/g, ""))
      .filter((x) => x.length > 0);
  }

  if (/^-?\d+(\.\d+)?$/.test(valor)) return Number(valor);

  return valor.replace(/^["']|["']$/g, "");
}

/**
 * Separa el front-matter del cuerpo de una ficha.
 * @param {string} texto Contenido completo del archivo.
 * @returns {ResultadoFrontMatter}
 */
export function parsearFrontMatter(texto) {
  const normalizado = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lineas = normalizado.split("\n");

  if (lineas[0]?.trim() !== "---") {
    return { datos: {}, cuerpo: normalizado, lineasFrontMatter: 0 };
  }

  let cierre = -1;
  for (let i = 1; i < lineas.length; i++) {
    if (lineas[i].trim() === "---") {
      cierre = i;
      break;
    }
  }
  if (cierre === -1) {
    return { datos: {}, cuerpo: normalizado, lineasFrontMatter: 0 };
  }

  /** @type {Record<string, string | number | string[]>} */
  const datos = {};
  for (let i = 1; i < cierre; i++) {
    const linea = lineas[i];
    if (!linea.trim() || linea.trim().startsWith("#")) continue;
    const separador = linea.indexOf(":");
    if (separador === -1) continue;
    const clave = linea.slice(0, separador).trim();
    if (!clave) continue;
    datos[clave] = parsearValor(linea.slice(separador + 1));
  }

  return {
    datos,
    cuerpo: lineas.slice(cierre + 1).join("\n"),
    lineasFrontMatter: cierre + 1,
  };
}
