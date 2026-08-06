import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarStaff,
  crearStaff,
  actualizarStaff,
  eliminarStaff,
} from "@/repositories/staff.repository";
import type { StaffInput, EditarStaffInput } from "@/lib/validators/staff";

export interface StaffDTO {
  id: string;
  cargo: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export async function listarStaffEscuela(ctx: AuthContext): Promise<StaffDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarStaff(escuelaId);
  return rows.map((s) => ({
    id: s.id,
    cargo: s.cargo,
    nombre: s.nombre,
    telefono: s.telefono,
    email: s.email,
  }));
}

/**
 * Alta de un miembro del staff. Sin `registrarAuditoria`: es un dato
 * administrativo (libreta de contactos del cuerpo técnico) sin impacto
 * financiero ni de acceso, a diferencia de Arancel/Membresía.
 */
export async function crearStaffEscuela(
  ctx: AuthContext,
  input: StaffInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  await crearStaff(escuelaId, {
    cargo: input.cargo,
    nombre: input.nombre,
    // `telefonoOpcional` es `.nullish()` (permite no enviar el campo): se
    // normaliza `undefined` a `null` para la columna, que no distingue "no
    // llegó" de "se borró" (mismo patrón que gestion-jugadores.service.ts).
    telefono: input.telefono ?? null,
    email: input.email ?? null,
  });
}

/** Edita un miembro del staff existente (cargo, nombre, teléfono, email). */
export async function editarStaffEscuela(
  ctx: AuthContext,
  input: EditarStaffInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const { count } = await actualizarStaff(escuelaId, input.id, {
    cargo: input.cargo,
    nombre: input.nombre,
    telefono: input.telefono ?? null,
    email: input.email ?? null,
  });
  if (count === 0) throw new NotFoundError("Staff no encontrado.");
}

/** Borrado físico: sin relaciones entrantes de otra tabla, no hace falta baja lógica. */
export async function eliminarStaffEscuela(
  ctx: AuthContext,
  id: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const { count } = await eliminarStaff(escuelaId, id);
  if (count === 0) throw new NotFoundError("Staff no encontrado.");
}
