import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarCatalogo,
  obtenerLogro,
  codigoLogroExiste,
  crearLogro,
  actualizarLogro,
  listarConfigLogrosEscuela,
  configurarLogroEscuela,
  otorgarLogroJugador,
  jugadorTieneLogro,
} from "@/repositories/logro.repository";
import { obtenerJugador } from "@/repositories/jugador.repository";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import { notificar } from "@/services/notificacion.service";
import {
  logroAplicaAPosicion,
  logroDisponibleParaEscuela,
  type VentanaLogro,
} from "@/lib/logros";
import type { LogroCrearInput, LogroVentanaInput } from "@/lib/validators/logro";

// Catálogo y gestión de logros (G6).

export interface LogroCatalogoDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  statBonus: string | null;
  valorBonus: number | null;
  repetible: boolean;
  posicion: string | null;
  activo: boolean;
  esPropio: boolean; // creado por la escuela (no global)
  // configuración por escuela (solo en la vista del DT)
  escuelaActivo?: boolean;
  desde?: string | null;
  hasta?: string | null;
  disponibleAhora?: boolean;
}

type LogroRow = NonNullable<Awaited<ReturnType<typeof obtenerLogro>>>;

function aDTO(l: LogroRow): LogroCatalogoDTO {
  return {
    id: l.id,
    codigo: l.codigo,
    nombre: l.nombre,
    descripcion: l.descripcion,
    tipo: l.tipo,
    statBonus: l.statBonus,
    valorBonus: l.valorBonus,
    repetible: l.repetible,
    posicion: l.posicion,
    activo: l.activo,
    esPropio: l.escuelaId != null,
  };
}

/** Catálogo global completo (Súper Admin). */
export async function listarCatalogoAdmin(
  ctx: AuthContext,
): Promise<LogroCatalogoDTO[]> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const rows = await listarCatalogo();
  return rows.map(aDTO);
}

/** Crea un logro en el catálogo global (Súper Admin) o propio (DT). */
async function crearLogroComun(
  ctx: AuthContext,
  data: LogroCrearInput,
  escuelaId: string | null,
): Promise<void> {
  if (await codigoLogroExiste(data.codigo)) {
    throw new ValidationError("Ya existe un logro con ese código.");
  }
  const creado = await crearLogro({
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    tipo: data.tipo,
    statBonus: data.tipo === "BONUS" ? data.statBonus : null,
    valorBonus: data.tipo === "BONUS" ? data.valorBonus : null,
    repetible: data.repetible,
    icono: data.icono,
    posicion: data.posicion,
    escuelaId,
  });
  await registrarAuditoria(ctx, {
    accion: "CREAR_LOGRO",
    entidad: "Logro",
    entidadId: creado.id,
    escuelaId,
  });
}

export async function crearLogroAdmin(
  ctx: AuthContext,
  data: LogroCrearInput,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  await crearLogroComun(ctx, data, null);
}

export async function editarLogroAdmin(
  ctx: AuthContext,
  logroId: string,
  data: { nombre: string; descripcion: string },
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const logro = await obtenerLogro(logroId);
  if (!logro) throw new NotFoundError("Logro no encontrado.");
  await actualizarLogro(logroId, data);
  await registrarAuditoria(ctx, {
    accion: "EDITAR_LOGRO",
    entidad: "Logro",
    entidadId: logroId,
    escuelaId: logro.escuelaId,
  });
}

export async function activarLogroAdmin(
  ctx: AuthContext,
  logroId: string,
  activo: boolean,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const logro = await obtenerLogro(logroId);
  if (!logro) throw new NotFoundError("Logro no encontrado.");
  await actualizarLogro(logroId, { activo });
  await registrarAuditoria(ctx, {
    accion: activo ? "ACTIVAR_LOGRO" : "DESACTIVAR_LOGRO",
    entidad: "Logro",
    entidadId: logroId,
    escuelaId: logro.escuelaId,
  });
}

