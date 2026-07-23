import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { listarMembresias } from "@/repositories/membresia.repository";
import { listarJugadoresGestion } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";

/**
 * Exporta la cobranza (cuotas / mora) a Excel: es el listado que el dueño usa
 * para llamar a cobrar (PLAN-UX-DT PR-5 §5.1). Escuela (su tenant) y Súper Admin
 * (con sesión de soporte sobre esa escuela). Datos de usuario protegidos contra
 * inyección de fórmulas.
 */

const CABECERAS = [
  "Jugador",
  "Categoría",
  "Familia",
  "Email familia",
  "Período",
  "Estado",
  "Monto",
  "Acceso",
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

export async function exportarMembresias(
  ctx: AuthContext,
  opciones: { escuelaId?: string; estado?: string; periodo?: string } = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const escuelaId = escuelaObjetivo(ctx, opciones.escuelaId);
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  // Los exports descargan datos de menores: quedan en el AuditLog (§5.1).
  await registrarAuditoria(ctx, {
    accion: "EXPORT_MEMBRESIAS",
    entidad: "Membresia",
    entidadId: escuelaId,
    escuelaId,
  });

  const [membresias, jugadores] = await Promise.all([
    listarMembresias(escuelaId, opciones.periodo),
    listarJugadoresGestion(escuelaId, {
      estados: ["PENDIENTE", "ACTIVO", "INACTIVO"],
      take: 100_000,
    }),
  ]);
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  const filtradas = opciones.estado
    ? membresias.filter((m) => m.estado === opciones.estado)
    : membresias;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();
  const ws = wb.addWorksheet("Cobranza");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };

  let totalMonto = 0;
  for (const m of filtradas) {
    const j = porId.get(m.jugadorId);
    const familia = j?.padre ?? j?.cuentaUser ?? null;
    const bloqueado = j?.padre?.bloqueado || j?.cuentaUser?.bloqueado;
    totalMonto += m.monto ?? 0;
    ws.addRow([
      protegerCelda(j ? `${j.apellido}, ${j.nombre}` : "—"),
      protegerCelda(j?.categoria.nombre ?? "—"),
      protegerCelda(j?.padre?.nombre ?? ""),
      protegerCelda(familia?.email ?? ""),
      m.periodo,
      m.estado,
      m.monto ?? "",
      bloqueado ? "Bloqueado" : "Activo",
    ]);
  }

  // Fila TOTAL al pie: es un resumen para el que cobra.
  const total = ws.addRow(["", "", "", "", "", "TOTAL", totalMonto, ""]);
  total.font = { bold: true };

  ws.columns.forEach((c) => {
    c.width = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `cobranza-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
