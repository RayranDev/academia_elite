// Uso: node scripts/manuales/build.mjs [--rol=entrenador] [--solo=docx|pdf] [--estricto]
//
// Arma, para cada rol con fichas, el manual en Word y en PDF a partir de las fichas Markdown:
//   docs/manuales/salida/<rol>/Manual_<NombreRol>.docx
//   docs/manuales/salida/<rol>/Manual_<NombreRol>.pdf
// y escribe docs/manuales/salida/_informe-construccion.md.
// Si ya existe un manual de ese rol, el anterior se guarda en salida/<rol>/anteriores/ con fecha y hora
// (las últimas 5 copias por archivo) antes de sobrescribirlo.
// Paso opcional posterior (Windows con Word): `npm run manuales:word` deja el índice del .docx con sus
// números de página y exporta el PDF de Word (*_word.pdf).
//
// Solo se publica la capa de usuario: la verificación, la columna "Verificado" y las secciones
// internas (Registro de verificación, Comportamientos conocidos, Notas internas) no salen.
//
// Con --estricto termina con código 1 si falta una imagen, una ficha está mal formada,
// hay fugas técnicas en la capa pública o queda alguna pantalla del rol sin documentar.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { numerarFiguras } from "./lib/bloques.mjs";
import { procesarFicha } from "./lib/capitulo.mjs";
import { DIR_SALIDA, cargarFichas, esPrincipal, leerRoles, obtenerCobertura, relativa, versionDeLaApp } from "./lib/comun.mjs";
import { hayProblemasDeCobertura } from "./lib/cobertura.mjs";
import { problemasDeFugas, problemasDeImagenes } from "./lib/estricto.mjs";
import { introduccionMarkdown } from "./lib/introduccion.mjs";
import { renderizarManualDocx } from "./lib/render-docx.mjs";
import { renderizarManualHtml } from "./lib/render-html.mjs";
import { respaldarAnterior } from "./lib/respaldo.mjs";

/**
 * @param {string[]} argv
 */
function leerArgumentos(argv) {
  const rolArg = argv.find((a) => a.startsWith("--rol="))?.split("=")[1];
  const soloArg = argv.find((a) => a.startsWith("--solo="))?.split("=")[1];
  if (soloArg && !["docx", "pdf"].includes(soloArg)) {
    throw new Error(`--solo debe ser "docx" o "pdf" (recibido: "${soloArg}")`);
  }
  return { rol: rolArg, solo: soloArg, estricto: argv.includes("--estricto") };
}

/** @param {Buffer} pdf */
function contarPaginasPdf(pdf) {
  const texto = pdf.toString("latin1");
  const porPagina = (texto.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  const porConteo = [...texto.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages/g)]
    .map((m) => Number(m[1] ?? m[2]))
    .reduce((a, b) => Math.max(a, b), 0);
  return Math.max(porPagina, porConteo);
}

/** @param {number} bytes */
function formatoMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

