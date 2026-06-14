import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { listarAuditGlobal } from "@/repositories/audit.repository";

/**
 * Exporta el AuditLog a Excel (solo SUPER_ADMIN; opcional filtrar por escuela).
 * Lee del repositorio directo para incluir `actorId` (trazabilidad real), que el
 * DTO de la UI omite. Las celdas con texto libre (`motivo`) se protegen contra
 * inyección de fórmulas (CSV/Excel injection).
 */

const CABECERAS = [
  "Fecha",
  "Acción",
  "Entidad",
  "Entidad ID",
  "Actor (rol)",
  "Actor ID",
  "Escuela ID",
  "Motivo",
] as const;

// Límite alto para que el export sea útil como histórico (la UI muestra 200).
const TOPE_EXPORT = 5000;

export async function exportarAuditoria(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarAuditGlobal({ escuelaId, take: TOPE_EXPORT });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Fútbol Career Mode";
  wb.created = new Date();
  const ws = wb.addWorksheet("Auditoría");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow([
      format(r.createdAt, "yyyy-MM-dd HH:mm:ss"),
      r.accion,
      r.entidad,
      r.entidadId,
      r.actorRol,
      r.actorId,
      r.escuelaId ?? "",
      protegerCelda(r.motivo ?? ""),
    ]);
  }
  ws.columns.forEach((c) => {
    c.width = 20;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `auditoria-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
