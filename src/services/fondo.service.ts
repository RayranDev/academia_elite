import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant, requirePermiso } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { listarHijos } from "@/repositories/jugador.repository";
import { listarProgresosJugador } from "@/repositories/progreso.repository";
import {
  listarFondos,
  fondosDesbloqueadosDe,
  registrarDesbloqueos,
  obtenerFondo,
  equiparFondoJugador,
  logrosCodigosDeJugador,
  logrosPorCodigos,
  codigoFondoExiste,
  crearFondo,
  actualizarFondo,
  eliminarFondo,
  fondoEnUso,
} from "@/repositories/fondo.repository";
import { codigoLogroExiste } from "@/repositories/logro.repository";
import { registrarAuditoria } from "@/services/audit.service";
import type { FondoCrearInput, FondoEditarInput } from "@/lib/validators/fondo";
import {
  HABITOS,
  xpTotal,
  nivelPersonal,
  type SemanaHabitos,
} from "@/lib/progreso/engine";
import {
  fondoDesbloqueado,
  requisitoTexto,
  type EstadoMeritos,
} from "@/lib/fondos";
import type { Nivel } from "@/types";

type Hijo = Awaited<ReturnType<typeof listarHijos>>[number];

export interface FondoDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estilo: string;
  desbloqueado: boolean;
  equipado: boolean;
  requisito: string;
}

/** Carga el jugador y verifica que el usuario es su responsable. */
async function cargarHijo(ctx: AuthContext, jugadorId?: string): Promise<Hijo> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) {
    throw new NotFoundError("No hay jugadores vinculados a tu cuenta.");
  }
  const elegido = jugadorId ? hijos.find((h) => h.id === jugadorId) : hijos[0];
  if (!elegido) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, elegido.escuelaId);
  return elegido;
}

function aHabitos(row: Record<string, unknown>): SemanaHabitos {
  return Object.fromEntries(HABITOS.map((h) => [h, Boolean(row[h])])) as SemanaHabitos;
}

/** Reúne los méritos del jugador: logros, nivel de carta y nivel personal. */
async function estadoMeritos(hijo: Hijo): Promise<EstadoMeritos> {
  const [logros, progresos] = await Promise.all([
    logrosCodigosDeJugador(hijo.id),
    listarProgresosJugador(hijo.escuelaId, hijo.id),
  ]);
  const nivelP = nivelPersonal(xpTotal(progresos.map(aHabitos))).nivel;
  return {
    logros: new Set(logros.map((l) => l.logro.codigo)),
    nivelCarta: (hijo.stats[0]?.nivel ?? null) as Nivel | null,
    nivelPersonal: nivelP,
  };
}

/**
 * Catálogo de fondos para el jugador, con su estado (desbloqueado/equipado) y
 * el requisito que falta. Persiste los desbloqueos nuevos (una vez logrados, se
 * conservan aunque luego baje el nivel).
 */
export async function listarFondosJugador(
  ctx: AuthContext,
  jugadorId?: string,
): Promise<{ jugadorId: string; fondos: FondoDTO[] }> {
  const hijo = await cargarHijo(ctx, jugadorId);
  const [catalogo, estado, desbloqueadosRows] = await Promise.all([
    listarFondos(),
    estadoMeritos(hijo),
    fondosDesbloqueadosDe(hijo.id),
  ]);

  const codigosLogro = catalogo
    .filter((f) => f.requisitoTipo === "LOGRO" && f.requisitoValor)
    .map((f) => f.requisitoValor as string);
  const nombrePorCodigo = new Map(
    (await logrosPorCodigos(codigosLogro)).map((l) => [l.codigo, l.nombre]),
  );

  const yaDesbloqueados = new Set(desbloqueadosRows.map((d) => d.fondoId));

  // Calcula el estado y detecta desbloqueos nuevos para persistirlos.
  const nuevos: string[] = [];
  const fondos: FondoDTO[] = catalogo.map((f) => {
    const cumpleAhora = fondoDesbloqueado(f, estado);
    const desbloqueado = cumpleAhora || yaDesbloqueados.has(f.id);
    if (cumpleAhora && !yaDesbloqueados.has(f.id)) nuevos.push(f.id);
    return {
      id: f.id,
      codigo: f.codigo,
      nombre: f.nombre,
      descripcion: f.descripcion,
      estilo: f.estilo,
      desbloqueado,
      equipado: hijo.fondoEquipadoId === f.id,
      requisito: requisitoTexto(f, f.requisitoValor ? nombrePorCodigo.get(f.requisitoValor) : undefined),
    };
  });

  if (nuevos.length > 0) await registrarDesbloqueos(hijo.id, nuevos);

  return { jugadorId: hijo.id, fondos };
}