/**
 * Genera el PDF con Chromium. Devuelve null y deja un mensaje claro si no hay navegador.
 * @param {import("@playwright/test").Browser} navegador
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function generarPdf(navegador, html) {
  const pagina = await navegador.newPage();
  try {
    await pagina.setContent(html, { waitUntil: "load" });
    return await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await pagina.close();
  }
}

export async function construir(argv = process.argv.slice(2)) {
  const opciones = leerArgumentos(argv);
  const roles = leerRoles();
  const rolesAConstruir = opciones.rol ? roles.filter((r) => r.id === opciones.rol) : roles;
  if (opciones.rol && rolesAConstruir.length === 0) {
    throw new Error(`Rol desconocido: "${opciones.rol}". Roles válidos: ${roles.map((r) => r.id).join(", ")}`);
  }

  const fichas = cargarFichas(roles);
  const { cobertura } = obtenerCobertura(roles, fichas);
  const versionApp = versionDeLaApp();
  const fechaTexto = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date());

  /** @type {import("@playwright/test").Browser | null} */
  let navegador = null;
  if (opciones.solo !== "docx") {
    try {
      navegador = await chromium.launch();
    } catch (error) {
      const detalle = error instanceof Error ? error.message.split("\n")[0] : String(error);
      throw new Error(
        `No se pudo abrir Chromium para generar el PDF (${detalle}). Instálalo con: npx playwright install chromium`,
      );
    }
  }

  /** @type {any[]} */
  const resumen = [];
  /** @type {string[]} */
  const problemasEstrictos = [];

  try {
    for (const rol of rolesAConstruir) {
      const delRol = fichas.filter((f) => f.rol === rol.id);
      const incluidas = delRol
        .filter((f) => f.estado === "vigente")
        .sort((a, b) => a.orden - b.orden || a.modulo.localeCompare(b.modulo));
      const excluidas = delRol.filter((f) => f.estado !== "vigente");

      for (const f of delRol) {
        for (const e of f.errores) problemasEstrictos.push(`${f.archivoRelativo}: ${e}`);
      }

      if (incluidas.length === 0) {
        console.log(`- ${rol.titulo}: sin fichas vigentes, no se genera.`);
        resumen.push({ rol, incluidas: [], excluidas, generado: false });
        continue;
      }

      console.log(`- ${rol.titulo}: ${incluidas.length} capítulo(s)`);

      const capitulos = [];
      for (const [i, ficha] of incluidas.entries()) {
        const capitulo = await procesarFicha(ficha);
        capitulos.push({ ...capitulo, id: `cap-${i + 1}`, numero: i + 1 });
      }
      const introduccion = {
        ...(await procesarFicha(
          {
            cuerpo: `# Introducción\n\n${introduccionMarkdown(rol)}`,
            archivo: rol.id,
            archivoRelativo: `introduccion:${rol.id}`,
            lineasFrontMatter: 0,
          },
          { resolverImagenes: false },
        )),
        id: "intro",
        numero: 0,
      };

      const totalFiguras = numerarFiguras(capitulos);
      const datos = { rol, capitulos, introduccion, versionApp, fechaTexto };

      const carpeta = path.join(DIR_SALIDA, rol.id);
      fs.mkdirSync(carpeta, { recursive: true });
      const base = path.join(carpeta, rol.archivo);

      /** @type {{ docx?: number, pdf?: number, paginas?: number }} */
      const salida = {};

      if (opciones.solo !== "pdf") {
        const buffer = await renderizarManualDocx(datos);
        respaldarAnterior(`${base}.docx`);
        fs.writeFileSync(`${base}.docx`, buffer);
        salida.docx = buffer.length;
        console.log(`    Word: ${relativa(`${base}.docx`)} (${formatoMB(buffer.length)})`);
      }

      if (navegador) {
        const html = renderizarManualHtml(datos);
        fs.writeFileSync(path.join(carpeta, "_manual.html"), html, "utf8");
        const pdf = await generarPdf(navegador, html);
        respaldarAnterior(`${base}.pdf`);
        fs.writeFileSync(`${base}.pdf`, pdf);
        salida.pdf = pdf.length;
        salida.paginas = contarPaginasPdf(pdf);
        console.log(`    PDF:  ${relativa(`${base}.pdf`)} (${formatoMB(pdf.length)}, ${salida.paginas} páginas)`);
      }

      const imagenesFaltantes = capitulos.flatMap((c) => c.imagenesFaltantes);
      const fugas = capitulos.flatMap((c) => c.fugas);
      problemasEstrictos.push(...problemasDeImagenes(imagenesFaltantes), ...problemasDeFugas(fugas));

      resumen.push({
        rol,
        incluidas,
        excluidas,
        capitulos,
        totalFiguras,
        imagenesFaltantes,
        fugas,
        salida,
        generado: true,
      });
    }
  } finally {
    await navegador?.close();
  }

  // Cobertura: en modo estricto solo cuentan los roles que se construyen.
  const coberturaDeLosRoles = cobertura.filter((c) => rolesAConstruir.some((r) => r.id === c.rol));
  if (hayProblemasDeCobertura(coberturaDeLosRoles)) {
    problemasEstrictos.push("cobertura de pantallas incompleta (ver npm run manuales:cobertura)");
  }

  escribirInforme({ resumen, cobertura, roles, versionApp, opciones });
  console.log(`\nInforme: ${relativa(path.join(DIR_SALIDA, "_informe-construccion.md"))}`);

  if (resumen.some((r) => r.salida?.docx)) {
    console.log(
      "Nota: el índice del Word se publica sin números de página (así Word no pregunta nada al abrir). " +
        "En Windows con Word, `npm run manuales:word` los calcula, los guarda en el .docx y exporta *_word.pdf.",
    );
  }

  const totalFugas = resumen.reduce((a, r) => a + (r.fugas?.length ?? 0), 0);
  if (totalFugas) console.log(`Avisos: ${totalFugas} posible(s) fuga(s) técnica(s) en el texto de usuario (ver informe).`);

  if (opciones.estricto && problemasEstrictos.length) {
    console.error("\nModo estricto: se encontraron problemas:");
    for (const p of problemasEstrictos) console.error(`  - ${p}`);
    process.exitCode = 1;
  }
}

