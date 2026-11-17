import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Aprobar/rechazar solicitudes de alta (DT). Se mockea SOLO el cliente Prisma y
 * el alcance del DT: repositorio, servicio y auditoría corren de verdad. Un DT
 * solo resuelve solicitudes PENDIENTES; inactivar/reactivar a un jugador ya
 * resuelto es gestión de la escuela (con motivo y auditoría).
 */
const { db, jugador } = vi.hoisted(() => {
  const jugador = { id: "j1", categoriaId: "cat1", estado: "PENDIENTE" };
  const db = {
    jugador: {
      findFirst: vi.fn(async (_args: unknown) => jugador as typeof jugador | null),
      updateMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
    },
    auditLog: { create: vi.fn(async (_args: unknown) => ({})) },
  };
  return { db, jugador };
});

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@/services/dt-scope", () => ({
  categoriasDelDt: vi.fn(async () => ({
    escuelaId: "esc1",
    entrenadorId: "dt1",
    categoriaIds: ["cat1"],
  })),
  requireDtScope: vi.fn(),
}));

import type { AuthContext } from "@/lib/auth/context";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { aprobarSolicitud, rechazarSolicitud } from "@/services/jugador.service";

const dt: AuthContext = {
  userId: "u-dt",
  rol: "DT",
  escuelaId: "esc1",
  entrenadorId: "dt1",
};

beforeEach(() => {
  vi.clearAllMocks();
  jugador.categoriaId = "cat1";
  jugador.estado = "PENDIENTE";
  db.jugador.findFirst.mockResolvedValue(jugador);
  db.jugador.updateMany.mockResolvedValue({ count: 1 });
});

describe("aprobar / rechazar una solicitud pendiente", () => {
  it("aprobar pasa a ACTIVO solo desde PENDIENTE y lo audita", async () => {
    await aprobarSolicitud(dt, "j1");

    const arg = db.jugador.updateMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    // Compare-and-set: el WHERE exige PENDIENTE, así una carrera no pisa nada.
    expect(arg.where).toEqual({ id: "j1", escuelaId: "esc1", estado: "PENDIENTE" });
    expect(arg.data).toEqual({ estado: "ACTIVO" });

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const { data } = db.auditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(data).toMatchObject({
      actorId: "u-dt",
      actorRol: "DT",
      accion: "APROBAR_SOLICITUD",
      entidad: "Jugador",
      entidadId: "j1",
      escuelaId: "esc1",
    });
  });

  it("rechazar pasa a INACTIVO y audita RECHAZAR_SOLICITUD", async () => {
    await rechazarSolicitud(dt, "j1");

    const arg = db.jugador.updateMany.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data).toEqual({ estado: "INACTIVO" });
    const { data } = db.auditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(data).toMatchObject({ accion: "RECHAZAR_SOLICITUD", entidadId: "j1" });
  });
});

describe("un jugador que ya no está pendiente no se puede resolver", () => {
  for (const estado of ["ACTIVO", "INACTIVO", "ELIMINADO"]) {
    it(`rechazar a un jugador ${estado} falla y no cambia ni audita nada`, async () => {
      jugador.estado = estado;
      await expect(rechazarSolicitud(dt, "j1")).rejects.toThrow(ValidationError);
      expect(db.jugador.updateMany).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
    });

    it(`aprobar a un jugador ${estado} falla y no cambia ni audita nada`, async () => {
      jugador.estado = estado;
      await expect(aprobarSolicitud(dt, "j1")).rejects.toThrow(ValidationError);
      expect(db.jugador.updateMany).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
    });
  }

  it("si otra request lo resolvió entre la lectura y el cambio, falla sin auditar", async () => {
    db.jugador.updateMany.mockResolvedValue({ count: 0 });
    await expect(aprobarSolicitud(dt, "j1")).rejects.toThrow(ValidationError);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("el mensaje al DT es claro", async () => {
    jugador.estado = "ACTIVO";
    await expect(rechazarSolicitud(dt, "j1")).rejects.toThrow(
      "Esta solicitud ya no está pendiente.",
    );
  });
});

describe("alcance del DT", () => {
  it("un jugador de otra categoría o escuela es NotFound y no se toca", async () => {
    jugador.categoriaId = "cat-ajena";
    await expect(aprobarSolicitud(dt, "j1")).rejects.toThrow(NotFoundError);
    db.jugador.findFirst.mockResolvedValue(null);
    await expect(rechazarSolicitud(dt, "j1")).rejects.toThrow(NotFoundError);
    expect(db.jugador.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});
