import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { listarCategorias } from "@/repositories/categoria.repository";
import { listarPlantilla } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { eventosParaMatrizAsistencia } from "@/repositories/gestion-deportiva.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { porcentaje } from "@/lib/evaluacion";

/**
 * Exporta la asistencia a Excel como MATRIZ (PLAN-UX-DT PR-5 §5.1): una hoja por
 * categoría, jugadores en filas y fechas en columnas, con P/A/J/T por celda
 * (T = presente pero llegó tarde). Cierra con una columna "%" por jugador y una
 * fila "%" por sesión. Escuela (su tenant) y Súper Admin (con sesión de soporte).
 */

// Ventana del export: el año anterior. Suficiente para una temporada completa
// sin traerse un historial infinito.
const VENTANA_DIAS = 365;

type MarcaCelda = "P" | "A" | "J" | "T" | "";

function marca(a: {
  presente: boolean;
  justificado: boolean;
  llegoTarde: boolean;
}): MarcaCelda {
  if (a.presente) return a.llegoTarde ? "T" : "P";
  return a.justificado ? "J" : "A";
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

export async function exportarAsistencia(
  ctx: AuthContext,
  opciones: { escuelaId?: string } = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const escuelaId = escuelaObjetivo(ctx, opciones.escuelaId);
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  // Descarga de datos de menores → AuditLog (§5.1).
  await registrarAuditoria(ctx, {
    accion: "EXPORT_ASISTENCIA",
    entidad: "Asistencia",
    entidadId: escuelaId,
    escuelaId,
  });

  const desde = new Date(Date.now() - VENTANA_DIAS * 24 * 60 * 60 * 1000);
  const [categorias, eventos] = await Promise.all([
    listarCategorias(escuelaId),
    eventosParaMatrizAsistencia(escuelaId, desde),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Elite";
  wb.created = new Date();

  for (const categoria of categorias) {
    const jugadores = await listarPlantilla(escuelaId, [categoria.id]);
    const eventosCat = eventos.filter((e) => e.categoriaId === categoria.id);

    // Nombre de hoja: Excel no admite algunos caracteres ni > 31 chars.
    const nombreHoja = categoria.nombre.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
    const ws = wb.addWorksheet(nombreHoja || "Categoría");

    const fechas = eventosCat.map((e) => format(new Date(e.inicio), "dd/MM"));
    ws.addRow(["Jugador", ...fechas, "%"]);
    ws.getRow(1).font = { bold: true };

    // Marca por (jugadorId, eventoId) para armar la fila de cada jugador.
    const porJugadorEvento = new Map<string, MarcaCelda>();
    for (const e of eventosCat) {
      for (const a of e.asistencias) {
        porJugadorEvento.set(`${a.jugadorId}:${e.id}`, marca(a));
      }
    }

    // Presentes por sesión (para la fila % del pie).
    const presentesPorEvento = new Map<string, number>();

    for (const j of jugadores) {
      let presentes = 0;
      const celdas: MarcaCelda[] = eventosCat.map((e) => {
        const m = porJugadorEvento.get(`${j.id}:${e.id}`) ?? "";
        if (m === "P" || m === "T") {
          presentes += 1;
          presentesPorEvento.set(e.id, (presentesPorEvento.get(e.id) ?? 0) + 1);
        }
        return m;
      });
      ws.addRow([
        protegerCelda(`${j.apellido}, ${j.nombre}`),
        ...celdas,
        eventosCat.length ? `${porcentaje(presentes, eventosCat.length)}%` : "—",
      ]);
    }

    // Fila de % por sesión al pie (sobre el total de jugadores de la categoría).
    if (jugadores.length > 0 && eventosCat.length > 0) {
      const fila = eventosCat.map(
        (e) => `${porcentaje(presentesPorEvento.get(e.id) ?? 0, jugadores.length)}%`,
      );
      const total = ws.addRow(["% presentes", ...fila, ""]);
      total.font = { bold: true };
    }

    ws.getColumn(1).width = 26;
    for (let i = 2; i <= fechas.length + 2; i++) ws.getColumn(i).width = 8;
  }

  // Si no hubo ninguna categoría, dejamos una hoja informativa (Excel exige ≥1).
  if (wb.worksheets.length === 0) {
    wb.addWorksheet("Sin datos").addRow(["No hay categorías con asistencia."]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const fecha = format(new Date(), "yyyyMMdd");
  return {
    filename: `asistencia-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