/**
 * @param {{ resumen: any[], cobertura: import("./lib/cobertura.mjs").CoberturaRol[], roles: import("./lib/comun.mjs").Rol[], versionApp: string, opciones: { rol?: string, solo?: string, estricto: boolean } }} datos
 */
function escribirInforme({ resumen, cobertura, roles, versionApp, opciones }) {
  const l = [];
  l.push("# Informe de construcción de manuales");
  l.push("");
  l.push(`- Versión de la app: \`${versionApp}\``);
  l.push(`- Generado: ${new Date().toISOString()}`);
  l.push(
    `- Opciones: rol=${opciones.rol ?? "todos"}, solo=${opciones.solo ?? "docx + pdf"}, estricto=${opciones.estricto ? "sí" : "no"}`,
  );
  l.push("");
  l.push("## Roles construidos");
  l.push("");
  l.push("| Rol | Módulos incluidos | Figuras | Páginas (PDF) | Word | PDF |");
  l.push("|---|---|---:|---:|---:|---:|");
  for (const r of resumen) {
    if (!r.generado) {
      l.push(`| ${r.rol.titulo} | _(sin fichas vigentes: no se genera)_ | — | — | — | — |`);
      continue;
    }
    const modulos = r.incluidas.map((f) => `${f.orden}. ${f.modulo}`).join("<br>");
    l.push(
      `| ${r.rol.titulo} | ${modulos} | ${r.totalFiguras} | ${r.salida.paginas ?? "n/d"} | ${r.salida.docx ? formatoMB(r.salida.docx) : "—"} | ${r.salida.pdf ? formatoMB(r.salida.pdf) : "—"} |`,
    );
  }

  const excluidas = resumen.flatMap((r) => r.excluidas.map((f) => ({ rol: r.rol, ficha: f })));
  if (excluidas.length) {
    l.push("");
    l.push("## Módulos excluidos (no vigentes)");
    l.push("");
    for (const x of excluidas) l.push(`- ${x.rol.etiqueta}: **${x.ficha.modulo}** (estado \`${x.ficha.estado}\`)`);
  }

  l.push("");
  l.push("## Avisos de fugas técnicas en el texto de usuario");
  l.push("");
  const fugas = resumen.flatMap((r) => r.fugas ?? []);
  if (fugas.length === 0) {
    l.push("Sin avisos.");
  } else {
    l.push("Los spans de código que son fugas se publican como texto plano (sin backticks). Conviene reescribir la frase en lenguaje de usuario.");
    l.push("");
    l.push("| Ficha:línea | Texto | Motivo |");
    l.push("|---|---|---|");
    for (const f of fugas) l.push(`| \`${f.archivo}:${f.linea}\` | \`${f.texto.replace(/\|/g, "\\|")}\` | ${f.motivo} |`);
  }

  l.push("");
  l.push("## Imágenes faltantes");
  l.push("");
  const faltantes = resumen.flatMap((r) => r.imagenesFaltantes ?? []);
  if (faltantes.length === 0) l.push("Ninguna.");
  else for (const i of faltantes) l.push(`- \`${i.archivo}:${i.linea}\`: \`${i.href}\``);

  l.push("");
  l.push("## Cobertura de rutas");
  l.push("");
  l.push("| Rol | Cubiertas | Total | Cobertura | Sin documentar |");
  l.push("|---|---:|---:|---:|---:|");
  for (const c of cobertura) {
    const rol = roles.find((x) => x.id === c.rol);
    l.push(`| ${rol?.etiqueta ?? c.rol} | ${c.cubiertas.length} | ${c.total} | ${c.porcentaje} % | ${c.sinDocumentar.length} |`);
  }
  for (const c of cobertura) {
    if (!c.sinDocumentar.length && !c.inexistentes.length) continue;
    const rol = roles.find((x) => x.id === c.rol);
    l.push("");
    l.push(`### ${rol?.etiqueta ?? c.rol}`);
    if (c.sinDocumentar.length) {
      l.push("");
      l.push("Sin documentar: " + c.sinDocumentar.map((r) => `\`${r}\``).join(", "));
    }
    if (c.inexistentes.length) {
      l.push("");
      l.push("Declaradas que no existen: " + c.inexistentes.map((x) => `\`${x.ruta}\` (${x.modulo})`).join(", "));
    }
  }
  l.push("");

  fs.mkdirSync(DIR_SALIDA, { recursive: true });
  fs.writeFileSync(path.join(DIR_SALIDA, "_informe-construccion.md"), l.join("\n"), "utf8");
}

if (esPrincipal(import.meta.url)) {
  construir().catch((error) => {
    console.error(`\nError: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
