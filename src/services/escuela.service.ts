import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import {
  listarEscuelasGlobal,
  slugExisteGlobal,
  emailExisteGlobal,
} from "@/repositories/escuela.repository";
import { obtenerLeadGlobal } from "@/repositories/lead.repository";
import type { ConvertirLeadInput } from "@/lib/validators/admin";

export interface EscuelaDTO {
  id: string;
  nombre: string;
  slug: string;
  colorPrimario: string;
  activa: boolean;
  jugadores: number;
  categorias: number;
  usuarios: number;
  createdAt: string;
}

export async function listarEscuelas(ctx: AuthContext): Promise<EscuelaDTO[]> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarEscuelasGlobal();
  return rows.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    colorPrimario: e.colorPrimario,
    activa: e.activa,
    jugadores: e._count.jugadores,
    categorias: e._count.categorias,
    usuarios: e._count.users,
    createdAt: e.createdAt.toISOString(),
  }));
}

/**
 * Convierte un lead en una escuela funcional con su ESCUELA_ADMIN.
 * Atómico: escuela + usuario admin + cambio de estado del lead + auditoría.
 * Devuelve la contraseña temporal (se muestra UNA vez; nunca se almacena en claro).
 */
export async function convertirLeadEnEscuela(
  ctx: AuthContext,
  input: ConvertirLeadInput,
): Promise<{ escuelaId: string; adminEmail: string; passwordTemporal: string }> {
  requireRole(ctx, ["SUPER_ADMIN"]);

  const lead = await obtenerLeadGlobal(input.leadId);
  if (!lead) throw new NotFoundError("Lead no encontrado.");
  if (lead.estado === "CONVERTIDO") {
    throw new ValidationError("Este lead ya fue convertido.");
  }
  if (await slugExisteGlobal(input.slug)) {
    throw new ValidationError("Ese slug ya está en uso por otra escuela.");
  }
  if (await emailExisteGlobal(input.adminEmail)) {
    throw new ValidationError("Ya existe un usuario con ese email.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  const escuelaId = await db.$transaction(async (tx) => {
    const escuela = await tx.escuela.create({
      data: { nombre: input.nombreEscuela, slug: input.slug },
    });
    await tx.user.create({
      data: {
        email: input.adminEmail,
        passwordHash,
        nombre: input.adminNombre,
        rol: "ESCUELA_ADMIN",
        escuelaId: escuela.id,
      },
    });
    await tx.lead.update({
      where: { id: input.leadId },
      data: { estado: "CONVERTIDO" },
    });
    await tx.auditLog.create({
      data: {
        actorId: ctx.userId,
        actorRol: ctx.rol,
        accion: "CONVERTIR_LEAD",
        entidad: "Escuela",
        entidadId: escuela.id,
        escuelaId: escuela.id,
        motivo: `Lead ${input.leadId} → escuela "${input.nombreEscuela}"`,
      },
    });
    return escuela.id;
  });

  return { escuelaId, adminEmail: input.adminEmail, passwordTemporal };
}
