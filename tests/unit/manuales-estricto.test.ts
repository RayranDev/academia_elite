import { marked } from "marked";
import JSZip from "jszip"; // dependencia transitiva de `docx`; solo se usa para leer el .docx generado
import { describe, expect, it } from "vitest";
import { anotarLineas, filtrarCapaUsuario, neutralizarFugas } from "../../scripts/manuales/lib/capa-usuario.mjs";
import { procesarFicha } from "../../scripts/manuales/lib/capitulo.mjs";
import { cargarFichas, leerRoles } from "../../scripts/manuales/lib/comun.mjs";
import { problemasDeFugas, problemasDeImagenes } from "../../scripts/manuales/lib/estricto.mjs";
import { renderizarManualDocx } from "../../scripts/manuales/lib/render-docx.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
function fugasDe(md: string) {
  const { tokens } = filtrarCapaUsuario(anotarLineas(marked.lexer(md)));
  return neutralizarFugas(tokens, { archivo: "f.md" });
}

describe("modo estricto: problemas que hacen fallar la construcción", () => {
  it("cada fuga técnica se convierte en un problema con ficha, línea y motivo", () => {
    const problemas = problemasDeFugas([
      { archivo: "docs/manuales/fuentes/x/y.md", linea: 14, texto: "/dt/plantilla", motivo: 'contiene "/" (ruta o clase)' },
    ]);
    expect(problemas).toEqual([
      'docs/manuales/fuentes/x/y.md:14: fuga técnica en la capa pública "/dt/plantilla" (contiene "/" (ruta o clase))',
    ]);
  });

  it("sin fugas no hay problemas", () => {
    expect(problemasDeFugas([])).toEqual([]);
  });

  it("las imágenes faltantes siguen siendo problemas", () => {
    expect(problemasDeImagenes([{ archivo: "a.md", linea: 3, href: "../img/x.png" }])).toEqual([
      "a.md:3: falta la imagen ../img/x.png",
    ]);
  });
});

describe("detección de fugas en la capa pública", () => {
  it("avisa de una ruta escrita en texto corrido, sin backticks", () => {
    const fugas = fugasDe("Entra a Plantilla (/dt/plantilla) y elige al jugador.\n");
    expect(fugas.map((f: any) => f.texto)).toEqual(["/dt/plantilla"]);
  });

  it("no confunde 'Hasta/Desde' ni barras dentro de palabras con una ruta", () => {
    expect(fugasDe("Completa Desde/Hasta y vuelve a Logros.\n")).toEqual([]);
  });

  it("avisa de todos los términos técnicos de un mismo texto, no solo del primero", () => {
    const fugas = fugasDe("Usa React 19 y Zod.\n");
    expect(fugas.map((f: any) => f.texto)).toEqual(["React 19", "Zod"]);
  });
});

describe("fichas reales", () => {
  it("ninguna ficha publica fugas técnicas en su capa pública", async () => {
    const fichas = cargarFichas(leerRoles());
    expect(fichas.length).toBeGreaterThan(0);
    const avisos: string[] = [];
    for (const ficha of fichas) {
      const capitulo = await procesarFicha(ficha, { resolverImagenes: false });
      for (const f of capitulo.fugas) avisos.push(`${f.archivo}:${f.linea} "${f.texto}" (${f.motivo})`);
    }
    expect(avisos).toEqual([]);
  });
});

describe("Word (.docx)", () => {
  async function generar() {
    const buffer: Buffer = await renderizarManualDocx({
      rol: { titulo: "Manual de prueba", subtitulo: "Subtítulo", audiencia: "Todos" },
      capitulos: [],
      introduccion: { titulo: "Introducción", bloques: [] },
      versionApp: "0.0.0",
      fechaTexto: "1 de enero de 2026",
    } as any);
    return JSZip.loadAsync(buffer);
  }

  it("no pide actualizar campos al abrir: sin updateFields en settings.xml", async () => {
    const zip = await generar();
    const settings = await zip.file("word/settings.xml")!.async("string");
    expect(settings).not.toContain("updateFields");
  });

  it("el campo del índice no está marcado como sucio (Word también preguntaría por eso)", async () => {
    const zip = await generar();
    const documento = await zip.file("word/document.xml")!.async("string");
    expect(documento).toContain("TOC");
    expect(documento).not.toContain('w:dirty="true"');
  });
});