/** Catálogo aplicable a la escuela del DT, con su configuración/ventanas. */
export async function listarCatalogoDt(
  ctx: AuthContext,
): Promise<LogroCatalogoDTO[]> {
  const { escuelaId } = await categoriasDelDt(ctx);
  const [rows, configs] = await Promise.all([
    listarCatalogo(escuelaId),
    listarConfigLogrosEscuela(escuelaId),
  ]);
  const porLogro = new Map(configs.map((c) => [c.logroId, c]));
  const ahora = new Date();
  return rows.map((l) => {
    const config = porLogro.get(l.id) ?? null;
    return {
      ...aDTO(l),
      escuelaActivo: config?.activo ?? true,
      desde: config?.desde?.toISOString() ?? null,
      hasta: config?.hasta?.toISOString() ?? null,
      disponibleAhora: logroDisponibleParaEscuela(l, escuelaId, config, ahora),
    };
  });
}

/** Activa/desactiva y programa la ventana de un logro para la escuela (DT). */
export async function configurarLogroDt(
  ctx: AuthContext,
  data: LogroVentanaInput,
): Promise<void> {
  const { escuelaId } = await categoriasDelDt(ctx);
  const logro = await obtenerLogro(data.logroId);
  if (!logro || (logro.escuelaId && logro.escuelaId !== escuelaId)) {
    throw new NotFoundError("Logro no encontrado.");
  }
  await configurarLogroEscuela(escuelaId, logro.id, {
    activo: data.activo,
    desde: data.desde,
    hasta: data.hasta,
  });
  await registrarAuditoria(ctx, {
    accion: "CONFIGURAR_LOGRO_ESCUELA",
    entidad: "Logro",
    entidadId: logro.id,
    escuelaId,
  });
}

/** Crea un logro propio de la escuela (DT). */
export async function crearLogroDt(
  ctx: AuthContext,
  data: LogroCrearInput,
): Promise<void> {
  const { escuelaId } = await categoriasDelDt(ctx);
  await crearLogroComun(ctx, data, escuelaId);
}

/**
 * Otorga manualmente un logro a un jugador de las categorías del DT.
 * Respeta posición, disponibilidad/ventana y repetibilidad. Notifica a la
 * familia (vía dispatcher) y queda auditado.
 */
export async function otorgarLogroDt(
  ctx: AuthContext,
  jugadorId: string,
  logroId: string,
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);

  const [jugador, logro, configs] = await Promise.all([
    obtenerJugador(escuelaId, jugadorId),
    obtenerLogro(logroId),
    listarConfigLogrosEscuela(escuelaId),
  ]);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  if (jugador.estado !== "ACTIVO") {
    throw new ValidationError("Solo se otorgan logros a jugadores activos.");
  }
  if (!logro) throw new NotFoundError("Logro no encontrado.");

  const config = (configs.find((c) => c.logroId === logro.id) ??
    null) as VentanaLogro | null;
  if (!logroDisponibleParaEscuela(logro, escuelaId, config, new Date())) {
    throw new ValidationError("Ese logro no está disponible ahora para tu escuela.");
  }
  if (!logroAplicaAPosicion(logro.posicion, jugador.posicion)) {
    throw new ValidationError("Ese logro no aplica a la posición del jugador.");
  }
  if (!logro.repetible && (await jugadorTieneLogro(jugador.id, logro.id))) {
    throw new ValidationError("El jugador ya tiene ese logro.");
  }

  const creado = await otorgarLogroJugador(escuelaId, jugador.id, logro.id);

  // Notifica a la familia (INAPP hoy; EMAIL/WHATSAPP cuando existan canales).
  const destinos = [jugador.padreUserId, jugador.cuentaUserId].filter(
    (v): v is string => !!v,
  );
  await notificar(destinos, {
    tipo: "LOGRO",
    titulo: `¡Nuevo logro: ${logro.nombre}!`,
    cuerpo:
      logro.tipo === "BONUS"
        ? `${jugador.nombre} ganó "${logro.nombre}". El bonus se aplicará en su próxima evaluación.`
        : `${jugador.nombre} ganó la insignia "${logro.nombre}".`,
    url: "/jugador/logros",
  });

  await registrarAuditoria(ctx, {
    accion: "OTORGAR_LOGRO",
    entidad: "LogroJugador",
    entidadId: creado.id,
    escuelaId,
    motivo: `${logro.codigo} → ${jugador.nombre} ${jugador.apellido}`,
  });
}
