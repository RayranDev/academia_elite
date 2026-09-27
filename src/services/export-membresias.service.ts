import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import ExcelJS from "exceljs";
import { protegerCelda } from "@/lib/xlsx";
import { listarMembresias } from "@/repositories/membresia.repository";
import { listarJugadoresGestion } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { estadoEfectivo } from "@/lib/cobranza";
import { diaDeISO, hoyISO } from "@/lib/fecha-calendario";
import { ESTADOS_MEMBRESIA } from "@/lib/validators/membresia";

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
  "Concepto",
  "Estado",
  "Monto",
  "Descuento",
  "Neto",
  "Pagada el",
  "Medio de pago",
  "Referencia",
  "Acceso",
] as const;

/** `Decimal` de Prisma → número plano para la celda de Excel. */
function aNumero(valor: { toString(): string } | null): number | null {
  return valor == null ? null : Number(valor.toString());
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

export async function exportarMembresias(
  ctx: AuthContext,
  opciones: { escuelaId?: string; estado?: string; periodo?: string } = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const escuelaId = escuelaObjetivo(ctx, opciones.escuelaId);
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  // El estado se valida ACÁ y no solo en la página: este servicio lo alimenta un
  // route handler, o sea un borde HTTP (§6). Un `?estado=PAGADO` mal tipeado
  // devolvía una planilla vacía en vez de un error, y quien la abría concluía
  // que no hay nada para cobrar.
  //
  // Va ANTES de la auditoría: el AuditLog es el registro de lo que pasó, y una
  // entrada de "alguien exportó datos de menores" por un pedido que se rechazó
  // ensucia justo la traza que alguien va a mirar durante un incidente.
  if (opciones.estado && !(ESTADOS_MEMBRESIA as readonly string[]).includes(opciones.estado)) {
    throw new ValidationError("Estado de cuota desconocido.");
  }

  // Los exports descargan datos de menores: quedan en el AuditLog (§5.1).
  await registrarAuditoria(ctx, {
    accion: "EXPORT_MEMBRESIAS",
    entidad: "Membresia",
    entidadId: escuelaId,
    escuelaId,
  });

  const [membresias, jugadores] = await Promise.all([
    listarMembresias(escuelaId, { periodo: opciones.periodo }),
    listarJugadoresGestion(escuelaId, {
      estados: ["PENDIENTE", "ACTIVO", "INACTIVO"],
      take: 100_000,
    }),
  ]);
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  // El estado que filtra y el que se muestra son el DERIVADO
  // (`estadoEfectivo`), no la columna cruda: una cuota PENDIENTE de un
  // período ya cerrado se ve como Vencida en la lista (A.3), y el export
  // tiene que decir lo mismo que la pantalla, no menos.
  const hoy = new Date();
  const filtradas = opciones.estado
    ? membresias.filter((m) => estadoEfectivo(m.estado, m.periodo, hoy) === opciones.estado)
    : membresias;

  const wb = new ExcelJS.Workbook();
  // El nombre del tenant, no el de la escuela demo: hasta acá se stampaba
  // "Academia Élite" en la planilla de cobranza de todas las escuelas.
  wb.creator = escuela.nombre;
  wb.created = new Date();
  const ws = wb.addWorksheet("Cobranza");
  ws.addRow([...CABECERAS]);
  ws.getRow(1).font = { bold: true };

  // El total suma el NETO (monto − descuento): es la plata que la escuela
  // realmente espera, no el precio de lista.
  let totalNeto = 0;
  for (const m of filtradas) {
    const j = porId.get(m.jugadorId);
    const familia = j?.padre ?? j?.cuentaUser ?? null;
    const bloqueado = j?.padre?.bloqueado || j?.cuentaUser?.bloqueado;
    const monto = aNumero(m.monto);
    const descuento = aNumero(m.descuento);
    const neto = monto == null ? null : monto - (descuento ?? 0);
    if (neto != null) totalNeto += neto;
    ws.addRow([
      protegerCelda(j ? `${j.apellido}, ${j.nombre}` : "—"),
      protegerCelda(j?.categoria.nombre ?? "—"),
      protegerCelda(j?.padre?.nombre ?? ""),
      protegerCelda(familia?.email ?? ""),
      m.periodo,
      protegerCelda(m.conceptoCobro.nombre),
      estadoEfectivo(m.estado, m.periodo, hoy),
      monto ?? "",
      descuento ?? "",
      neto ?? "",
      // `pagadaEn` es DÍA DE ALMANAQUE (medianoche UTC del día de la escuela,
      // igual que `Pago.fechaPago` — ver `membresia.repository.ts`), no un
      // instante: se corta el ISO, no se convierte de zona. Convertirlo con
      // `diaEscuelaDe` (que sí espera un instante) corría la fecha un día para
      // atrás en Colombia, porque medianoche UTC ya es la tarde del día
      // anterior ahí.
      m.pagadaEn ? diaDeISO(m.pagadaEn.toISOString()) : "",
      m.medioPago ?? "",
      protegerCelda(m.referenciaPago ?? ""),
      bloqueado ? "Bloqueado" : "Activo",
    ]);
  }

  // Fila TOTAL al pie: es un resumen para el que cobra.
  const total = ws.addRow([
    "", "", "", "", "", "", "", "", "TOTAL", totalNeto, "", "", "", "",
  ]);
  total.font = { bold: true };

  ws.columns.forEach((c) => {
    c.width = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  const fecha = hoyISO().replaceAll("-", "");
  return {
    filename: `cobranza-${escuela.slug}-${fecha}.xlsx`,
    buffer: Buffer.from(buf),
  };
}
