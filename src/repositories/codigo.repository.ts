import { db } from "@/lib/db";

// Repositorio de códigos de invitación (Capa 4). Firma con escuelaId.
export function listarCodigos(escuelaId: string) {
  return db.codigoInvitacion.findMany({
    where: { escuelaId },
    orderBy: { activo: "desc" },
  });
}

export function crearCodigo(
  escuelaId: string,
  data: {
    categoriaId: string;
    codigo: string;
    usosMaximos: number;
    expiraEn: Date;
  },
) {
  return db.codigoInvitacion.create({ data: { escuelaId, ...data } });
}

export function desactivarCodigo(escuelaId: string, id: string) {
  return db.codigoInvitacion.updateMany({
    where: { id, escuelaId },
    data: { activo: false },
  });
}
