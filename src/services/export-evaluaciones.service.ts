import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import {
  listarJugadoresGestion,
  ultimasStatsPorJugadores,
} from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";

/**
 * Exporta el OVR y estado de evaluación de todos los jugadores de la escuela
 * a Excel. Solo ESCUELA_ADMIN y SUPER_ADMIN. Las celdas con datos de usuario
 * se protegen contra inyección de fórmulas (CSV/Excel injection).
 */

const DIA_MS = 24 * 60 * 60 * 1000;

const CABECERAS = [
  "Apellido",
  "Nombre",
  "Categoría",
  "Posición",
  "OVR",
  "Nivel",
  "Última evaluación",
  "Estado evaluación",
] as const;

interface FilaExport {
  apellido: string;
  nombre: string;
  categoria: string;
  posicion: string;
  ovr: number | string;
  nivel: string;
  ultimaEvaluacion: string;
  estadoEvaluacion: string;
}

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

/** Genera el .xlsx con evaluaciones/OVR de todos los jugadores de la escuela. */
export async function exportarEvaluaciones(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const id = escuelaObjetivo(ctx, escuelaId);

  // Fetch en paralelo: escuela y jugadores (todos los estados).
  const [escuela, jugadoresGestion] = await Promise.all([
    obtenerEscuela(id),
    listarJugadoresGestion(id, {
      estados: ["PENDIENTE", "ACTIVO", "INACTIVO"],
    }),
  ]);

  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  // Descarga de datos de menores → AuditLog (§5.1).
  await registrarAuditoria(ctx, {
    accion: "EXPORT_EVALUACIONES",
    entidad: "Evaluacion",
    entidadId: id,
    escuelaId: id,
  });

  // Última carta de CADA jugador (incluye INACTIVO/PENDIENTE que sí fueron
  // evaluados y no aparecen en listarPlantilla). Como viene ordenado por
  // createdAt desc, el primero por jugadorId es el más reciente.
  const statsRows = await ultimasStatsPorJugadores(
    id,
    jugadoresGestion.map((j) => j.id),
  );
  const statsMap = new Map<
    string,
    { ovr: number; nivel: string; createdAt: Date }
  >();
  for (const s of statsRows) {
    if (!statsMap.has(s.jugadorId)) statsMap.set(s.jugadorId, s);
  }

  const frecuencia = escuela.frecuenciaEvaluacionDias ?? 30;
  const ahora = Date.now();

  const filas: FilaExport[] = jugadoresGestion.map((j) => {
    const stats = statsMap.get(j.id) ?? null;

    let estadoEvaluacion: string;
    let ultimaEvaluacion: string;
    let ovr: number | string;
    let nivel: string;

    if (!stats) {
      estadoEvaluacion = "Sin evaluar";
      ultimaEvaluacion = "—";
      ovr = "—";
      nivel = "—";
    } else {
      const vencida =
        ahora - stats.createdAt.getTime() > frecuencia * DIA_MS;
      estadoEvaluacion = vencida ? "Vencida" : "Al día";
      ultimaEvaluacion = format(stats.createdAt, "dd/MM/yyyy");
      ovr = stats.ovr;
      nivel = stats.nivel;
    }

    return {
      apellido: j.apellido,
      nombre: j.nombre,
      categoria: j.categoria.nombre,
      posicion: j.posicion,
      ovr,
      nivel,
      ultimaEvaluacion,
      estadoEvaluacion,
    };
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();
  const ws = wb.addWorksheet("Evaluaciones");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };

  for (const f of filas) {
    ws.addRow([
      protegerCelda(f.apellido),
      protegerCelda(f.nombre),
      protegerCelda(f.categoria),
      f.posicion,
      f.ovr,
      f.nivel,
      f.ultimaEvaluacion,
      f.estadoEvaluacion,
    ]);
  }

  ws.columns.forEach((c) => {
    c.width = 20;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `evaluaciones-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
