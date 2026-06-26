import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { categoriasDelDt } from "@/services/dt-scope";
import { listarPlantilla, listarJugadoresGestion } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";

/**
 * Exporta el total de jugadores a Excel. DT (sus categorías, solo ACTIVOS),
 * Escuela (su tenant) y Súper Admin (escuela indicada). Las celdas de datos de
 * usuario se protegen contra inyección de fórmulas (CSV/Excel injection).
 */

const CABECERAS = [
  "Apellido",
  "Nombre",
  "Categoría",
  "Posición",
  "Dorsal",
  "Estado",
  "Código jugador",
  "Familia",
  "Email familia",
] as const;

interface FilaExport {
  apellido: string;
  nombre: string;
  categoria: string;
  posicion: string;
  dorsal: string;
  estado: string;
  codigo: string;
  familia: string;
  email: string;
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

async function filasParaActor(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ escuelaId: string; filas: FilaExport[] }> {
  if (ctx.rol === "DT") {
    const { escuelaId: id, categoriaIds } = await categoriasDelDt(ctx);
    const jugadores = await listarPlantilla(id, categoriaIds); // ACTIVOS
    return {
      escuelaId: id,
      filas: jugadores.map((j) => ({
        apellido: j.apellido,
        nombre: j.nombre,
        categoria: j.categoria.nombre,
        posicion: j.posicion,
        dorsal: j.dorsal != null ? String(j.dorsal) : "",
        estado: j.estado,
        codigo: j.codigoJugador ?? "",
        familia: "",
        email: "",
      })),
    };
  }

  // Escuela / Súper Admin: todos los jugadores de la escuela (todos los estados
  // salvo ELIMINADO), con vínculo de familia.
  const id = escuelaObjetivo(ctx, escuelaId);
  const jugadores = await listarJugadoresGestion(id, {
    estados: ["PENDIENTE", "ACTIVO", "INACTIVO"],
  });
  return {
    escuelaId: id,
    filas: jugadores.map((j) => {
      const familia = j.padre ?? j.cuentaUser;
      return {
        apellido: j.apellido,
        nombre: j.nombre,
        categoria: j.categoria.nombre,
        posicion: j.posicion,
        dorsal: j.dorsal != null ? String(j.dorsal) : "",
        estado: j.estado,
        codigo: j.codigoJugador ?? "",
        familia: j.padre?.nombre ?? "",
        email: familia?.email ?? "",
      };
    }),
  };
}

/** Genera el .xlsx con todos los jugadores del alcance del actor. */
export async function exportarJugadores(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const { escuelaId: id, filas } = await filasParaActor(ctx, escuelaId);
  const escuela = await obtenerEscuela(id);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();
  const ws = wb.addWorksheet("Jugadores");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };
  for (const f of filas) {
    ws.addRow([
      protegerCelda(f.apellido),
      protegerCelda(f.nombre),
      protegerCelda(f.categoria),
      f.posicion,
      f.dorsal,
      f.estado,
      f.codigo,
      protegerCelda(f.familia),
      protegerCelda(f.email),
    ]);
  }
  ws.columns.forEach((c) => {
    c.width = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `jugadores-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
