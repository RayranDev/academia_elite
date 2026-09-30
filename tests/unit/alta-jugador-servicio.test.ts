import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Alta completa de jugador. Se mockea SOLO el cliente Prisma (y el alcance del
 * DT): los repositorios y el servicio corren de verdad, así los tests cubren la
 * orquestación real —roles, tenant, transacción, cuenta de familia, auditoría—
 * y no un doble.
 */
const { db } = vi.hoisted(() => {
  const db = {
    categoria: { count: vi.fn(async () => 1) },
    user: {
      findUnique: vi.fn(async () => null as { id: string } | null),
      findFirst: vi.fn(async () => null as { id: string; nombre: string } | null),
      create: vi.fn(async () => ({ id: "fam1" })),
    },
    jugador: {
      create: vi.fn(async () => ({ id: "jug1", codigoJugador: "ABC123" })),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
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

import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { crearJugadorCompleto } from "@/services/alta-jugador.service";
import { altaJugadorSchema, altaJugadorDesdeFormData } from "@/lib/validators/alta-jugador";

const dt: AuthContext = { userId: "u-dt", rol: "DT", escuelaId: "esc1", entrenadorId: "dt1" };
const escuela: AuthContext = { userId: "u-esc", rol: "ESCUELA_ADMIN", escuelaId: "esc1" };
const soporte = (soloLectura: boolean): AuthContext => ({
  userId: "u-sa",
  rol: "SUPER_ADMIN",
  escuelaId: null,
  soporte: { sesionId: "s1", escuelaId: "esc1", soloLectura, motivo: "Alta asistida" },
});
const familia: AuthContext = { userId: "u-fam", rol: "JUGADOR", escuelaId: "esc1" };

function alta(campos: Record<string, string> = {}) {
  const fd = new FormData();
  const base = {
    nombre: "Lucas",
    apellido: "García",
    fechaNacimiento: "2014-03-10",
    posicion: "DEL",
    categoriaId: "cat1",
  };
  for (const [k, v] of Object.entries({ ...base, ...campos })) fd.append(k, v);
  const r = altaJugadorSchema.safeParse(altaJugadorDesdeFormData(fd));
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
}

const ACUDIENTE = {
  acudienteNombre: "Rosa Pérez",
  acudienteEmail: "rosa@correo.com",
  acudienteAutoriza: "on",
};

const SALUD = {
  eps: "Sura",
  alergias: "Penicilina",
  numeroDocumento: "1023456789",
  autorizaDatosSalud: "on",
};

interface ArgCrear {
  data: Record<string, unknown>;
}
const argDe = (mock: { mock: { calls: unknown[][] } }, n = 0) =>
  mock.mock.calls[n]?.[0] as unknown as ArgCrear;

beforeEach(() => {
  vi.clearAllMocks();
  db.categoria.count.mockResolvedValue(1);
  db.user.findUnique.mockResolvedValue(null);
  db.user.findFirst.mockResolvedValue(null);
});

describe("crearJugadorCompleto: permisos y tenant", () => {
  it("la familia no puede dar de alta", async () => {
    await expect(crearJugadorCompleto(familia, alta())).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.jugador.create).not.toHaveBeenCalled();
  });

  it("el DT solo crea en sus categorías", async () => {
    await expect(crearJugadorCompleto(dt, alta({ categoriaId: "otra" }))).rejects.toThrow(
      "Esa categoría no está entre las tuyas.",
    );
    expect(db.jugador.create).not.toHaveBeenCalled();
  });

  it("la escuela solo crea en categorías de su escuela", async () => {
    db.categoria.count.mockResolvedValue(0);
    await expect(crearJugadorCompleto(escuela, alta())).rejects.toThrow(
      "Esa categoría no pertenece a la escuela.",
    );
    // La consulta de categorías va acotada por tenant.
    expect(db.categoria.count).toHaveBeenCalledWith({
      where: { escuelaId: "esc1", id: { in: ["cat1"] } },
    });
  });

  it("el Súper Admin sin sesión de soporte no escribe", async () => {
    const sinSesion: AuthContext = { userId: "u-sa", rol: "SUPER_ADMIN", escuelaId: null };
    await expect(crearJugadorCompleto(sinSesion, alta())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("el Súper Admin con la sesión en solo lectura no escribe", async () => {
    await expect(crearJugadorCompleto(soporte(true), alta())).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.jugador.create).not.toHaveBeenCalled();
  });

  it("el Súper Admin con sesión habilitada escribe en la escuela de la sesión y audita el motivo", async () => {
    await crearJugadorCompleto(soporte(false), alta());
    expect(argDe(db.jugador.create).data).toMatchObject({ escuelaId: "esc1" });
    const auditoria = argDe(db.auditLog.create).data;
    expect(auditoria).toMatchObject({ actorRol: "SUPER_ADMIN", accion: "CREAR_JUGADOR" });
    expect(String(auditoria.motivo)).toContain("Alta asistida");
  });
});

describe("crearJugadorCompleto: alta atómica", () => {
  it("crea el jugador ACTIVO, con código de vinculación, en una transacción", async () => {
    const r = await crearJugadorCompleto(escuela, alta());
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(argDe(db.jugador.create).data).toMatchObject({
      escuelaId: "esc1",
      estado: "ACTIVO",
      categoriaId: "cat1",
      nombre: "Lucas",
      padreUserId: null,
      cuentaUserId: null,
    });
    expect(r).toMatchObject({
      jugadorId: "jug1",
      nombreCompleto: "Lucas García",
      codigoJugador: "ABC123",
      fichaCargada: false,
      saludGuardada: false,
      familia: null,
    });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("si falla el alta del jugador se propaga el error y no se audita nada", async () => {
    db.jugador.create.mockRejectedValueOnce(new Error("boom"));
    await expect(crearJugadorCompleto(escuela, alta(ACUDIENTE))).rejects.toThrow("boom");
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("crearJugadorCompleto: ficha y consentimiento", () => {
  it("sin autorización de salud no guarda datos de salud aunque lleguen", async () => {
    await crearJugadorCompleto(escuela, alta({ eps: "Sura", alergias: "Penicilina" }));
    expect(argDe(db.jugador.create).data).toMatchObject({
      eps: null,
      alergias: null,
      autorizaDatosSalud: false,
    });
  });

  it("la escuela guarda la ficha completa con autorización", async () => {
    const r = await crearJugadorCompleto(escuela, alta(SALUD));
    expect(argDe(db.jugador.create).data).toMatchObject({
      eps: "Sura",
      alergias: "Penicilina",
      numeroDocumento: "1023456789",
      autorizaDatosSalud: true,
    });
    expect(r).toMatchObject({ fichaCargada: true, saludGuardada: true });
  });

  it("el DT no guarda EPS ni documento aunque el request los traiga", async () => {
    await crearJugadorCompleto(dt, alta(SALUD));
    expect(argDe(db.jugador.create).data).toMatchObject({
      eps: null,
      numeroDocumento: null,
      alergias: "Penicilina",
    });
  });
});

describe("crearJugadorCompleto: acudiente", () => {
  it("crea la cuenta de familia con contraseña temporal, que no se guarda en claro", async () => {
    const r = await crearJugadorCompleto(escuela, alta(ACUDIENTE));

    const user = argDe(db.user.create).data;
    expect(user).toMatchObject({
      escuelaId: "esc1",
      email: "rosa@correo.com",
      nombre: "Rosa Pérez",
      rol: "JUGADOR",
    });
    expect(r.familia).toMatchObject({ tipo: "CREADA", email: "rosa@correo.com" });
    if (r.familia?.tipo !== "CREADA") return;
    expect(r.familia.passwordTemporal.length).toBeGreaterThanOrEqual(12);
    // Se guarda el hash, nunca la contraseña.
    expect(user.passwordHash).not.toBe(r.familia.passwordTemporal);
    expect(String(user.passwordHash)).toMatch(/^\$2[aby]\$/);

    expect(argDe(db.jugador.create).data).toMatchObject({
      padreUserId: "fam1",
      cuentaUserId: "fam1",
    });
  });

  it("audita el alta y la cuenta, sin contraseña ni datos sensibles en el log", async () => {
    const r = await crearJugadorCompleto(escuela, alta({ ...ACUDIENTE, ...SALUD }));
    const llamadas = db.auditLog.create.mock.calls as unknown as unknown[][];
    const acciones = llamadas.map((c) => (c[0] as ArgCrear).data.accion);
    expect(acciones).toEqual(["CREAR_JUGADOR", "CREAR_CUENTA_FAMILIA"]);
    const log = JSON.stringify(llamadas);
    if (r.familia?.tipo === "CREADA") expect(log).not.toContain(r.familia.passwordTemporal);
    for (const valor of ["Sura", "Penicilina", "1023456789"]) expect(log).not.toContain(valor);
  });

  it("si ya existe la familia en la escuela (hermanos) vincula sin crear otra cuenta", async () => {
    db.user.findFirst.mockResolvedValueOnce({ id: "famExistente", nombre: "Rosa Pérez" });
    // Dentro de la transacción se re-verifica la misma cuenta.
    db.user.findFirst.mockResolvedValueOnce({ id: "famExistente", nombre: "Rosa Pérez" });
    const r = await crearJugadorCompleto(escuela, alta(ACUDIENTE));
    expect(db.user.create).not.toHaveBeenCalled();
    expect(argDe(db.jugador.create).data).toMatchObject({
      padreUserId: "famExistente",
      cuentaUserId: null,
    });
    expect(r.familia).toEqual({
      tipo: "VINCULADA",
      email: "rosa@correo.com",
      nombre: "Rosa Pérez",
    });
  });

  it("un correo de otra escuela se rechaza sin revelar de quién es", async () => {
    db.user.findUnique.mockResolvedValue({ id: "ajena" });
    await expect(crearJugadorCompleto(escuela, alta(ACUDIENTE))).rejects.toThrow(
      "Ya existe una cuenta con ese correo.",
    );
    expect(db.jugador.create).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("la búsqueda de la familia existente va acotada por escuela y rol", async () => {
    await crearJugadorCompleto(escuela, alta(ACUDIENTE));
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { escuelaId: "esc1", email: "rosa@correo.com", rol: "JUGADOR" },
      select: { id: true, nombre: true },
    });
  });

  it("una carrera por el mismo correo (restricción única) se informa como error de dominio", async () => {
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    await expect(crearJugadorCompleto(escuela, alta(ACUDIENTE))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("sin acudiente no se crea ninguna cuenta", async () => {
    await crearJugadorCompleto(escuela, alta());
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });
});
