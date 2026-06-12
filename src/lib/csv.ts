/**
 * Parser/serializador CSV mínimo y sin dependencias (puro, testeable).
 * - Detecta el delimitador `,` o `;` (Excel en es-CO suele usar `;`).
 * - Soporta campos entre comillas con comillas escapadas (`""`) y saltos de
 *   línea dentro de comillas.
 * - Quita el BOM UTF-8 inicial si está presente.
 */

const BOM = "﻿";

/** Detecta el delimitador más frecuente en la primera línea no vacía. */
function detectarDelimitador(texto: string): "," | ";" {
  const primera = texto.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  let comas = 0;
  let puntos = 0;
  let dentro = false;
  for (const ch of primera) {
    if (ch === '"') dentro = !dentro;
    else if (!dentro && ch === ",") comas += 1;
    else if (!dentro && ch === ";") puntos += 1;
  }
  return puntos > comas ? ";" : ",";
}

/** Convierte un CSV en matriz de filas/columnas (string[][]). */
export function parseCsv(entrada: string): string[][] {
  let texto = entrada;
  if (texto.startsWith(BOM)) texto = texto.slice(1);
  const delim = detectarDelimitador(texto);

  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let dentro = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (dentro) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          dentro = false;
        }
      } else {
        campo += ch;
      }
      continue;
    }
    if (ch === '"') {
      dentro = true;
    } else if (ch === delim) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (ch === "\r") {
      // ignora; el \n cierra la fila
    } else {
      campo += ch;
    }
  }
  // Último campo/fila (si el archivo no termina en salto de línea).
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  // Descarta filas totalmente vacías.
  return filas.filter((f) => f.some((c) => c.trim().length > 0));
}

/** Serializa filas a CSV con BOM (para que Excel respete los acentos). */
export function aCsv(filas: string[][], delimitador: "," | ";" = ";"): string {
  const necesitaComillas = (c: string) =>
    c.includes(delimitador) ||
    c.includes('"') ||
    c.includes("\n") ||
    c.includes("\r");
  const escapar = (c: string) =>
    necesitaComillas(c) ? `"${c.replace(/"/g, '""')}"` : c;
  return BOM + filas.map((f) => f.map(escapar).join(delimitador)).join("\r\n");
}
