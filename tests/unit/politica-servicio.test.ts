import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Aceptación de la Política en el primer ingreso de la familia. Se mockea SOLO el
 * cliente Prisma: repositorio y servicio corren de verdad (rol, sellado
 * compare-and-set, idempotencia y auditoría), no un doble.
 */
const { db } = vi.hoisted(() => {
  const db = {
    user: {
      findUnique: vi.fn(
        async () =>
          null as { terminosAceptadosEn: Date | null; terminosVersion: string | null } | null,
      ),
      updateMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
    },
    auditLog: { create: vi.fn(async (_args: unknown) => ({})) },
  };
  return { db };
});

vi.mock("@/lib/db", () => ({ db }));

import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/errors";
import { TERMINOS_VERSION } from "@/lib/legal";
import { aceptarPolitica, obtenerEstadoPolitica } from "@/services/politica.service";
import { aceptarPoliticaSchema } from "@/lib/validators/politica";

const familia: AuthContext = { userId: "u-fam", rol: "JUGADOR", escuelaId: "esc1" };
const otros: AuthContext[] = [
  { userId: "u-dt", rol: "DT", escuelaId: "esc1", entrenadorId: "dt1" },
  { userId: "u-esc", rol: "ESCUELA_ADMIN", escuelaId: "esc1" },
  { userId: "u-sa", rol: "SUPER_ADMIN", escuelaId: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.user.findUnique.mockResolvedValue(null);
});

describe("aceptarPolitica", () => {
  it("sella fecha y versión vigente de la política, acotado al userId del contexto", async () => {
    const antes = Date.now();
    await aceptarPolitica(familia);

    expect(db.user.updateMany).toHaveBeenCalledTimes(1);
    const arg = db.user.updateMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: { terminosAceptadosEn: Date; terminosVersion: string };
    };
    // Compare-and-set: solo si todavía no aceptó, y sobre el usuario de la sesión.
    expect(arg.where).toEqual({ id: "u-fam", terminosAceptadosEn: null });
    expect(arg.data.terminosVersion).toBe(TERMINOS_VERSION);
    expect(arg.data.terminosAceptadosEn).toBeInstanceOf(Date);
    expect(arg.data.terminosAceptadosEn.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it("audita POLITICA_ACEPTADA con la versión y sin datos personales extra", async () => {
    await aceptarPolitica(familia);

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const { data } = db.auditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(data).toMatchObject({
      actorId: "u-fam",
      actorRol: "JUGADOR",
      accion: "POLITICA_ACEPTADA",
      entidad: "User",
      entidadId: "u-fam",
      escuelaId: "esc1",
    });
    expect(String(data.motivo)).toContain(TERMINOS_VERSION);
  });

  it("es idempotente: si ya había aceptado no sobrescribe ni vuelve a auditar", async () => {
    // El compare-and-set no encuentra fila con `terminosAceptadosEn: null`.
    db.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(aceptarPolitica(familia)).resolves.toBeUndefined();

    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(otros)("rechaza el rol $rol sin tocar la base", async (ctx) => {
    await expect(aceptarPolitica(ctx)).rejects.toBeInstanceOf(ForbiddenError);

    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("obtenerEstadoPolitica", () => {
  it("sin aceptación (null) la compuerta del panel debe cerrarse", async () => {
    db.user.findUnique.mockResolvedValue({ terminosAceptadosEn: null, terminosVersion: null });
    await expect(obtenerEstadoPolitica("u-fam")).resolves.toEqual({
      aceptada: false,
      version: null,
    });
  });

  it("con aceptación devuelve la versión sellada", async () => {
    db.user.findUnique.mockResolvedValue({
      terminosAceptadosEn: new Date("2026-10-19T12:00:00Z"),
      terminosVersion: "1.1",
    });
    await expect(obtenerEstadoPolitica("u-fam")).resolves.toEqual({
      aceptada: true,
      version: "1.1",
    });
  });

  it("un usuario inexistente cuenta como no aceptada", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(obtenerEstadoPolitica("fantasma")).resolves.toEqual({
      aceptada: false,
      version: null,
    });
  });
});

describe("aceptarPoliticaSchema", () => {
  it("exige la casilla marcada", () => {
    expect(aceptarPoliticaSchema.safeParse({ aceptaTerminos: "on" }).success).toBe(true);
    expect(aceptarPoliticaSchema.safeParse({ aceptaTerminos: null }).success).toBe(false);
    expect(aceptarPoliticaSchema.safeParse({ aceptaTerminos: "off" }).success).toBe(false);
  });
});
