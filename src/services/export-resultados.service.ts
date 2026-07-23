import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { partidosParaExport } from "@/repositories/gestion-deportiva.repository";
import { registrarAuditoria } from "@/services/audit.service";

/**
 * Exporta los resultados de partidos a Excel (PLAN-UX-DT PR-5 §5.1). Hoja 1:
 * un partido por fila (fecha, categoría, rival, local/visita, marcador y R/E/G).
 * Hoja 2: la línea individual de cada jugador por partido. Escuela (su tenant) y
 * Súper Admin (con sesión de soporte).
 */

const CABECERAS_PARTIDOS = [
  "Fecha",
  "Categoría",
  "Partido",
  "Condición",
  "Marcador",
  "Resultado",
] as const;

const CABECERAS_STATS = [
  "Fecha",
  "Categoría",
  "Partido",
  "Jugador",
  "Minutos",
  "Goles",
  "Asistencias",
  "Amarillas",
  "Roja",
] as const;

function escuelaObjetivo(ctx: AuthContext, escuelaId?: string): string {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  if (ctx.rol === "SUPER_ADMIN") {
    if (!escuelaId) throw new ValidationError("Falta la escuela.");
    // PII de un tenant: el SA solo accede con sesión de soporte activa (M2).
    assertTenant(ctx, escuelaId);
    return escuelaId;
  }
  return requireEscuela(ctx);
}

/** Resultado desde la óptica del equipo propio (respetando esLocal). */
function signoResultado(
  esLocal: boolean | null,
  local: number,
  visitante: number,
): "Ganó" | "Empató" | "Perdió" {
  const propio = esLocal === false ? visitante : local;
  const ajeno = esLocal === false ? local : visitante;
  if (propio > ajeno) return "Ganó";
  if (propio < ajeno) return "Perdió";
  return "Empató";
}

export async function exportarResultados(
  ctx: AuthContext,
  opciones: { escuelaId?: string } = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const escuelaId = escuelaObjetivo(ctx, opciones.escuelaId);
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  await registrarAuditoria(ctx, {
    accion: "EXPORT_RESULTADOS",
    entidad: "Evento",
    entidadId: escuelaId,
    escuelaId,
  });

  const partidos = await partidosParaExport(escuelaId);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();

  const wsP = wb.addWorksheet("Partidos");
  wsP.addRow([...CABECERAS_PARTIDOS]);
  wsP.getRow(1).font = { bold: true };

  const wsS = wb.addWorksheet("Estadísticas");
  wsS.addRow([...CABECERAS_STATS]);
  wsS.getRow(1).font = { bold: true };

  for (const p of partidos) {
    const local = p.resultadoLocal ?? 0;
    const visitante = p.resultadoVisitante ?? 0;
    const fecha = format(new Date(p.inicio), "dd/MM/yyyy");
    const nombrePartido = p.rival
      ? `${p.esLocal === false ? "@" : "vs"} ${p.rival}`
      : p.titulo;
    // El marcador se muestra desde la óptica propia: mi equipo primero.
    const propio = p.esLocal === false ? visitante : local;
    const ajeno = p.esLocal === false ? local : visitante;

    wsP.addRow([
      fecha,
      protegerCelda(p.categoria.nombre),
      protegerCelda(nombrePartido),
      p.esLocal === false ? "Visitante" : "Local",
      `${propio}-${ajeno}`,
      signoResultado(p.esLocal, local, visitante),
    ]);

    for (const s of p.estadisticas) {
      wsS.addRow([
        fecha,
        protegerCelda(p.categoria.nombre),
        protegerCelda(nombrePartido),
        protegerCelda(`${s.jugador.apellido}, ${s.jugador.nombre}`),
        s.minutos,
        s.goles,
        s.asistencias,
        s.amarillas,
        s.roja ? "Sí" : "",
      ]);
    }
  }

  wsP.columns.forEach((c) => {
    c.width = 18;
  });
  wsS.columns.forEach((c) => {
    c.width = 16;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `resultados-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
