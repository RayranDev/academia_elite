import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { listarJugadoresGestion } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";

/**
 * Exporta la nómina de contactos a Excel (PLAN-UX-DT PR-5 §5.1): jugador,
 * nacimiento, categoría y los datos del acudiente (parentesco, teléfono, email)
 * para ligas/federación y emergencias. Escuela (su tenant) y Súper Admin (con
 * sesión de soporte). Datos de menores → protegidos y auditados.
 */

const CABECERAS = [
  "Apellido",
  "Nombre",
  "Nacimiento",
  "Categoría",
  "Acudiente",
  "Parentesco",
  "Teléfono",
  "Email",
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

export async function exportarContactos(
  ctx: AuthContext,
  opciones: { escuelaId?: string } = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const escuelaId = escuelaObjetivo(ctx, opciones.escuelaId);
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  await registrarAuditoria(ctx, {
    accion: "EXPORT_CONTACTOS",
    entidad: "Jugador",
    entidadId: escuelaId,
    escuelaId,
  });

  const jugadores = await listarJugadoresGestion(escuelaId, {
    estados: ["PENDIENTE", "ACTIVO", "INACTIVO"],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();
  const ws = wb.addWorksheet("Contactos");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };

  for (const j of jugadores) {
    // El acudiente es la familia vinculada (padre) o la cuenta propia del jugador.
    const familia = j.padre ?? j.cuentaUser;
    ws.addRow([
      protegerCelda(j.apellido),
      protegerCelda(j.nombre),
      j.fechaNacimiento ? format(new Date(j.fechaNacimiento), "dd/MM/yyyy") : "",
      protegerCelda(j.categoria.nombre),
      protegerCelda(j.padre?.nombre ?? ""),
      protegerCelda(j.parentescoAcudiente ?? ""),
      protegerCelda(familia?.telefono ?? ""),
      protegerCelda(familia?.email ?? ""),
    ]);
  }

  ws.columns.forEach((c) => {
    c.width = 20;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `contactos-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
