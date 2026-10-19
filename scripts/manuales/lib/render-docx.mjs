// Tokens de marked (+ bloques sintéticos) -> documento Word (.docx) con la librería `docx`.
// Usa los mismos tokens que render-html.mjs: una sola fuente, dos salidas coherentes.

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { textoPlano } from "./capa-usuario.mjs";
import { MARCA } from "./render-html.mjs";

/** Colores sin "#" para OOXML. */
const C = Object.fromEntries(Object.entries(MARCA).map(([k, v]) => [k, v.replace("#", "").toUpperCase()]));
const FUENTE = "Calibri";
const FUENTE_CODIGO = "Consolas";
const ANCHO_UTIL = 9638; // A4 (11906) menos márgenes de 2 cm (1134 x 2), en twips.

const TAMANO_CUERPO = 21; // 10,5 pt (medios puntos)
const TAMANO_TABLA = 17; // 8,5 pt

/** @type {Record<string, { fill: string, borde: string, titulo: string }>} */
const COLORES_CALLOUT = {
  importante: { fill: "EFF6FF", borde: C.info, titulo: C.info },
  ojo: { fill: "FFFBEB", borde: "D99A06", titulo: "92600A" },
  advertencia: { fill: "FEF2F2", borde: C.alerta, titulo: C.alerta },
};

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDE_TABLA = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };

/**
 * Contexto de renderizado: acumula las configuraciones de numeración (cada lista ordenada reinicia en 1).
 * @returns {{ configuraciones: any[], nuevaListaOrdenada: (inicio?: number) => string }}
 */
function crearContexto() {
  /** @type {any[]} */
  const configuraciones = [
    {
      reference: "vinetas",
      levels: [0, 1, 2, 3].map((nivel) => ({
        level: nivel,
        format: LevelFormat.BULLET,
        text: ["•", "–", "▪", "·"][nivel],
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540 + nivel * 360, hanging: 270 } } },
      })),
    },
  ];
  let contador = 0;
  return {
    configuraciones,
    nuevaListaOrdenada(inicio = 1) {
      contador += 1;
      const reference = `ordenada-${contador}`;
      configuraciones.push({
        reference,
        levels: [0, 1, 2, 3].map((nivel) => ({
          level: nivel,
          format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN, LevelFormat.DECIMAL][nivel],
          text: `%${nivel + 1}.`,
          alignment: AlignmentType.LEFT,
          start: nivel === 0 ? inicio : 1,
          style: { paragraph: { indent: { left: 540 + nivel * 360, hanging: 360 } } },
        })),
      });
      return reference;
    },
  };
}

/**
 * @typedef {{ bold?: boolean, italics?: boolean, strike?: boolean, color?: string, size?: number, font?: string }} EstiloRun
 */

/**
 * @param {any[] | undefined} tokens
 * @param {EstiloRun} [estilo]
 * @returns {(TextRun | ExternalHyperlink)[]}
 */
function runsDeInline(tokens = [], estilo = {}) {
  /** @type {(TextRun | ExternalHyperlink)[]} */
  const runs = [];
  for (const t of tokens) {
    switch (t.type) {
      case "text":
        if (Array.isArray(t.tokens) && t.tokens.length) runs.push(...runsDeInline(t.tokens, estilo));
        else if (t.text) runs.push(new TextRun({ text: String(t.text), ...estilo }));
        break;
      case "escape":
        runs.push(new TextRun({ text: String(t.text ?? ""), ...estilo }));
        break;
      case "strong":
        runs.push(...runsDeInline(t.tokens, { ...estilo, bold: true }));
        break;
      case "em":
        runs.push(...runsDeInline(t.tokens, { ...estilo, italics: true }));
        break;
      case "del":
        runs.push(...runsDeInline(t.tokens, { ...estilo, strike: true }));
        break;
      case "codespan":
        runs.push(
          new TextRun({
            text: String(t.text ?? ""),
            ...estilo,
            font: FUENTE_CODIGO,
            color: C.surface2,
            shading: { type: ShadingType.CLEAR, fill: C.fila, color: "auto" },
          }),
        );
        break;
      case "br":
        runs.push(new TextRun({ break: 1 }));
        break;
      case "html":
        if (/^<br\s*\/?>$/i.test(t.text ?? "")) runs.push(new TextRun({ break: 1 }));
        break;
      case "link":
        if (/^https?:/i.test(t.href ?? "")) {
          runs.push(
            new ExternalHyperlink({
              link: t.href,
              children: /** @type {TextRun[]} */ (runsDeInline(t.tokens, { ...estilo, color: C.pitchOscuro })),
            }),
          );
        } else {
          runs.push(...runsDeInline(t.tokens, estilo));
        }
        break;
      default:
        if (t.text) runs.push(new TextRun({ text: String(t.text), ...estilo }));
    }
  }
  return runs;
}

