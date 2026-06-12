import { describe, it, expect } from "vitest";
import { parseXlsx, plantillaJugadoresXlsx } from "@/lib/xlsx";
import ExcelJS from "exceljs";

describe("parseXlsx / plantillaJugadoresXlsx", () => {
  it("la plantilla generada se vuelve a leer como matriz", async () => {
    const buffer = await plantillaJugadoresXlsx({
      cabeceras: ["nombre", "apellido", "fechaNacimiento", "posicion", "dorsal", "categoria"],
      ejemplo: ["Lucas", "García", "2014-03-15", "DEL", "9", "Sub-10"],
      escuelaNombre: "Demo",
      categorias: ["Sub-8", "Sub-10"],
    });
    const filas = await parseXlsx(buffer);
    expect(filas[0]).toEqual([
      "nombre", "apellido", "fechaNacimiento", "posicion", "dorsal", "categoria",
    ]);
    expect(filas[1].slice(0, 4)).toEqual(["Lucas", "García", "2014-03-15", "DEL"]);
  });

  it("ignora filas vacías y conserva el resto", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Jugadores");
    ws.addRow(["nombre", "apellido"]);
    ws.addRow(["", ""]); // vacía → se ignora
    ws.addRow(["Ana", "Pérez"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    const filas = await parseXlsx(buf);
    expect(filas).toEqual([
      ["nombre", "apellido"],
      ["Ana", "Pérez"],
    ]);
  });
});
