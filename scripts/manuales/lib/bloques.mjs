// Convierte los tokens de `marked` en bloques de documento más ricos:
//  - `figura`: imagen + pie ("*Figura N: ...*" en la línea siguiente).
//  - `callout`: cita que empieza con **Importante:**, **Ojo:** o **Advertencia:**.
// Los demás tokens (heading, paragraph, list, table, blockquote…) pasan sin cambios.

import { textoPlano } from "./capa-usuario.mjs";

/** @type {Record<string, { tipo: string, titulo: string }>} */
const CALLOUTS = {
  importante: { tipo: "importante", titulo: "Importante" },
  ojo: { tipo: "ojo", titulo: "Ojo" },
  advertencia: { tipo: "advertencia", titulo: "Advertencia" },
};

/**
 * @param {any} token
 * @returns {any | null} El token `image` si el párrafo contiene solo una imagen.
 */
function imagenUnica(token) {
  if (token.type !== "paragraph") return null;
  const utiles = (token.tokens ?? []).filter(
    (t) => !(t.type === "text" && String(t.text).trim() === "") && !(t.type === "html" && /^<br\s*\/?>$/i.test(t.text)),
  );
  return utiles.length === 1 && utiles[0].type === "image" ? utiles[0] : null;
}

/**
 * @param {any} token
 * @returns {any | null} El token `em` si el párrafo es solo texto en cursiva.
 */
function cursivaUnica(token) {
  if (token.type !== "paragraph") return null;
  const utiles = (token.tokens ?? []).filter((t) => !(t.type === "text" && String(t.text).trim() === ""));
  return utiles.length === 1 && utiles[0].type === "em" ? utiles[0] : null;
}

/**
 * Quita el prefijo "Figura N:" del pie (la numeración la pone el manual completo, de forma continua).
 * @param {any[]} tokens Tokens inline de la cursiva.
 * @returns {any[]}
 */
function quitarPrefijoDeFigura(tokens) {
  const copia = tokens.map((t) => ({ ...t }));
  const primero = copia[0];
  if (primero && primero.type === "text") {
    primero.text = String(primero.text).replace(/^\s*Figura\s+\d+\s*[:.\-–—]\s*/i, "");
  }
  return copia;
}

/**
 * @param {any} token
 * @returns {{ tipo: string, titulo: string, tokens: any[] } | null}
 */
function comoCallout(token) {
  if (token.type !== "blockquote") return null;
  const primerParrafo = (token.tokens ?? []).find((t) => t.type === "paragraph");
  const primerInline = primerParrafo?.tokens?.[0];
  if (!primerInline || primerInline.type !== "strong") return null;
  const etiqueta = textoPlano(primerInline.tokens).replace(/:\s*$/, "").trim().toLowerCase();
  const definicion = CALLOUTS[etiqueta];
  if (!definicion) return null;

  // Copia del contenido sin la etiqueta en negrita inicial (el recuadro ya la muestra como título).
  const interiores = token.tokens.map((t) => ({ ...t }));
  const indice = interiores.findIndex((t) => t.type === "paragraph");
  const parrafo = { ...interiores[indice] };
  const resto = parrafo.tokens.slice(1).map((t) => ({ ...t }));
  if (resto[0]?.type === "text") resto[0].text = String(resto[0].text).replace(/^\s*:?\s*/, "");
  parrafo.tokens = resto;
  interiores[indice] = parrafo;
  return { ...definicion, tokens: interiores };
}

/**
 * @param {any[]} tokens Tokens ya filtrados (capa de usuario).
 * @returns {any[]} Tokens con bloques `figura` y `callout`.
 */
export function sintetizarBloques(tokens) {
  /** @type {any[]} */
  const salida = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    const imagen = imagenUnica(token);
    if (imagen) {
      const siguiente = tokens[i + 1];
      const cursiva = siguiente ? cursivaUnica(siguiente) : null;
      salida.push({
        type: "figura",
        href: imagen.href,
        alt: imagen.text ?? "",
        leyenda: cursiva ? quitarPrefijoDeFigura(cursiva.tokens ?? []) : [],
        numero: 0,
        _linea: token._linea,
      });
      if (cursiva) i++;
      continue;
    }

    const callout = comoCallout(token);
    if (callout) {
      salida.push({ type: "callout", ...callout, _linea: token._linea });
      continue;
    }

    salida.push(token);
  }
  return salida;
}

/**
 * Numera las figuras de forma continua en todo el manual.
 * @param {{ bloques: any[] }[]} capitulos
 * @returns {number} Total de figuras.
 */
export function numerarFiguras(capitulos) {
  let n = 0;
  for (const capitulo of capitulos) {
    for (const bloque of capitulo.bloques) {
      if (bloque.type === "figura") {
        n += 1;
        bloque.numero = n;
      }
    }
  }
  return n;
}