/** Equipa un fondo desbloqueado (o lo quita con `null`). */
export async function equiparFondo(
  ctx: AuthContext,
  jugadorId: string,
  fondoId: string | null,
): Promise<void> {
  const hijo = await cargarHijo(ctx, jugadorId);

  if (fondoId === null) {
    const res = await equiparFondoJugador(ctx.escuelaId, hijo.id, null);
    if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
    return;
  }

  const fondo = await obtenerFondo(fondoId);
  if (!fondo) throw new NotFoundError("Fondo no encontrado.");

  // Debe estar desbloqueado (cumple requisito ahora o ya lo tenía registrado).
  const estado = await estadoMeritos(hijo);
  const desbloqueadosRows = await fondosDesbloqueadosDe(hijo.id);
  const desbloqueado =
    fondoDesbloqueado(fondo, estado) ||
    desbloqueadosRows.some((d) => d.fondoId === fondoId);
  if (!desbloqueado) {
    throw new ValidationError("Aún no has desbloqueado ese fondo.");
  }

  const res = await equiparFondoJugador(ctx.escuelaId, hijo.id, fondoId);
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
}

export interface FondoCatalogoDTO {
  codigo: string;
  nombre: string;
  estilo: string;
  colorTexto: string | null;
}

/** Catálogo de fondos (estilos) para el simulador del Súper Admin. */
export async function listarCatalogoFondos(
  ctx: AuthContext,
): Promise<FondoCatalogoDTO[]> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const fondos = await listarFondos();
  return fondos.map((f) => ({
    codigo: f.codigo,
    nombre: f.nombre,
    estilo: f.estilo,
    colorTexto: f.colorTexto,
  }));
}

/** Estilo del fondo equipado por el jugador (para pintar la carta). null si no. */
export async function estiloFondoEquipado(hijo: Hijo): Promise<string | null> {
  if (!hijo.fondoEquipadoId) return null;
  const fondo = await obtenerFondo(hijo.fondoEquipadoId);
  return fondo?.estilo ?? null;
}

// --- Laboratorio de fondos (Súper Admin) ---

export interface FondoAdminDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estilo: string;
  colorTexto: string | null;
  requisitoTipo: string;
  requisitoValor: string | null;
  orden: number;
}

/** Catálogo completo de fondos para administrarlos (solo Súper Admin). */
export async function listarFondosAdmin(ctx: AuthContext): Promise<FondoAdminDTO[]> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const fondos = await listarFondos();
  return fondos.map((f) => ({
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    estilo: f.estilo,
    colorTexto: f.colorTexto,
    requisitoTipo: f.requisitoTipo,
    requisitoValor: f.requisitoValor,
    orden: f.orden,
  }));
}

/** Si el requisito es LOGRO, el código debe existir en el catálogo de logros. */
async function validarRequisitoLogro(
  requisitoTipo: string,
  requisitoValor: string | null,
): Promise<void> {
  if (requisitoTipo === "LOGRO") {
    if (!requisitoValor || !(await codigoLogroExiste(requisitoValor))) {
      throw new ValidationError("El logro indicado no existe en el catálogo.");
    }
  }
}

/** Crea un fondo en el catálogo global (Súper Admin). */
export async function crearFondoAdmin(
  ctx: AuthContext,
  data: FondoCrearInput,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  if (await codigoFondoExiste(data.codigo)) {
    throw new ValidationError("Ya existe un fondo con ese código.");
  }
  await validarRequisitoLogro(data.requisitoTipo, data.requisitoValor);
  const creado = await crearFondo({
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    estilo: data.estilo,
    colorTexto: data.colorTexto,
    requisitoTipo: data.requisitoTipo,
    requisitoValor: data.requisitoTipo === "SIEMPRE" ? null : data.requisitoValor,
    orden: data.orden,
  });
  await registrarAuditoria(ctx, {
    accion: "FONDO_CREAR",
    entidad: "FondoCarta",
    entidadId: creado.id,
    motivo: data.codigo,
  });
}

/** Edita un fondo existente (Súper Admin). El código es inmutable. */
export async function editarFondoAdmin(
  ctx: AuthContext,
  data: FondoEditarInput,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const fondo = await obtenerFondo(data.fondoId);
  if (!fondo) throw new NotFoundError("Fondo no encontrado.");
  await validarRequisitoLogro(data.requisitoTipo, data.requisitoValor);
  await actualizarFondo(data.fondoId, {
    nombre: data.nombre,
    descripcion: data.descripcion,
    estilo: data.estilo,
    colorTexto: data.colorTexto,
    requisitoTipo: data.requisitoTipo,
    requisitoValor: data.requisitoTipo === "SIEMPRE" ? null : data.requisitoValor,
    orden: data.orden,
  });
  await registrarAuditoria(ctx, {
    accion: "FONDO_EDITAR",
    entidad: "FondoCarta",
    entidadId: data.fondoId,
  });
}

/** Elimina un fondo. Se bloquea si algún jugador lo usa (equipado o desbloqueado). */
export async function eliminarFondoAdmin(
  ctx: AuthContext,
  fondoId: string,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_CATALOGOS");
  const fondo = await obtenerFondo(fondoId);
  if (!fondo) throw new NotFoundError("Fondo no encontrado.");
  if (await fondoEnUso(fondoId)) {
    throw new ValidationError(
      "No se puede eliminar: hay jugadores que lo tienen equipado o desbloqueado.",
    );
  }
  await eliminarFondo(fondoId);
  await registrarAuditoria(ctx, {
    accion: "FONDO_ELIMINAR",
    entidad: "FondoCarta",
    entidadId: fondoId,
    motivo: fondo.codigo,
  });
}
