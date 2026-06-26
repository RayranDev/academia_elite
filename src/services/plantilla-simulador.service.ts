import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import {
  obtenerConfigSimulador,
  obtenerConfigSimuladorEscuela,
  type ConfigSimulador,
} from "@/services/parametro.service";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { PESOS_POSICION, type GrupoEdad } from "@/lib/stats-engine";
import { POSICIONES } from "@/types";

/**
 * Genera una planilla Excel que replica el motor de stats con FÓRMULAS nativas:
 * al cargar las 12 medidas (+ posición y grupo de edad) calcula RIT…FIS, MEN,
 * OVR y Nivel sola, usando los parámetros elegidos (globales o de una escuela).
 * Solo SUPER_ADMIN. `XLSX_MIME` es el content-type del route.
 */

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

// Hoja "Jugadores": A nombre, B Posición, C GrupoEdad, D..O las 12 medidas,
// P..U los 6 stats, V MEN, W OVR, X Nivel. Helpers ocultos AA..AR.
const CABECERAS = [
  "Nombre",
  "Posición",
  "GrupoEdad",
  "Sprint 30m (s)",
  "Salto (cm)",
  "Agilidad (s)",
  "Yo-Yo (nivel)",
  "Control",
  "Pase",
  "Tiro",
  "Regate",
  "Actitud",
  "Concentración",
  "Trabajo equipo",
  "Resiliencia",
  "RIT",
  "TIR",
  "PAS",
  "REG",
  "DEF",
  "FIS",
  "MEN",
  "OVR",
  "Nivel",
];

