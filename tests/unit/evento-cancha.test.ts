import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La cancha del formulario de eventos solo vale si es de una sede de la escuela
 * del DT: sin esto, quien conociera el id de una cancha ajena la asignaba a su
 * evento y su nombre se mostraba luego a las familias. Se mockea SOLO el cliente
 * Prisma y el alcance del DT.
 */
const { db } = vi.hoisted(() => {
  const evento = {
    id: "ev1",
    categoriaId: "cat1",
    tipo: "OTRO",
    titulo: "Reunión",
    cancelado: false,
    periodo: "NO_INICIADO",
    sesionCerradaAt: null as Date | null,
    inicio: new Date("2099-01-01T10:00:00Z"),
    fin: new Date("2099-01-01T11:00:00Z"),
    convocados: [] as { jugadorId: string }[],
  };
  const db = {
    cancha: {
      findFirst: vi.fn(async (_args: unknown) => null as { id: string } | null),
    },
    evento: {
      create: vi.fn(async (_args: unknown) => ({ id: "nuevo" })),
      findFirst: vi.fn(async (_args: unknown) => evento),
      updateMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
    },
  };
  return { db };
});

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@/services/dt-scope", () => ({
  categoriasDelDt: vi.fn(async () => ({
    escuelaId: "esc1",
    entrenadorId: "dt1",
    categoriaIds: ["cat1"],
  })),
}));

vi.mock("@/services/notificacion.service", () => ({ notificar: vi.fn() }));

import type { AuthContext } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/errors";
import { crearEventoDt, editarEventoDt } from "@/services/evento.service";
import type { EventoInput, EditarEventoInput } from "@/lib/validators/evento";

const dt: AuthContext = {
  userId: "u-dt",
  rol: "DT",
  escuelaId: "esc1",
  entrenadorId: "dt1",
};

const nuevo = (canchaId?: string): EventoInput =>
  ({
    categoriaId: "cat1",
    tipo: "OTRO",
    titulo: "Reunión",
    canchaId,
    inicio: new Date("2099-01-01T10:00:00Z"),
    fin: new Date("2099-01-01T11:00:00Z"),
  }) as EventoInput;

const edicion = (canchaId?: string): EditarEventoInput =>
  ({
    titulo: "Reunión",
    canchaId,
    inicio: new Date("2099-01-01T10:00:00Z"),
    fin: new Date("2099-01-01T11:00:00Z"),
  }) as EditarEventoInput;

beforeEach(() => {
  vi.clearAllMocks();
  db.cancha.findFirst.mockResolvedValue(null);
});

describe("canchaId al crear un evento", () => {
  it("rechaza una cancha que no es de la escuela y no crea el evento", async () => {
    await expect(crearEventoDt(dt, nuevo("cancha-ajena"))).rejects.toThrow(
      NotFoundError,
    );
    expect(db.evento.create).not.toHaveBeenCalled();
  });

  it("busca la cancha acotada por la escuela (a través de su sede)", async () => {
    await expect(crearEventoDt(dt, nuevo("cancha-ajena"))).rejects.toThrow();
    const arg = db.cancha.findFirst.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ id: "cancha-ajena", sede: { escuelaId: "esc1" } });
  });

  it("acepta una cancha de la escuela", async () => {
    db.cancha.findFirst.mockResolvedValue({ id: "c1" });
    await crearEventoDt(dt, nuevo("c1"));
    const arg = db.evento.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data).toMatchObject({ escuelaId: "esc1", canchaId: "c1" });
  });

  it("sin cancha no consulta nada y guarda null", async () => {
    await crearEventoDt(dt, nuevo(""));
    expect(db.cancha.findFirst).not.toHaveBeenCalled();
    const arg = db.evento.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.canchaId).toBeNull();
  });
});

describe("canchaId al editar un evento", () => {
  it("rechaza una cancha ajena y no edita", async () => {
    await expect(editarEventoDt(dt, "ev1", edicion("cancha-ajena"))).rejects.toThrow(
      NotFoundError,
    );
    expect(db.evento.updateMany).not.toHaveBeenCalled();
  });

  it("acepta una cancha de la escuela", async () => {
    db.cancha.findFirst.mockResolvedValue({ id: "c1" });
    await editarEventoDt(dt, "ev1", edicion("c1"));
    const arg = db.evento.updateMany.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data).toMatchObject({ canchaId: "c1" });
  });
});
