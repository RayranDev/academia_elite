// Capa de usuario: separa lo que se publica de lo que es material interno de la ficha
// y detecta fugas técnicas en el texto que sí se publica.
//
// Todo trabaja sobre tokens del lexer de `marked`, sin tocar disco.

/** Secciones (H2) que son material interno y nunca llegan al entregable. */
export const SECCIONES_INTERNAS = [
  "registro de verificación",
  "comportamientos conocidos",
  "notas internas",
];

/** Versión normalizada (sin tildes ni mayúsculas) para comparar con encabezados reales. */
const SECCIONES_INTERNAS_NORMALIZADAS = SECCIONES_INTERNAS.map((s) => normalizar(s));

/** Encabezados de columna que son material interno. */
export const COLUMNAS_INTERNAS = ["verificado"];

/** Términos técnicos que no deben aparecer en texto para usuarios (se avisa, no se cambia). */
const TERMINOS_TECNICOS =
  /\b(Zod|DOM|React(?:\s*\d+)?|Server Actions?|endpoints?|tenant|DTOs?|backend|frontend|Prisma|useActionState|escuelaId|textoSeguro|API)\b/;

/** Rutas de la aplicación escritas en texto corrido (sin backticks): /dt/..., /admin/..., /escuela/..., /jugador/..., /api/... */
const RUTA_EN_TEXTO = /(?:^|[\s(])\/(?:dt|admin|escuela|jugador|api)(?:\/[^\s),;:]*)?/;

/** Nombres de elementos de interfaz HTML o de componentes que no significan nada para el usuario. */
const TIPOS_DE_CONTROL = /^(select|button|input|textarea|checkbox|text|texto|tarjeta|badge|lista)(\s|$|\/)/i;

/**
 * @param {string} s
 */
