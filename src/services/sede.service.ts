import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarSedes,
  crearSede,
  obtenerSede,
  crearCancha,
} from "@/repositories/sede.repository";

export interface SedeDTO {
  id: string;
  nombre: string;
  direccion: string | null;
  canchas: { id: string; nombre: string }[];
}

export async function listarSedesEscuela(
  ctx: AuthContext,
): Promise<SedeDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarSedes(escuelaId);
  return rows.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    direccion: s.direccion,
    canchas: s.canchas.map((c) => ({ id: c.id, nombre: c.nombre })),
  }));
}

export async function crearSedeEscuela(
  ctx: AuthContext,
  data: { nombre: string; direccion?: string },
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  await crearSede(escuelaId, data);
}

export async function crearCanchaEscuela(
  ctx: AuthContext,
  sedeId: string,
  nombre: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  // Verifica que la sede pertenece al tenant antes de crear la cancha.
  const sede = await obtenerSede(escuelaId, sedeId);
  if (!sede) throw new NotFoundError("Sede no encontrada.");
  await crearCancha(sedeId, nombre);
}
