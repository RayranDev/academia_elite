import { describe, expect, it } from "vitest";
import { parsearFrontMatter } from "../../scripts/manuales/lib/frontmatter.mjs";

describe("parsearFrontMatter", () => {
  it("lee texto, número y lista de rutas", () => {
    const texto = [
      "---",
      "rol: entrenador",
      "modulo: Mediciones y evaluación",
      "orden: 4",
      'rutas: ["/dt/plantilla", "/dt/jugadores/[id]", "/dt/jugadores/[id]/evaluar"]',
      "---",
      "",
      "# Mediciones y evaluación",
    ].join("\n");

    const { datos, cuerpo, lineasFrontMatter } = parsearFrontMatter(texto);

    expect(datos.rol).toBe("entrenador");
    expect(datos.modulo).toBe("Mediciones y evaluación");
    expect(datos.orden).toBe(4);
    expect(datos.rutas).toEqual(["/dt/plantilla", "/dt/jugadores/[id]", "/dt/jugadores/[id]/evaluar"]);
    expect(lineasFrontMatter).toBe(6);
    expect(cuerpo.trimStart().startsWith("# Mediciones")).toBe(true);
  });

  it("acepta fin de línea CRLF y comillas simples en las listas", () => {
    const texto = "---\r\nrol: jugador\r\norden: 6\r\nrutas: ['/jugador/logros']\r\n---\r\n# Logros\r\n";
    const { datos, cuerpo } = parsearFrontMatter(texto);
    expect(datos.rol).toBe("jugador");
    expect(datos.rutas).toEqual(["/jugador/logros"]);
    expect(cuerpo).not.toContain("\r");
  });

  it("devuelve datos vacíos y el texto intacto si no hay front-matter", () => {
    const { datos, cuerpo, lineasFrontMatter } = parsearFrontMatter("# Logros\n\nTexto");
    expect(datos).toEqual({});
    expect(cuerpo).toBe("# Logros\n\nTexto");
    expect(lineasFrontMatter).toBe(0);
  });

  it("no confunde un bloque sin cierre con front-matter", () => {
    const { datos, lineasFrontMatter } = parsearFrontMatter("---\nrol: dt\n# Sin cierre");
    expect(datos).toEqual({});
    expect(lineasFrontMatter).toBe(0);
  });

  it("admite lista vacía", () => {
    const { datos } = parsearFrontMatter("---\nrutas: []\n---\n");
    expect(datos.rutas).toEqual([]);
  });
});