export async function generarPlantillaSimulador(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const config: ConfigSimulador = escuelaId
    ? await obtenerConfigSimuladorEscuela(ctx, escuelaId)
    : await obtenerConfigSimulador(ctx);
  const escuela = escuelaId ? await obtenerEscuela(escuelaId) : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();

  // --- Hoja Parametros (fuente de los lookups de las fórmulas) ---
  // Layout fijo: filas 1 (cabecera) y 2..6 (grupos); fila 9 (cabecera pesos) y
  // 10..13 (posiciones); filas 16..19 (escalares). Direcciones absolutas en las
  // fórmulas dependen de este layout.
  const wp = wb.addWorksheet("Parametros");
  wp.getRow(1).values = ["Grupo", "sprintMin", "sprintMax", "saltoMin", "saltoMax", "agiMin", "agiMax", "yoyoMin", "yoyoMax"];
  GRUPOS.forEach((g, i) => {
    const r = config.rangosPorGrupo[g];
    wp.getRow(2 + i).values = [
      g,
      r.sprint30mSeg.min, r.sprint30mSeg.max,
      r.saltoVerticalCm.min, r.saltoVerticalCm.max,
      r.agilidadIllinoisSeg.min, r.agilidadIllinoisSeg.max,
      r.resistenciaYoyoNivel.min, r.resistenciaYoyoNivel.max,
    ];
  });
  wp.getRow(8).values = ["Pesos por posición"];
  wp.getRow(9).values = ["Pos", "wRit", "wTir", "wPas", "wReg", "wDef", "wFis"];
  POSICIONES.forEach((p, i) => {
    const w = PESOS_POSICION[p];
    wp.getRow(10 + i).values = [p, w.rit, w.tir, w.pas, w.reg, w.def, w.fis];
  });
  wp.getRow(16).values = ["pesoMen", config.pesoMen];
  wp.getRow(17).values = ["umbralPlata", config.umbrales.plata];
  wp.getRow(18).values = ["umbralOro", config.umbrales.oro];
  wp.getRow(19).values = ["umbralHeroe", config.umbrales.heroe];
  wp.getColumn(1).width = 18;

  // --- Hoja Jugadores ---
  const ws = wb.addWorksheet("Jugadores");
  ws.addRow(CABECERAS);
  ws.getRow(1).font = { bold: true };

  // Fila de ejemplo (2): inputs realistas + fórmulas. Copiar hacia abajo.
  ws.getCell("A2").value = "Ejemplo (copia esta fila)";
  ws.getCell("B2").value = "DEL";
  ws.getCell("C2").value = "SUB12";
  // Medidas de ejemplo (mismas que la carga masiva).
  const ejemplo: Record<string, number> = {
    D2: 5.2, E2: 34, F2: 17.5, G2: 12, H2: 7, I2: 6, J2: 6, K2: 7, L2: 7, M2: 6, N2: 7, O2: 6,
  };
  for (const [c, v] of Object.entries(ejemplo)) ws.getCell(c).value = v;

  escribirFormulasFila(ws, 2);

  // Anchos.
  ws.columns.forEach((c) => { c.width = 13; });
  ws.getColumn(1).width = 22;
  // Ocultar columnas auxiliares (AA..AR).
  for (let col = 27; col <= 44; col++) ws.getColumn(col).hidden = true;

  // --- Hoja Instrucciones ---
  const wi = wb.addWorksheet("Instrucciones");
  wi.getColumn(1).width = 90;
  const objetivo = escuela ? `escuela "${escuela.nombre}"` : "parámetros predeterminados (global)";
  [
    `Planilla de simulación — ${objetivo}.`,
    "",
    "1. Completá una fila por jugador en la hoja 'Jugadores'.",
    "2. Copiá la fila de ejemplo (fila 2) hacia abajo para que las fórmulas se repliquen.",
    "3. Cargá: Posición (POR/DEF/MED/DEL), GrupoEdad (SUB8/SUB10/SUB12/SUB14/SUB16) y las 12 medidas.",
    "4. Las columnas RIT, TIR, PAS, REG, DEF, FIS, MEN, OVR y Nivel se calculan SOLAS.",
    "5. Los parámetros (rangos por grupo, pesos por posición, peso de MEN y umbrales) viven en la hoja 'Parametros'.",
    "",
    "Nota: es el MISMO motor del simulador. Si abrís el archivo y no recalcula, forzá el recálculo (F9).",
  ].forEach((t) => wi.addRow([t]));

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  const sufijo = escuela ? escuela.slug : "global";
  return {
    filename: `simulador-${sufijo}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}

/** Escribe en la fila `r` las fórmulas (helpers AA..AR + stats P..X). */
function escribirFormulasFila(ws: ExcelJS.Worksheet, r: number): void {
  const f = (addr: string, formula: string) => {
    ws.getCell(addr).value = { formula, result: 0 };
  };
  // Lookups en Parametros.
  const m = `MATCH($C${r},Parametros!$A$2:$A$6,0)`; // fila del grupo
  const idx = (col: string) => `INDEX(Parametros!$${col}$2:$${col}$6,${m})`;
  const mp = `MATCH($B${r},Parametros!$A$10:$A$13,0)`; // fila de la posición
  const wcol = (col: string) => `INDEX(Parametros!$${col}$10:$${col}$13,${mp})`;

  // Normalización física: normal (val-min)/(max-min); inversa (max-val)/(max-min).
  const fisN = (val: string, minC: string, maxC: string) =>
    `ROUND(40+MIN(MAX((${val}-${idx(minC)})/(${idx(maxC)}-${idx(minC)}),0),1)*59,0)`;
  const fisInv = (val: string, minC: string, maxC: string) =>
    `ROUND(40+MIN(MAX((${idx(maxC)}-${val})/(${idx(maxC)}-${idx(minC)}),0),1)*59,0)`;
  const nota = (cell: string) => `MIN(MAX(ROUND(${cell}*9.9,0),1),99)`;
  const clampStat = (expr: string) => `MIN(MAX(ROUND(${expr},0),1),99)`;

  // Helpers ocultos: AA vel, AB pot, AC agi, AD res, AE ctrl, AF pasT, AG tirT,
  // AH regT, AI actN, AJ concN, AK trabN, AL resiN, AM..AR pesos por posición.
  f(`AA${r}`, fisInv(`D${r}`, "B", "C")); // vel (sprint, inverso)
  f(`AB${r}`, fisN(`E${r}`, "D", "E")); // pot (salto)
  f(`AC${r}`, fisInv(`F${r}`, "F", "G")); // agi (agilidad, inverso)
  f(`AD${r}`, fisN(`G${r}`, "H", "I")); // res (yoyo)
  f(`AE${r}`, nota(`H${r}`)); // ctrl
  f(`AF${r}`, nota(`I${r}`)); // pasT
  f(`AG${r}`, nota(`J${r}`)); // tirT
  f(`AH${r}`, nota(`K${r}`)); // regT
  f(`AI${r}`, nota(`L${r}`)); // actitud
  f(`AJ${r}`, nota(`M${r}`)); // concentración
  f(`AK${r}`, nota(`N${r}`)); // trabajo equipo
  f(`AL${r}`, nota(`O${r}`)); // resiliencia
  f(`AM${r}`, wcol("B")); // wRit
  f(`AN${r}`, wcol("C")); // wTir
  f(`AO${r}`, wcol("D")); // wPas
  f(`AP${r}`, wcol("E")); // wReg
  f(`AQ${r}`, wcol("F")); // wDef
  f(`AR${r}`, wcol("G")); // wFis

  // Stats base (derivaStats).
  f(`P${r}`, clampStat(`AA${r}*0.65+AC${r}*0.35`)); // RIT
  f(`Q${r}`, clampStat(`AG${r}*0.75+AB${r}*0.25`)); // TIR
  f(`R${r}`, clampStat(`AF${r}*0.75+AE${r}*0.25`)); // PAS
  f(`S${r}`, clampStat(`AH${r}*0.55+AC${r}*0.25+AE${r}*0.20`)); // REG
  f(`T${r}`, clampStat(`AD${r}*0.45+AB${r}*0.30+AE${r}*0.25`)); // DEF
  f(`U${r}`, clampStat(`AD${r}*0.50+AB${r}*0.35+AA${r}*0.15`)); // FIS
  // MEN = promedio de las 4 notas de mentalidad normalizadas.
  f(`V${r}`, clampStat(`(AI${r}+AJ${r}+AK${r}+AL${r})/4`));
  // OVR = (1-pesoMen)*Σ(stat×wPos) + pesoMen*MEN.
  const pm = "Parametros!$B$16";
  const sumaPos = `P${r}*AM${r}+Q${r}*AN${r}+R${r}*AO${r}+S${r}*AP${r}+T${r}*AQ${r}+U${r}*AR${r}`;
  f(`W${r}`, clampStat(`(1-${pm})*(${sumaPos})+${pm}*V${r}`));
  // Nivel por umbrales.
  f(
    `X${r}`,
    `IF(W${r}>=Parametros!$B$19,"HEROE",IF(W${r}>=Parametros!$B$18,"ORO",IF(W${r}>=Parametros!$B$17,"PLATA","BRONCE")))`,
  );
}