function normalizar(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿El texto de un span de código es una fuga técnica?
 * Rutas, atributos HTML, llamadas a funciones, identificadores camelCase, clases CSS y tipos de control.
 * @param {string} texto Contenido del span de código (sin backticks).
 * @returns {string | null} Motivo de la fuga, o null si el span es contenido legítimo para el usuario.
 */
export function motivoDeFuga(texto) {
  const t = texto.trim();
  if (t.includes("=")) return 'contiene "=" (atributo o código)';
  if (t.includes("/")) return 'contiene "/" (ruta o clase)';
  if (/\w\(/.test(t)) return "parece una llamada a función";
  if (/^[a-z]+[A-Z]\w*$/.test(t)) return "identificador de código (camelCase)";
  if (TIPOS_DE_CONTROL.test(t)) return "tipo de elemento de interfaz";
  return null;
}

/**
 * @typedef {Object} Fuga
 * @property {string} archivo
 * @property {number} linea Línea (1-based) dentro del archivo original de la ficha.
 * @property {string} texto
 * @property {string} motivo
 */

/**
 * Visita un token y todos sus descendientes.
 * @param {any} token
 * @param {(t: any) => void} fn
 */
export function recorrerTokens(token, fn) {
  if (!token || typeof token !== "object") return;
  fn(token);
  if (Array.isArray(token.tokens)) token.tokens.forEach((t) => recorrerTokens(t, fn));
  if (Array.isArray(token.items)) token.items.forEach((t) => recorrerTokens(t, fn));
  if (Array.isArray(token.header)) token.header.forEach((t) => recorrerTokens(t, fn));
  if (Array.isArray(token.rows)) {
    token.rows.forEach((fila) => Array.isArray(fila) && fila.forEach((t) => recorrerTokens(t, fn)));
  }
}

/**
 * Texto plano de un conjunto de tokens inline (para comparar encabezados).
 * @param {any[] | undefined} tokens
 * @returns {string}
 */
export function textoPlano(tokens) {
  if (!tokens) return "";
  return tokens
    .map((t) => {
      if (t.type === "html") return /^<br\s*\/?>$/i.test(t.text) ? " " : "";
      if (Array.isArray(t.tokens) && t.tokens.length) return textoPlano(t.tokens);
      return t.text ?? "";
    })
    .join("");
}

/**
 * Anota cada token de primer nivel con la línea (1-based, relativa al cuerpo) donde empieza.
 * @param {any[]} tokens
 */
export function anotarLineas(tokens) {
  let linea = 1;
  for (const token of tokens) {
    token._linea = linea;
    linea += (String(token.raw ?? "").match(/\n/g) ?? []).length;
  }
  return tokens;
}

/**
 * Extrae versión, sha y fecha del blockquote "Verificado en la versión X (`sha`) el AAAA-MM-DD…".
 * @param {string} texto
 * @returns {{ version: string, sha: string, fecha: string } | null}
 */
export function parsearVerificacion(texto) {
  const m = texto.match(
    /Verificado en la versi[oó]n\s+([0-9A-Za-z.\-+]+)\s*\(\s*`?([0-9a-fA-F]{4,40})`?\s*\)\s+el\s+(\d{4}-\d{2}-\d{2})/i,
  );
  if (!m) return null;
  return { version: m[1], sha: m[2], fecha: m[3] };
}

/**
 * @param {any} token
 */
function esBlockquoteDeVerificacion(token) {
  return token.type === "blockquote" && /Verificado en la versi[oó]n/i.test(String(token.text ?? token.raw ?? ""));
}

/**
 * Quita de la ficha todo lo que no es capa de usuario:
 *  - el blockquote "Verificado en la versión…",
 *  - las secciones internas (por H2) y todo lo que contienen,
 *  - la columna "Verificado" de las tablas,
 *  - los separadores horizontales y los tokens `space`.
 * No modifica el arreglo original (las tablas se copian).
 * @param {any[]} tokens
 * @returns {{ tokens: any[], verificacion: { version: string, sha: string, fecha: string } | null, seccionesOmitidas: string[] }}
 */
export function filtrarCapaUsuario(tokens) {
  /** @type {any[]} */
  const resultado = [];
  /** @type {string[]} */
  const seccionesOmitidas = [];
  /** @type {{ version: string, sha: string, fecha: string } | null} */
  let verificacion = null;
  /** @type {number | null} */
  let profundidadOmitida = null;

  for (const token of tokens) {
    if (token.type === "heading") {
      if (profundidadOmitida !== null && token.depth <= profundidadOmitida) {
        profundidadOmitida = null;
      }
      if (profundidadOmitida === null && token.depth >= 2) {
        const nombre = normalizar(textoPlano(token.tokens));
        if (SECCIONES_INTERNAS_NORMALIZADAS.includes(nombre)) {
          profundidadOmitida = token.depth;
          seccionesOmitidas.push(textoPlano(token.tokens).trim());
          continue;
        }
      }
    }
    if (profundidadOmitida !== null) continue;

    if (token.type === "space" || token.type === "hr") continue;

    if (esBlockquoteDeVerificacion(token)) {
      verificacion = verificacion ?? parsearVerificacion(String(token.text ?? token.raw ?? ""));
      continue;
    }

    if (token.type === "table") {
      resultado.push(quitarColumnasInternas(token));
      continue;
    }

    resultado.push(token);
  }

  return { tokens: resultado, verificacion, seccionesOmitidas };
}

/**
 * @param {any} tabla Token `table` de marked.
 * @returns {any} Copia de la tabla sin las columnas internas.
 */
export function quitarColumnasInternas(tabla) {
  const indicesInternos = new Set(
    tabla.header
      .map((celda, i) => (COLUMNAS_INTERNAS.includes(normalizar(textoPlano(celda.tokens))) ? i : -1))
      .filter((i) => i >= 0),
  );
  if (indicesInternos.size === 0) return tabla;
  const conservar = (/** @type {any[]} */ celdas) => celdas.filter((_c, i) => !indicesInternos.has(i));
  return {
    ...tabla,
    header: conservar(tabla.header),
    align: conservar(tabla.align ?? []),
    rows: tabla.rows.map(conservar),
  };
}

/**
 * Busca la línea (1-based, en el archivo original) donde aparece un fragmento dentro de un token de primer nivel.
 * @param {any} raiz Token de primer nivel (con `_linea` y `raw`).
 * @param {string} fragmento
 * @param {{ cursor: number }} estado Posición de búsqueda; avanza para no repetir coincidencias.
 * @param {number} desplazamiento Líneas ocupadas por el front-matter.
 */
function ubicarLinea(raiz, fragmento, estado, desplazamiento) {
  const raw = String(raiz.raw ?? "");
  let indice = raw.indexOf(fragmento, estado.cursor);
  if (indice === -1) indice = raw.indexOf(fragmento);
  if (indice === -1) return (raiz._linea ?? 1) + desplazamiento;
  estado.cursor = indice + fragmento.length;
  const lineasAntes = (raw.slice(0, indice).match(/\n/g) ?? []).length;
  return (raiz._linea ?? 1) + lineasAntes + desplazamiento;
}

/**
 * Detecta fugas técnicas en la capa de usuario y las neutraliza en el propio árbol:
 * los spans de código que son fugas pasan a texto plano (sin backticks, mismo texto).
 * Además avisa de términos técnicos sueltos en el texto (sin modificarlos).
 *
 * @param {any[]} tokens Tokens YA filtrados con `filtrarCapaUsuario` y con `_linea` (anotarLineas) en el primer nivel.
 * @param {{ archivo: string, desplazamiento?: number }} opciones `desplazamiento`: líneas del front-matter.
 * @returns {Fuga[]}
 */
export function neutralizarFugas(tokens, { archivo, desplazamiento = 0 }) {
  /** @type {Fuga[]} */
  const fugas = [];

  for (const raiz of tokens) {
    const estado = { cursor: 0 };
    recorrerTokens(raiz, (token) => {
      if (token.type === "codespan") {
        const motivo = motivoDeFuga(String(token.text));
        if (motivo) {
          fugas.push({
            archivo,
            linea: ubicarLinea(raiz, "`" + token.text + "`", estado, desplazamiento),
            texto: String(token.text),
            motivo,
          });
          token.type = "text";
          token.escaped = false;
          delete token.raw;
        }
        return;
      }
      if (token.type === "text" && !Array.isArray(token.tokens)) {
        const texto = String(token.text ?? "");
        for (const m of texto.matchAll(new RegExp(TERMINOS_TECNICOS.source, "g"))) {
          fugas.push({
            archivo,
            linea: ubicarLinea(raiz, m[0], estado, desplazamiento),
            texto: m[0],
            motivo: "término técnico en el texto",
          });
        }
        const ruta = texto.match(RUTA_EN_TEXTO);
        if (ruta) {
          const limpia = ruta[0].trim().replace(/^\(/, "");
          fugas.push({
            archivo,
            linea: ubicarLinea(raiz, limpia, estado, desplazamiento),
            texto: limpia,
            motivo: "ruta de la aplicación en el texto",
          });
        }
      }
    });
  }

  return fugas;
}
