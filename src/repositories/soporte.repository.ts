import { db } from "@/lib/db";

// Repositorio de sesiones de soporte (Capa 4, ROL-SUPER-ADMIN.md M2). Estas
// sesiones pertenecen al SUPER_ADMIN (se consultan por superAdminId o por id de
// sesión), no a una escuela: no son datos operativos de un tenant.

/** Sesión de soporte activa (sin finalizar) del súper admin, si existe. */
export function sesionActivaDe(superAdminId: string) {
  return db.soporteSesion.findFirst({
    where: { superAdminId, finalizadaEn: null },
    orderBy: { iniciadaEn: "desc" },
  });
}

/** Cierra cualquier sesión abierta del súper admin (idempotente). */
export function cerrarSesionesAbiertas(superAdminId: string) {
  return db.soporteSesion.updateMany({
    where: { superAdminId, finalizadaEn: null },
    data: { finalizadaEn: new Date() },
  });
}

/** Crea una nueva sesión de soporte (por defecto en solo-lectura). */
export function crearSesion(data: {
  superAdminId: string;
  escuelaId: string;
  motivo: string;
  soloLectura: boolean;
}) {
  return db.soporteSesion.create({ data });
}

/** Finaliza una sesión activa (idempotente: solo si sigue abierta). */
export function finalizarSesion(id: string, superAdminId: string) {
  return db.soporteSesion.updateMany({
    where: { id, superAdminId, finalizadaEn: null },
    data: { finalizadaEn: new Date() },
  });
}

/** Habilita la escritura en una sesión activa (de solo-lectura a escritura). */
export function habilitarEscritura(id: string, superAdminId: string) {
  return db.soporteSesion.updateMany({
    where: { id, superAdminId, finalizadaEn: null },
    data: { soloLectura: false },
  });
}