/**
 * Pesos relativos de las columnas de una tabla, según el largo de su contenido.
 * @param {any} tabla
 * @returns {number[]} Anchos en twips que suman ANCHO_UTIL.
 */
export function anchosDeColumnas(tabla) {
  const columnas = tabla.header.length;
  const largoDe = (/** @type {any} */ celda) =>
    Math.max(
      ...String(
        (celda.tokens ?? [])
          .map((t) => (t.type === "html" && /^<br/i.test(t.text ?? "") ? "\n" : textoPlano([t])))
          .join(""),
      )
        .split("\n")
        .map((s) => s.length),
      1,
    );
  const pesos = Array.from({ length: columnas }, (_v, i) => {
    const largos = [largoDe(tabla.header[i]), ...tabla.rows.map((fila) => largoDe(fila[i]))].sort((a, b) => a - b);
    const percentil = largos[Math.min(largos.length - 1, Math.floor(largos.length * 0.8))];
    return Math.min(Math.max(percentil, 4), 70) ** 0.75;
  });
  const minimo = 620;
  const suma = pesos.reduce((a, b) => a + b, 0);
  let anchos = pesos.map((p) => Math.max(minimo, Math.round((p / suma) * ANCHO_UTIL)));
  const exceso = anchos.reduce((a, b) => a + b, 0) - ANCHO_UTIL;
  if (exceso !== 0) {
    const indiceMayor = anchos.indexOf(Math.max(...anchos));
    anchos[indiceMayor] -= exceso;
  }
  return anchos;
}

/**
 * @param {any} tabla
 * @returns {Table}
 */
function tablaDocx(tabla) {
  const anchos = anchosDeColumnas(tabla);
  const margenes = { top: 55, bottom: 55, left: 85, right: 85 };
  const bordes = { top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA };

  const celdaDe = (/** @type {any} */ celda, /** @type {number} */ i, /** @type {boolean} */ cabecera, /** @type {number} */ fila) => {
    const alineacion = tabla.align?.[i] === "center" ? AlignmentType.CENTER : tabla.align?.[i] === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;
    const estilo = cabecera
      ? { bold: true, color: "FFFFFF", size: TAMANO_TABLA }
      : { size: TAMANO_TABLA };
    return new TableCell({
      width: { size: anchos[i], type: WidthType.DXA },
      margins: margenes,
      borders: bordes,
      verticalAlign: cabecera ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
      shading: cabecera
        ? { type: ShadingType.CLEAR, fill: C.surface2, color: "auto" }
        : fila % 2 === 1
          ? { type: ShadingType.CLEAR, fill: C.fila, color: "auto" }
          : undefined,
      children: [
        new Paragraph({
          alignment: alineacion,
          spacing: { after: 0, line: 250 },
          children: runsDeInline(celda.tokens, estilo),
        }),
      ],
    });
  };

  const filas = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: tabla.header.map((c, i) => celdaDe(c, i, true, 0)),
    }),
    ...tabla.rows.map(
      (fila, r) =>
        new TableRow({
          cantSplit: true,
          children: fila.map((c, i) => celdaDe(c, i, false, r)),
        }),
    ),
  ];

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    rows: filas,
  });
}

/** @returns {Paragraph} Separador pequeño tras tablas y recuadros. */
function espacio(despues = 120) {
  return new Paragraph({ spacing: { before: 0, after: despues, line: 120 }, children: [] });
}

/**
 * @param {any} callout
 * @param {ReturnType<typeof crearContexto>} ctx
 */
function calloutDocx(callout, ctx) {
  const colores = COLORES_CALLOUT[callout.tipo] ?? COLORES_CALLOUT.importante;
  return [
    new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: [ANCHO_UTIL],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: ANCHO_UTIL, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: colores.fill, color: "auto" },
              margins: { top: 100, bottom: 100, left: 200, right: 160 },
              borders: {
                top: SIN_BORDE,
                bottom: SIN_BORDE,
                right: SIN_BORDE,
                left: { style: BorderStyle.SINGLE, size: 36, color: colores.borde },
              },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  keepNext: true,
                  children: [
                    new TextRun({ text: String(callout.titulo).toUpperCase(), bold: true, size: 17, color: colores.titulo, characterSpacing: 20 }),
                  ],
                }),
                ...bloquesDocx(callout.tokens, ctx, { conservarFinal: true }),
              ],
            }),
          ],
        }),
      ],
    }),
    espacio(),
  ];
}

