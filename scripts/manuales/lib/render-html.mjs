// Tokens de marked (+ bloques sintéticos) -> HTML del manual. De este HTML sale el PDF.

/** Paleta de marca (src/app/globals.css y docs/GUIA-DE-MARCA.md). Compartida con el DOCX. */
export const MARCA = {
  base: "#070b14",
  surface: "#0d1322",
  surface2: "#111a2e",
  subtle: "#1e2a44",
  pitch: "#4ade80",
  pitchOscuro: "#15803d",
  oro: "#f5c542",
  info: "#2563eb",
  alerta: "#dc2626",
  texto: "#0b1220",
  muted: "#475569",
  borde: "#cbd5e1",
  fila: "#f1f5f9",
};

/** @param {string} s */
export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {any[] | undefined} tokens
 * @returns {string}
 */
export function inlineHtml(tokens = []) {
  return tokens
    .map((t) => {
      switch (t.type) {
        case "text":
          return Array.isArray(t.tokens) && t.tokens.length ? inlineHtml(t.tokens) : esc(t.text ?? "");
        case "escape":
          return esc(t.text ?? "");
        case "strong":
          return `<strong>${inlineHtml(t.tokens)}</strong>`;
        case "em":
          return `<em>${inlineHtml(t.tokens)}</em>`;
        case "del":
          return `<del>${inlineHtml(t.tokens)}</del>`;
        case "codespan":
          return `<code>${esc(t.text ?? "")}</code>`;
        case "br":
          return "<br>";
        case "link":
          return /^https?:/i.test(t.href ?? "")
            ? `<a href="${esc(t.href)}">${inlineHtml(t.tokens)}</a>`
            : inlineHtml(t.tokens);
        case "image":
          return "";
        case "html":
          return /^<br\s*\/?>$/i.test(t.text ?? "") ? "<br>" : "";
        default:
          return esc(t.raw ?? t.text ?? "");
      }
    })
    .join("");
}

/**
 * @param {any} item Elemento de lista (list_item).
 */
function itemHtml(item) {
  const partes = (item.tokens ?? []).map((hijo) => {
    if (hijo.type === "text") return inlineHtml(hijo.tokens ?? [hijo]);
    if (hijo.type === "paragraph") return `<p>${inlineHtml(hijo.tokens)}</p>`;
    return bloqueHtml(hijo);
  });
  return `<li>${partes.join("")}</li>`;
}

/**
 * @param {any} token
 * @returns {string}
 */
export function bloqueHtml(token) {
  switch (token.type) {
    case "heading": {
      const nivel = Math.min(Math.max(token.depth, 2), 4);
      return `<h${nivel}${token._id ? ` id="${token._id}"` : ""}>${inlineHtml(token.tokens)}</h${nivel}>`;
    }
    case "paragraph":
      return `<p>${inlineHtml(token.tokens)}</p>`;
    case "text":
      return `<p>${inlineHtml(token.tokens ?? [token])}</p>`;
    case "list": {
      const etiqueta = token.ordered ? "ol" : "ul";
      const inicio = token.ordered && token.start && token.start !== 1 ? ` start="${token.start}"` : "";
      return `<${etiqueta}${inicio}>${token.items.map(itemHtml).join("")}</${etiqueta}>`;
    }
    case "table":
      return tablaHtml(token);
    case "blockquote":
      return `<blockquote>${token.tokens.map(bloqueHtml).join("")}</blockquote>`;
    case "callout":
      return `<div class="callout callout-${token.tipo}"><div class="callout-titulo">${esc(token.titulo)}</div>${token.tokens
        .map(bloqueHtml)
        .join("")}</div>`;
    case "figura":
      return figuraHtml(token);
    case "code":
      return `<pre><code>${esc(token.text)}</code></pre>`;
    default:
      return "";
  }
}

/** @param {any} tabla */
function tablaHtml(tabla) {
  const alineacion = (/** @type {number} */ i) => (tabla.align?.[i] ? ` style="text-align:${tabla.align[i]}"` : "");
  const cabecera = tabla.header
    .map((c, i) => `<th${alineacion(i)}>${inlineHtml(c.tokens)}</th>`)
    .join("");
  const filas = tabla.rows
    .map((fila) => `<tr>${fila.map((c, i) => `<td${alineacion(i)}>${inlineHtml(c.tokens)}</td>`).join("")}</tr>`)
    .join("");
  const columnas = tabla.header.length;
  return `<div class="tabla-envoltorio"><table class="cols-${columnas}"><thead><tr>${cabecera}</tr></thead><tbody>${filas}</tbody></table></div>`;
}

