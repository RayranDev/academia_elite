import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { marcaDeTiempo, respaldarAnterior } from "../../scripts/manuales/lib/respaldo.mjs";

describe("respaldarAnterior", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "respaldo-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("no hace nada si el archivo todavía no existe", () => {
    expect(respaldarAnterior(path.join(dir, "Manual_X.docx"))).toBeNull();
    expect(fs.existsSync(path.join(dir, "anteriores"))).toBe(false);
  });

  it("copia el anterior a anteriores/ con la fecha y la hora, sin tocar el original", () => {
    const ruta = path.join(dir, "Manual_X.docx");
    fs.writeFileSync(ruta, "version vieja");
    const copia = respaldarAnterior(ruta, { ahora: new Date(2026, 9, 19, 14, 5, 9) });
    expect(copia).toBe(path.join(dir, "anteriores", "Manual_X_20261019-140509.docx"));
    expect(fs.readFileSync(copia as string, "utf8")).toBe("version vieja");
    expect(fs.readFileSync(ruta, "utf8")).toBe("version vieja");
  });

  it("conserva solo las últimas copias, borrando las más viejas", () => {
    const ruta = path.join(dir, "Manual_X.pdf");
    for (let i = 1; i <= 7; i++) {
      fs.writeFileSync(ruta, `v${i}`);
      respaldarAnterior(ruta, { ahora: new Date(2026, 9, i, 10, 0, 0), max: 3 });
    }
    const quedan = fs.readdirSync(path.join(dir, "anteriores")).sort();
    expect(quedan).toEqual([
      "Manual_X_20261005-100000.pdf",
      "Manual_X_20261006-100000.pdf",
      "Manual_X_20261007-100000.pdf",
    ]);
  });

  it("la poda de un archivo no toca las copias de otro (docx vs pdf)", () => {
    const docx = path.join(dir, "Manual_X.docx");
    const pdf = path.join(dir, "Manual_X.pdf");
    fs.writeFileSync(docx, "d");
    fs.writeFileSync(pdf, "p");
    respaldarAnterior(docx, { ahora: new Date(2026, 9, 1, 8, 0, 0), max: 1 });
    respaldarAnterior(docx, { ahora: new Date(2026, 9, 2, 8, 0, 0), max: 1 });
    respaldarAnterior(pdf, { ahora: new Date(2026, 9, 1, 8, 0, 0), max: 1 });
    expect(fs.readdirSync(path.join(dir, "anteriores")).sort()).toEqual([
      "Manual_X_20261002-080000.docx",
      "Manual_X_20261001-080000.pdf",
    ].sort());
  });

  it("la marca de tiempo ordena cronológicamente como texto", () => {
    expect(marcaDeTiempo(new Date(2026, 0, 2, 3, 4, 5))).toBe("20260102-030405");
    expect(marcaDeTiempo(new Date(2026, 11, 31, 23, 59, 59)) > marcaDeTiempo(new Date(2026, 0, 2, 3, 4, 5))).toBe(true);
  });
});