/**
 * @param {any} figura
 */
function figuraDocx(figura) {
  if (figura.faltante || !figura.datos) return [];
  const anchoMax = 580;
  const altoMax = 520;
  const escala = Math.min(anchoMax / figura.ancho, altoMax / figura.alto, 1);
  const ancho = Math.max(1, Math.round(figura.ancho * escala));
  const alto = Math.max(1, Math.round(figura.alto * escala));
  const leyenda = figura.leyenda.length ? runsDeInline(figura.leyenda, { italics: true, color: C.muted, size: 18 }) : [new TextRun({ text: figura.alt, italics: true, color: C.muted, size: 18 })];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          type: figura.tipoImagen === "jpg" ? "jpg" : "png",
          data: figura.datos,
          transformation: { width: ancho, height: alto },
          altText: { name: `Figura ${figura.numero}`, title: `Figura ${figura.numero}`, description: figura.alt || `Figura ${figura.numero}` },
        }),
      ],
    }),
    new Paragraph({
      style: "Leyenda",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Figura ${figura.numero}: `, bold: true, color: C.pitchOscuro, size: 18 }), ...leyenda],
    }),
  ];
}

/**
 * Renderiza una lista (con anidados) a párrafos con numeración.
 * @param {any} lista
 * @param {ReturnType<typeof crearContexto>} ctx
 * @param {number} nivel
 * @returns {Paragraph[]}
 */
function listaDocx(lista, ctx, nivel = 0) {
  const referencia = lista.ordered ? ctx.nuevaListaOrdenada(Number(lista.start) || 1) : "vinetas";
  /** @type {Paragraph[]} */
  const parrafos = [];
  for (const item of lista.items) {
    let primero = true;
    for (const hijo of item.tokens ?? []) {
      if (hijo.type === "text" || hijo.type === "paragraph") {
        const runs = runsDeInline(hijo.tokens ?? [hijo]);
        if (primero) {
          parrafos.push(
            new Paragraph({
              numbering: { reference: referencia, level: Math.min(nivel, 3) },
              spacing: { after: 50 },
              children: runs,
            }),
          );
          primero = false;
        } else {
          parrafos.push(
            new Paragraph({ indent: { left: 540 + nivel * 360 }, spacing: { after: 50 }, children: runs }),
          );
        }
      } else if (hijo.type === "list") {
        parrafos.push(...listaDocx(hijo, ctx, nivel + 1));
      }
    }
  }
  return parrafos;
}

/**
 * @param {any[]} tokens
 * @param {ReturnType<typeof crearContexto>} ctx
 * @param {{ conservarFinal?: boolean }} [opciones] `conservarFinal`: no agregar espacio tras el último párrafo (dentro de recuadros).
 * @returns {(Paragraph | Table)[]}
 */
export function bloquesDocx(tokens, ctx, { conservarFinal = false } = {}) {
  /** @type {(Paragraph | Table)[]} */
  const salida = [];
  tokens.forEach((token, indice) => {
    const esUltimo = indice === tokens.length - 1;
    switch (token.type) {
      case "heading": {
        const nivel = Math.min(Math.max(token.depth, 2), 4);
        const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][nivel - 1];
        salida.push(new Paragraph({ heading, children: runsDeInline(token.tokens) }));
        break;
      }
      case "paragraph":
      case "text":
        salida.push(
          new Paragraph({
            spacing: { after: conservarFinal && esUltimo ? 0 : 110 },
            children: runsDeInline(token.tokens ?? [token]),
          }),
        );
        break;
      case "list":
        salida.push(...listaDocx(token, ctx));
        salida.push(new Paragraph({ spacing: { after: 60, line: 120 }, children: [] }));
        break;
      case "table":
        salida.push(tablaDocx(token), espacio(160));
        break;
      case "blockquote":
        for (const hijo of token.tokens ?? []) {
          if (hijo.type === "paragraph" || hijo.type === "text") {
            salida.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 110 },
                border: { left: { style: BorderStyle.SINGLE, size: 12, color: "CBD5E1", space: 8 } },
                children: runsDeInline(hijo.tokens ?? [hijo], { italics: true, color: C.muted }),
              }),
            );
          }
        }
        break;
      case "callout":
        salida.push(...calloutDocx(token, ctx));
        break;
      case "figura":
        salida.push(...figuraDocx(token));
        break;
      case "code":
        salida.push(
          new Paragraph({
            spacing: { after: 110 },
            shading: { type: ShadingType.CLEAR, fill: C.fila, color: "auto" },
            children: [new TextRun({ text: String(token.text), font: FUENTE_CODIGO, size: 18 })],
          }),
        );
        break;
      default:
        break;
    }
  });
  return salida;
}

/** @returns {any} Estilos del documento (marca). */
function estilos() {
  const base = { font: FUENTE };
  return {
    default: {
      document: {
        run: { ...base, size: TAMANO_CUERPO, color: C.texto },
        paragraph: { spacing: { line: 300 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { ...base, size: 44, bold: true, italics: true, color: C.base },
        paragraph: {
          spacing: { before: 0, after: 280 },
          keepNext: true,
          outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.pitch, space: 6 } },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { ...base, size: 28, bold: true, color: C.surface2 },
        paragraph: {
          spacing: { before: 360, after: 120 },
          keepNext: true,
          outlineLevel: 1,
          border: { left: { style: BorderStyle.SINGLE, size: 36, color: C.pitch, space: 8 } },
          indent: { left: 120 },
        },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { ...base, size: 24, bold: true, color: C.subtle },
        paragraph: { spacing: { before: 280, after: 100 }, keepNext: true, outlineLevel: 2 },
      },
      {
        id: "Heading4",
        name: "Heading 4",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { ...base, size: 22, bold: true, color: C.texto },
        paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 3 },
      },
      {
        id: "Leyenda",
        name: "Leyenda",
        basedOn: "Normal",
        quickFormat: true,
        run: { ...base, size: 18, italics: true, color: C.muted },
        paragraph: { spacing: { after: 200 } },
      },
      {
        id: "TituloIndice",
        name: "Titulo indice",
        basedOn: "Normal",
        next: "Normal",
        run: { ...base, size: 36, bold: true, italics: true, color: C.base },
        paragraph: {
          spacing: { before: 0, after: 240 },
          keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.pitch, space: 6 } },
        },
      },
      {
        id: "TOC1",
        name: "toc 1",
        basedOn: "Normal",
        next: "Normal",
        run: { ...base, size: 22, bold: true },
        paragraph: { spacing: { before: 120, after: 40 } },
      },
      {
        id: "TOC2",
        name: "toc 2",
        basedOn: "Normal",
        next: "Normal",
        run: { ...base, size: 20, color: C.muted },
        paragraph: { spacing: { after: 20 }, indent: { left: 360 } },
      },
    ],
  };
}

/**
 * @param {import("./render-html.mjs").DatosManual} datos
 * @returns {Promise<Buffer>}
 */
export async function renderizarManualDocx({ rol, capitulos, introduccion, versionApp, fechaTexto }) {
  const ctx = crearContexto();

  // ---------- Portada ----------
  const filaFicha = (/** @type {string} */ clave, /** @type {string} */ valor) =>
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 2600, type: WidthType.DXA },
          margins: { top: 90, bottom: 90, left: 140, right: 100 },
          shading: { type: ShadingType.CLEAR, fill: C.fila, color: "auto" },
          borders: { top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: clave.toUpperCase(), bold: true, size: 16, color: C.pitchOscuro, characterSpacing: 20 })] })],
        }),
        new TableCell({
          width: { size: ANCHO_UTIL - 2600, type: WidthType.DXA },
          margins: { top: 90, bottom: 90, left: 140, right: 100 },
          borders: { top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: valor, size: 21 })] })],
        }),
      ],
    });

  const portada = [
    new Paragraph({
      spacing: { before: 600, after: 60 },
      children: [new TextRun({ text: "ACADEMIA ÉLITE", bold: true, size: 26, color: C.pitchOscuro, characterSpacing: 80 })],
    }),
    new Paragraph({
      spacing: { after: 1500 },
      children: [new TextRun({ text: "Convierte el esfuerzo en una carta", italics: true, size: 20, color: C.muted })],
    }),
    new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: [ANCHO_UTIL],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: ANCHO_UTIL, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: C.base, color: "auto" },
              margins: { top: 560, bottom: 560, left: 520, right: 520 },
              borders: {
                top: SIN_BORDE,
                right: SIN_BORDE,
                bottom: { style: BorderStyle.SINGLE, size: 48, color: C.pitch },
                left: { style: BorderStyle.SINGLE, size: 48, color: C.pitch },
              },
              children: [
                new Paragraph({
                  spacing: { after: 240, line: 240 },
                  children: [new TextRun({ text: rol.titulo.toUpperCase(), bold: true, italics: true, size: 68, color: "FFFFFF" })],
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [new TextRun({ text: rol.subtitulo, size: 26, color: "CBD5E1" })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 1600 }, children: [] }),
    new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: [2600, ANCHO_UTIL - 2600],
      layout: TableLayoutType.FIXED,
      rows: [
        filaFicha("Dirigido a", rol.audiencia),
        filaFicha("Versión de la app", versionApp),
        filaFicha("Fecha", fechaTexto),
      ],
    }),
  ];

  // ---------- Índice (campo TOC con entradas precargadas) ----------
  // Ni `updateFields` en settings.xml ni `w:dirty` en el campo: ambos hacen que Word pregunte al abrir
  // "¿desea actualizar los campos?" (y, abierto de forma automática, puede colgarse). El índice se publica
  // con sus entradas ya escritas; los números de página los calcula Word con `npm run manuales:word`
  // (paso opcional en Windows con Word) y quedan guardados dentro del .docx.
  const entradasToc = [
    { title: introduccion.titulo, level: 1 },
    ...introduccion.bloques
      .filter((b) => b.type === "heading" && b.depth === 2)
      .map((h) => ({ title: textoPlano(h.tokens).trim(), level: 2 })),
    ...capitulos.flatMap((cap) => [
      { title: `${cap.numero}. ${cap.titulo}`, level: 1 },
      ...cap.bloques
        .filter((b) => b.type === "heading" && b.depth === 2)
        .map((h) => ({ title: textoPlano(h.tokens).trim(), level: 2 })),
    ]),
  ];

  /** @type {(Paragraph | Table | TableOfContents)[]} */
  const contenido = [
    new Paragraph({ style: "TituloIndice", children: [new TextRun("Índice")] }),
    new TableOfContents("Índice", {
      hyperlink: true,
      headingStyleRange: "1-2",
      cachedEntries: entradasToc,
      beginDirty: false,
    }),
  ];

  // Introducción
  contenido.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(introduccion.titulo)] }),
    ...bloquesDocx(introduccion.bloques, ctx),
  );

  // Capítulos
  for (const cap of capitulos) {
    contenido.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        children: [new TextRun(`${cap.numero}. ${cap.titulo}`)],
      }),
      ...bloquesDocx(cap.bloques, ctx),
    );
    if (cap.verificacion) {
      contenido.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 240 },
          children: [new TextRun({ text: `Versión ${cap.verificacion.version} · ${cap.verificacion.fecha}`, size: 16, color: "94A3B8" })],
        }),
      );
    }
  }

  // Índice de figuras (lista estática)
  const figuras = capitulos.flatMap((c) => c.bloques.filter((b) => b.type === "figura" && !b.faltante));
  if (figuras.length) {
    contenido.push(new Paragraph({ style: "TituloIndice", pageBreakBefore: true, children: [new TextRun("Índice de figuras")] }));
    for (const f of figuras) {
      contenido.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `Figura ${f.numero}: `, bold: true, color: C.pitchOscuro, size: 20 }),
            ...(f.leyenda.length ? runsDeInline(f.leyenda, { size: 20 }) : [new TextRun({ text: f.alt, size: 20 })]),
          ],
        }),
      );
    }
  }

  const tipografiaPie = { size: 16, color: "64748B", font: FUENTE };
  const documento = new Document({
    creator: "Academia Élite",
    title: rol.titulo,
    description: `${rol.titulo} — Academia Élite`,
    styles: estilos(),
    numbering: { config: ctx.configuraciones },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: portada,
      },
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1304, bottom: 1191, left: 1134, right: 1134, header: 567, footer: 567 },
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: ANCHO_UTIL }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } },
                children: [
                  new TextRun({ text: rol.titulo, ...tipografiaPie }),
                  new TextRun({ text: "\tACADEMIA ÉLITE", bold: true, size: 16, color: C.pitchOscuro, font: FUENTE, characterSpacing: 30 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: ANCHO_UTIL }],
                children: [
                  new TextRun({ text: `Versión ${versionApp}`, ...tipografiaPie, color: "94A3B8" }),
                  new TextRun({ children: ["\tPágina ", PageNumber.CURRENT], ...tipografiaPie }),
                ],
              }),
            ],
          }),
        },
        children: contenido,
      },
    ],
  });

  return Packer.toBuffer(documento);
}
