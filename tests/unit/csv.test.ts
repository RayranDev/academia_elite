import { describe, it, expect } from "vitest";
import { parseCsv, aCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("detecta el delimitador coma", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("detecta el delimitador punto y coma (Excel es-CO)", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("quita el BOM UTF-8 inicial", () => {
    const filas = parseCsv("﻿nombre;apellido\nLucas;García");
    expect(filas[0]).toEqual(["nombre", "apellido"]);
  });

  it("respeta comillas con delimitador y comillas escapadas", () => {
    const filas = parseCsv('a;"b;c";"d""e"\n1;2;3');
    expect(filas[0]).toEqual(["a", "b;c", 'd"e']);
  });

  it("ignora filas totalmente vacías", () => {
    expect(parseCsv("a;b\n\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("aCsv", () => {
  it("serializa con BOM y entrecomilla lo necesario", () => {
    const out = aCsv([
      ["nombre", "nota"],
      ["Lucas", "dice; hola"],
    ]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain('"dice; hola"');
  });

  it("ida y vuelta conserva los datos", () => {
    const filas = [
      ["nombre", "apellido", "nota"],
      ["Ana", "Pérez", 'con "comillas"'],
    ];
    const reparsed = parseCsv(aCsv(filas));
    expect(reparsed).toEqual(filas);
  });
});
