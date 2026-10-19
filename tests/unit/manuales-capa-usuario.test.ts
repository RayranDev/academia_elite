import { marked } from "marked";
import { describe, expect, it } from "vitest";
import { sintetizarBloques } from "../../scripts/manuales/lib/bloques.mjs";
import {
  anotarLineas,
  filtrarCapaUsuario,
  motivoDeFuga,
  neutralizarFugas,
  parsearVerificacion,
  textoPlano,
} from "../../scripts/manuales/lib/capa-usuario.mjs";

const FICHA = `# Logros

> Verificado en la versión 0.1.0 (\`6882787\`) el 2026-10-19 por Agente de Manuales.

**Para qué sirve:** Gestionar logros.

---

## Controles

| N.º | Control | Qué hace | Verificado |
|---|---|---|:---:|
| 1 | **Filtrar** | Filtra la lista. | Sí |
| 2 | **Crear logro** | Guarda el logro. | Sí |

## Errores y situaciones frecuentes

- Si falla, reintenta.

## Comportamientos conocidos

1. Detalle interno.

### Subsección interna

Texto interno.

## Registro de verificación

- **Fecha:** 2026-10-19
`;

// Los tokens de marked no tienen tipos útiles aquí: trabajamos con `any` a propósito.
/* eslint-disable @typescript-eslint/no-explicit-any */
function lex(md: string): any[] {
  return anotarLineas(marked.lexer(md));
}

describe("filtrarCapaUsuario", () => {
  it("quita el blockquote de verificación y devuelve versión, sha y fecha", () => {
    const { tokens, verificacion } = filtrarCapaUsuario(lex(FICHA));

    expect(verificacion).toEqual({ version: "0.1.0", sha: "6882787", fecha: "2026-10-19" });
    expect(tokens.some((t: any) => t.type === "blockquote")).toBe(false);
  });

  it("quita las secciones internas con todo su contenido, incluidos los subencabezados", () => {
    const { tokens, seccionesOmitidas } = filtrarCapaUsuario(lex(FICHA));
    const h2 = tokens
      .filter((t: any) => t.type === "heading" && t.depth === 2)
      .map((t: any) => textoPlano(t.tokens));

    expect(h2).toEqual(["Controles", "Errores y situaciones frecuentes"]);
    expect(seccionesOmitidas).toEqual(["Comportamientos conocidos", "Registro de verificación"]);
    expect(JSON.stringify(tokens)).not.toContain("Detalle interno");
    expect(JSON.stringify(tokens)).not.toContain("Texto interno");
  });

  it("reconoce el encabezado aunque cambien tildes o mayúsculas", () => {
    const { tokens } = filtrarCapaUsuario(
      lex("# X\n\n## REGISTRO DE VERIFICACION\n\ntexto\n\n## Notas internas\n\nmás\n"),
    );
    expect(tokens.filter((t: any) => t.type === "heading").length).toBe(1);
  });

  it("quita la columna Verificado de las tablas y conserva las demás", () => {
    const { tokens } = filtrarCapaUsuario(lex(FICHA));
    const tabla = tokens.find((t: any) => t.type === "table");

    expect(tabla.header.map((c: any) => c.text)).toEqual(["N.º", "Control", "Qué hace"]);
    expect(tabla.rows[0].map((c: any) => c.text)).toEqual(["1", "**Filtrar**", "Filtra la lista."]);
    expect(tabla.align).toHaveLength(3);
    expect(JSON.stringify([tabla.header, tabla.rows])).not.toContain("Sí");
    expect(JSON.stringify([tabla.header, tabla.rows])).not.toContain("Verificado");
  });

  it("no modifica la tabla original", () => {
    const tokens = lex(FICHA);
    const antes = tokens.find((t: any) => t.type === "table").header.length;
    filtrarCapaUsuario(tokens);
    expect(tokens.find((t: any) => t.type === "table").header.length).toBe(antes);
  });

  it("elimina los separadores horizontales", () => {
    const { tokens } = filtrarCapaUsuario(lex(FICHA));
    expect(tokens.some((t: any) => t.type === "hr")).toBe(false);
  });
});

