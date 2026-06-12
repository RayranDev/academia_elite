import ExcelJS from "exceljs";
import { format } from "date-fns";

/**
 * Lectura/escritura de Excel (.xlsx) con exceljs, en servidor. Se usa para la
 * importación masiva de jugadores y su plantilla. Sustituye al CSV anterior
 * (Excel tradicional facilita el llenado a las escuelas).
 */

/** Convierte el valor de una celda a texto plano (fechas → AAAA-MM-DD). */
function celdaTexto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return format(v, "yyyy-MM-dd");
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.text === "string") return o.text.trim();
    if ("result" in o) return String(o.result ?? "").trim();
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("").trim();
    }
    if (o.hyperlink && typeof o.text === "string") return o.text.trim();
    return String(v).trim();
  }
  return String(v).trim();
}

/** Lee la primera hoja de un .xlsx como matriz de filas/columnas (texto). */
export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  // exceljs tipa su propio Buffer; el Buffer de Node encaja en runtime.
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const colCount = Math.max(ws.columnCount, 1);
  const filas: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cols: string[] = [];
    for (let c = 1; c <= colCount; c += 1) {
      cols.push(celdaTexto(row.getCell(c).value));
    }
    filas.push(cols);
  });
  // Descarta filas totalmente vacías.
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

/** Genera la plantilla .xlsx de jugadores (cabeceras + ejemplo + instrucciones). */
export async function plantillaJugadoresXlsx(opts: {
  cabeceras: string[];
  ejemplo: string[];
  escuelaNombre: string;
  categorias: string[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fútbol Career Mode";
  wb.created = new Date();

  const ws = wb.addWorksheet("Jugadores");
  ws.addRow(opts.cabeceras);
  ws.getRow(1).font = { bold: true };
  ws.addRow(opts.ejemplo);
  ws.columns.forEach((col) => {
    col.width = 18;
  });

  const guia = wb.addWorksheet("Instrucciones");
  guia.getColumn(1).width = 60;
  guia.addRow(["Cómo llenar la plantilla"]).font = { bold: true };
  guia.addRow(["1) La fila 1 (cabeceras) no se modifica."]);
  guia.addRow(["2) Posiciones válidas: POR, DEF, MED, DEL."]);
  guia.addRow(["3) Fecha de nacimiento en formato AAAA-MM-DD."]);
  guia.addRow(["4) Dorsal es opcional."]);
  guia.addRow([`5) Categorías válidas de ${opts.escuelaNombre}:`]);
  for (const c of opts.categorias) guia.addRow([`    • ${c}`]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Plantilla .xlsx genérica: cabeceras (negrita) + ejemplo + hoja de ayuda. */
export async function plantillaXlsx(opts: {
  nombreHoja: string;
  cabeceras: string[];
  ejemplo: string[];
  instrucciones: string[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fútbol Career Mode";
  wb.created = new Date();

  const ws = wb.addWorksheet(opts.nombreHoja);
  ws.addRow(opts.cabeceras);
  ws.getRow(1).font = { bold: true };
  ws.addRow(opts.ejemplo);
  ws.columns.forEach((col) => {
    col.width = 16;
  });

  const guia = wb.addWorksheet("Instrucciones");
  guia.getColumn(1).width = 80;
  for (const linea of opts.instrucciones) guia.addRow([linea]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** MIME y extensión del Excel moderno. */
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