/** @param {any} figura */
function figuraHtml(figura) {
  if (figura.faltante || !figura.datos) return "";
  const mime = figura.tipoImagen === "jpg" ? "image/jpeg" : "image/png";
  const src = `data:${mime};base64,${figura.datos.toString("base64")}`;
  const apaisada = figura.ancho >= figura.alto;
  const leyenda = figura.leyenda.length ? inlineHtml(figura.leyenda) : esc(figura.alt);
  return `<figure id="fig-${figura.numero}" class="${apaisada ? "apaisada" : "vertical"}"><img src="${src}" alt="${esc(
    figura.alt,
  )}"><figcaption><strong>Figura ${figura.numero}:</strong> ${leyenda}</figcaption></figure>`;
}

/**
 * @param {string} s
 * @returns {string} Cadena segura para `content: "..."` de CSS.
 */
function cssTexto(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

const CSS = `
@page { size: A4; margin: 22mm 18mm 20mm 18mm; }
@page :first { margin: 0; }

* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0;
  font-family: "Segoe UI", Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: ${MARCA.texto};
  background: #fff;
}

/* ---------- Portada ---------- */
.portada {
  width: 210mm;
  height: 296mm;
  padding: 26mm 22mm 20mm 22mm;
  background: ${MARCA.base};
  background-image:
    radial-gradient(ellipse at 85% 8%, rgba(74, 222, 128, 0.22), transparent 55%),
    radial-gradient(ellipse at 0% 100%, rgba(167, 139, 250, 0.14), transparent 50%);
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  break-after: page;
  overflow: hidden;
}
.portada .marca {
  font-size: 11pt;
  font-weight: 800;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: ${MARCA.pitch};
}
.portada .tagline { margin-top: 2mm; font-size: 9.5pt; color: #94a3b8; font-style: italic; }
.portada .centro { margin-top: auto; margin-bottom: auto; }
.portada .barra { width: 28mm; height: 2.2mm; background: ${MARCA.pitch}; border-radius: 2mm; margin-bottom: 9mm; }
.portada h1 {
  margin: 0 0 6mm 0;
  font-size: 34pt;
  line-height: 1.04;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #fff;
  border: 0;
  padding: 0;
}
.portada .subtitulo { font-size: 13pt; line-height: 1.45; color: #cbd5e1; max-width: 140mm; }
.portada .ficha {
  margin-top: 0;
  border: 1px solid ${MARCA.subtle};
  background: rgba(17, 26, 46, 0.7);
  border-radius: 3mm;
  overflow: hidden;
}
.portada .ficha-fila { display: flex; border-bottom: 1px solid ${MARCA.subtle}; font-size: 10pt; }
.portada .ficha-fila:last-child { border-bottom: 0; }
.portada .ficha-clave { width: 42mm; padding: 3mm 4mm; color: ${MARCA.pitch}; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.12em; }
.portada .ficha-valor { flex: 1; padding: 3mm 4mm; color: #e2e8f0; }

/* ---------- Estructura ---------- */
section.capitulo { break-before: page; }
section.capitulo:first-of-type { break-before: auto; }
.indice-pagina { break-before: page; }

h1.titulo-capitulo {
  font-size: 22pt;
  line-height: 1.15;
  font-weight: 900;
  font-style: italic;
  color: ${MARCA.base};
  margin: 0 0 6mm 0;
  padding-bottom: 3mm;
  border-bottom: 3px solid ${MARCA.pitch};
  break-after: avoid;
}
h1.titulo-capitulo .numero { color: ${MARCA.pitchOscuro}; margin-right: 3mm; }
h1.titulo-indice {
  font-size: 18pt; font-weight: 900; font-style: italic; margin: 0 0 6mm 0;
  padding-bottom: 3mm; border-bottom: 3px solid ${MARCA.pitch};
}

h2 {
  font-size: 14pt; font-weight: 800; color: ${MARCA.surface2};
  margin: 8mm 0 3mm 0; padding-left: 3mm; border-left: 3mm solid ${MARCA.pitch};
  break-after: avoid;
}
h3 { font-size: 11.5pt; font-weight: 800; color: ${MARCA.subtle}; margin: 6mm 0 2mm 0; break-after: avoid; }
h4 { font-size: 10.5pt; font-weight: 700; margin: 4mm 0 1.5mm 0; break-after: avoid; }

p { margin: 0 0 3mm 0; }
ul, ol { margin: 0 0 3.5mm 0; padding-left: 6mm; }
li { margin-bottom: 1.4mm; }
li > p { margin-bottom: 1mm; }
li > ul, li > ol { margin: 1.2mm 0 0 0; }
strong { font-weight: 700; }
a { color: ${MARCA.pitchOscuro}; text-decoration: none; }

code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.9em;
  background: ${MARCA.fila};
  border: 1px solid #e2e8f0;
  border-radius: 1mm;
  padding: 0 1.2mm;
  color: ${MARCA.surface2};
  overflow-wrap: anywhere;
}
pre { background: ${MARCA.fila}; padding: 3mm; border-radius: 2mm; overflow: hidden; white-space: pre-wrap; }

blockquote {
  margin: 0 0 3.5mm 0; padding: 2mm 4mm; border-left: 1.2mm solid ${MARCA.borde};
  color: ${MARCA.muted}; font-style: italic;
}
blockquote p:last-child { margin-bottom: 0; }

/* ---------- Tablas ---------- */
.tabla-envoltorio { margin: 0 0 5mm 0; }
table { width: 100%; border-collapse: collapse; font-size: 8.4pt; line-height: 1.38; table-layout: auto; }
thead { display: table-header-group; }
th {
  background: ${MARCA.surface2}; color: #fff; font-weight: 700; text-align: left;
  padding: 2mm 2.2mm; border: 1px solid ${MARCA.surface2}; vertical-align: bottom;
}
td { padding: 1.8mm 2.2mm; border: 1px solid ${MARCA.borde}; vertical-align: top; overflow-wrap: anywhere; }
tbody tr:nth-child(even) td { background: ${MARCA.fila}; }
tr { break-inside: avoid; }
table.cols-5 th:first-child, table.cols-5 td:first-child,
table.cols-6 th:first-child, table.cols-6 td:first-child { width: 9mm; text-align: center; }
td code, th code { font-size: 0.92em; }

/* ---------- Figuras ---------- */
figure { margin: 4mm 0 6mm 0; text-align: center; break-inside: avoid; }
figure img {
  max-width: 100%; max-height: 150mm; width: auto; height: auto;
  border: 1px solid ${MARCA.borde}; border-radius: 1.5mm;
  box-shadow: 0 1mm 3mm rgba(7, 11, 20, 0.12);
}
figure.vertical img { max-height: 135mm; }
figcaption { margin-top: 2mm; font-size: 8.6pt; color: ${MARCA.muted}; font-style: italic; }
figcaption strong { color: ${MARCA.pitchOscuro}; font-style: normal; }

/* ---------- Recuadros ---------- */
.callout { margin: 0 0 4mm 0; padding: 3mm 4mm; border-left: 1.6mm solid; border-radius: 0 1.5mm 1.5mm 0; break-inside: avoid; }
.callout p:last-child { margin-bottom: 0; }
.callout-titulo { font-weight: 800; text-transform: uppercase; font-size: 8.4pt; letter-spacing: 0.1em; margin-bottom: 1mm; }
.callout-importante { background: #eff6ff; border-color: ${MARCA.info}; }
.callout-importante .callout-titulo { color: ${MARCA.info}; }
.callout-ojo { background: #fffbeb; border-color: #d99a06; }
.callout-ojo .callout-titulo { color: #92600a; }
.callout-advertencia { background: #fef2f2; border-color: ${MARCA.alerta}; }
.callout-advertencia .callout-titulo { color: ${MARCA.alerta}; }

/* ---------- Índices ---------- */
.toc { list-style: none; padding: 0; margin: 0; }
.toc li { margin: 0; }
.toc a { color: ${MARCA.texto}; }
.toc .cap { font-weight: 800; font-size: 11pt; margin-top: 4mm; padding-bottom: 1mm; border-bottom: 1px dotted ${MARCA.borde}; }
.toc .sec { margin-left: 7mm; font-size: 9.6pt; color: ${MARCA.muted}; padding: 0.4mm 0; }
.toc .num { display: inline-block; min-width: 7mm; color: ${MARCA.pitchOscuro}; font-weight: 800; }
.toc-figuras .fig { font-size: 9.4pt; padding: 0.6mm 0; }
.toc-figuras .fig .num { min-width: 22mm; }

.pie-version { margin-top: 6mm; text-align: right; font-size: 8pt; color: #94a3b8; }
`;

/**
 * @typedef {Object} DatosManual
 * @property {{ id: string, titulo: string, subtitulo: string, audiencia: string }} rol
 * @property {import("./capitulo.mjs").Capitulo[]} capitulos
 * @property {import("./capitulo.mjs").Capitulo} introduccion
 * @property {string} versionApp
 * @property {string} fechaTexto
 */

/**
 * Asigna ids de ancla a los encabezados H2 de los capítulos.
 * @param {import("./capitulo.mjs").Capitulo[]} capitulos
 */
function asignarAnclas(capitulos) {
  for (const cap of capitulos) {
    let n = 0;
    for (const b of cap.bloques) {
      if (b.type === "heading" && b.depth === 2) {
        n += 1;
        b._id = `${cap.id}-s${n}`;
      }
    }
  }
}

/**
 * @param {DatosManual} datos
 * @returns {string} Documento HTML completo.
 */
export function renderizarManualHtml({ rol, capitulos, introduccion, versionApp, fechaTexto }) {
  const todos = [introduccion, ...capitulos];
  asignarAnclas(todos);

  const figuras = capitulos.flatMap((c) => c.bloques.filter((b) => b.type === "figura" && !b.faltante));

  const portada = `
<section class="portada">
  <div>
    <div class="marca">Academia Élite</div>
    <div class="tagline">Convierte el esfuerzo en una carta</div>
  </div>
  <div class="centro">
    <div class="barra"></div>
    <h1>${esc(rol.titulo)}</h1>
    <div class="subtitulo">${esc(rol.subtitulo)}</div>
  </div>
  <div class="ficha">
    <div class="ficha-fila"><div class="ficha-clave">Dirigido a</div><div class="ficha-valor">${esc(rol.audiencia)}</div></div>
    <div class="ficha-fila"><div class="ficha-clave">Versión de la app</div><div class="ficha-valor">${esc(versionApp)}</div></div>
    <div class="ficha-fila"><div class="ficha-clave">Fecha</div><div class="ficha-valor">${esc(fechaTexto)}</div></div>
  </div>
</section>`;

  const lineasToc = [
    `<li class="cap"><a href="#intro"><span class="num"></span>Introducción</a></li>`,
    ...capitulos.flatMap((cap) => [
      `<li class="cap"><a href="#${cap.id}"><span class="num">${cap.numero}.</span>${esc(cap.titulo)}</a></li>`,
      ...cap.bloques
        .filter((b) => b.type === "heading" && b.depth === 2)
        .map((h) => `<li class="sec"><a href="#${h._id}">${inlineHtml(h.tokens)}</a></li>`),
    ]),
  ];
  const indice = `
<section class="indice-pagina">
  <h1 class="titulo-indice">Índice</h1>
  <ul class="toc">${lineasToc.join("")}</ul>
</section>`;

  const introHtml = `
<section class="capitulo" id="intro">
  <h1 class="titulo-capitulo">${esc(introduccion.titulo)}</h1>
  ${introduccion.bloques.map(bloqueHtml).join("\n")}
</section>`;

  const capitulosHtml = capitulos
    .map(
      (cap) => `
<section class="capitulo" id="${cap.id}">
  <h1 class="titulo-capitulo"><span class="numero">${cap.numero}.</span>${esc(cap.titulo)}</h1>
  ${cap.bloques.map(bloqueHtml).join("\n")}
  ${cap.verificacion ? `<div class="pie-version">Versión ${esc(cap.verificacion.version)} · ${esc(cap.verificacion.fecha)}</div>` : ""}
</section>`,
    )
    .join("\n");

  const indiceFiguras = figuras.length
    ? `
<section class="capitulo">
  <h1 class="titulo-indice">Índice de figuras</h1>
  <ul class="toc toc-figuras">${figuras
    .map(
      (f) =>
        `<li class="fig"><a href="#fig-${f.numero}"><span class="num">Figura ${f.numero}</span>${
          f.leyenda.length ? inlineHtml(f.leyenda) : esc(f.alt)
        }</a></li>`,
    )
    .join("")}</ul>
</section>`
    : "";

  const cabecera = `${rol.titulo}`;
  const css = `${CSS}
@page {
  @top-left { content: "${cssTexto(cabecera)}"; font-family: "Segoe UI", Arial, sans-serif; font-size: 8pt; color: #64748b; padding-top: 6mm; }
  @top-right { content: "Academia Élite"; font-family: "Segoe UI", Arial, sans-serif; font-size: 8pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${MARCA.pitchOscuro}; padding-top: 6mm; }
  @bottom-left { content: "Versión ${cssTexto(versionApp)}"; font-family: "Segoe UI", Arial, sans-serif; font-size: 8pt; color: #94a3b8; padding-bottom: 5mm; }
  @bottom-right { content: "Página " counter(page); font-family: "Segoe UI", Arial, sans-serif; font-size: 8pt; color: #64748b; padding-bottom: 5mm; }
}
@page :first {
  counter-reset: page 0;
  @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }
}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${esc(rol.titulo)} — Academia Élite</title>
<style>${css}</style>
</head>
<body>
${portada}
${indice}
${introHtml}
${capitulosHtml}
${indiceFiguras}
</body>
</html>`;
}