describe("parsearVerificacion", () => {
  it("devuelve null si el texto no es una verificación", () => {
    expect(parsearVerificacion("Un texto cualquiera")).toBeNull();
  });
});

describe("motivoDeFuga", () => {
  it.each([
    ["/dt/jugadores/[id]"],
    ['role="alert"'],
    ['step="0.01"'],
    ["linear-gradient(...)"],
    ["textoSeguro"],
    ["escuelaId"],
    ["border-brand/50"],
    ["select"],
    ["button en lista"],
  ])("%s es una fuga", (texto) => {
    expect(motivoDeFuga(texto)).not.toBeNull();
  });

  it.each(["ESPIRITU_COMPETITIVO", "4.92", "General (todas)", "Todas las posiciones", "RIT", "Pendiente", "POR"])(
    "%s es contenido legítimo para el usuario",
    (texto) => {
      expect(motivoDeFuga(texto)).toBeNull();
    },
  );
});

describe("neutralizarFugas", () => {
  it("convierte los spans con fuga en texto plano, avisa con ficha y línea, y respeta los legítimos", () => {
    const md =
      "Línea uno.\n\nVe a **Logros** (`/dt/logros`) y escribe `ESPIRITU_COMPETITIVO`.\n\nValidado con `textoSeguro`.\n";
    const { tokens } = filtrarCapaUsuario(lex(md));
    const fugas = neutralizarFugas(tokens, { archivo: "docs/manuales/fuentes/x/y.md", desplazamiento: 6 });

    expect(fugas.map((f: any) => [f.archivo, f.linea, f.texto])).toEqual([
      ["docs/manuales/fuentes/x/y.md", 9, "/dt/logros"],
      ["docs/manuales/fuentes/x/y.md", 11, "textoSeguro"],
    ]);

    const spans: string[] = [];
    const visitar = (t: any) => {
      if (t.type === "codespan") spans.push(String(t.text));
      t.tokens?.forEach(visitar);
    };
    tokens.forEach(visitar);
    expect(spans).toEqual(["ESPIRITU_COMPETITIVO"]);
    expect(textoPlano(tokens[1].tokens)).toContain("(/dt/logros)");
  });

  it("ubica la línea correcta dentro de una tabla", () => {
    const md = '| A | B |\n|---|---|\n| uno | `select` |\n| dos | `role="alert"` |\n';
    const { tokens } = filtrarCapaUsuario(lex(md));
    const fugas = neutralizarFugas(tokens, { archivo: "f.md", desplazamiento: 0 });
    expect(fugas.map((f: any) => f.linea)).toEqual([3, 4]);
  });

  it("avisa de términos técnicos sueltos sin modificarlos", () => {
    const { tokens } = filtrarCapaUsuario(lex("El formulario usa React 19 y Zod.\n"));
    const fugas = neutralizarFugas(tokens, { archivo: "f.md" });
    expect(fugas.map((f: any) => f.texto)).toEqual(["React 19", "Zod"]);
  });
});

describe("sintetizarBloques", () => {
  it("une imagen y pie en una figura sin el prefijo numerado", () => {
    const { tokens } = filtrarCapaUsuario(lex("![Captura](../img/a.png)\n\n*Figura 7: Vista general.*\n"));
    const bloques = sintetizarBloques(tokens);

    expect(bloques).toHaveLength(1);
    expect(bloques[0].type).toBe("figura");
    expect(bloques[0].href).toBe("../img/a.png");
    expect(textoPlano(bloques[0].leyenda)).toBe("Vista general.");
  });

  it("convierte Importante / Ojo / Advertencia en recuadros", () => {
    const { tokens } = filtrarCapaUsuario(
      lex("> **Importante:** Guarda antes de salir.\n\n> **Advertencia:** No se puede deshacer.\n\n> Una cita normal.\n"),
    );
    const bloques = sintetizarBloques(tokens);

    expect(bloques.map((b: any) => b.type)).toEqual(["callout", "callout", "blockquote"]);
    expect(bloques[0].tipo).toBe("importante");
    expect(bloques[1].tipo).toBe("advertencia");
    expect(textoPlano(bloques[0].tokens[0].tokens).trim()).toBe("Guarda antes de salir.");
  });
});
