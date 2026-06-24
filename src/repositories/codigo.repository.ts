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

// Búsqueda global por código (registro público, antes de tener tenant).
export function obtenerCodigoPorValor(codigo: string) {
  // tenant-global: registro público por código único, antes de resolver el tenant
  return db.codigoInvitacion.findUnique({ where: { codigo } });
}
