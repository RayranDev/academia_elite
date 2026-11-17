import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Revocación de sesiones: el JWT lleva una huella de la contraseña vigente y
 * `getAuthContext` (la única puerta de los route handlers de /api) la compara con
 * la actual. Un usuario inexistente, desactivado, un token sin huella o con una
 * huella vieja (la contraseña cambió) devuelven null. Se mockea Auth.js y el
 * acceso a datos; el código de sesión y la huella corren de verdad.
 */
const { auth, obtenerEstadoDeSesion, db, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  obtenerEstadoDeSesion: vi.fn(),
  db: {
    entrenador: { findUnique: vi.fn(async (_a: unknown) => ({ id: "dt1" })) },
    jugador: { findUnique: vi.fn(async (_a: unknown) => ({ id: "ju1" })) },
  },
  // Igual que Next: redirect() no retorna, interrumpe lanzando.
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/repositories/user.repository", () => ({ obtenerEstadoDeSesion }));
vi.mock("@/repositories/soporte.repository", () => ({
  sesionActivaDe: vi.fn(async () => null),
}));

import { authConfig } from "@/lib/auth/config";
import { huellaDePassword } from "@/lib/auth/huella-password";
import {
  getAuthContext,
  requireAuthContext,
  requirePanelUser,
} from "@/lib/auth/session";

const HUELLA = huellaDePassword("$2a$12$hashVigente");

function sesion(
  extra: { rol?: string; huellaPassword?: string | undefined } = {},
) {
  return {
    user: {
      id: "u1",
      rol: extra.rol ?? "ESCUELA_ADMIN",
      escuelaId: "esc1",
      huellaPassword: "huellaPassword" in extra ? extra.huellaPassword : HUELLA,
    },
  };
}

function estado(parcial: Partial<{ activo: boolean; bloqueado: boolean; rol: string; huellaPassword: string }> = {}) {
  return {
    activo: true,
    bloqueado: false,
    rol: "ESCUELA_ADMIN",
    huellaPassword: HUELLA,
    ...parcial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(sesion());
  obtenerEstadoDeSesion.mockResolvedValue(estado());
});

describe("getAuthContext", () => {
  it("devuelve el contexto con una sesión vigente", async () => {
    await expect(getAuthContext()).resolves.toMatchObject({
      userId: "u1",
      rol: "ESCUELA_ADMIN",
      escuelaId: "esc1",
    });
  });

  it("devuelve null sin sesión", async () => {
    auth.mockResolvedValue(null);
    await expect(getAuthContext()).resolves.toBeNull();
    expect(obtenerEstadoDeSesion).not.toHaveBeenCalled();
  });

  it("devuelve null si el usuario ya no existe", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(null);
    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("devuelve null si el usuario fue desactivado", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(estado({ activo: false }));
    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("devuelve null con un token sin huella (emitido antes de esta revocación)", async () => {
    auth.mockResolvedValue(sesion({ huellaPassword: undefined }));
    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("devuelve null si la contraseña cambió (la huella del token ya no coincide)", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(
      estado({ huellaPassword: huellaDePassword("$2a$12$hashNuevo") }),
    );
    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("consulta al usuario por el id de la sesión (nunca de otra fuente)", async () => {
    await getAuthContext();
    expect(obtenerEstadoDeSesion).toHaveBeenCalledWith("u1");
  });
});

describe("requireAuthContext", () => {
  it("una sesión revocada va a /api/salir (limpia la cookie), no a /login", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(
      estado({ huellaPassword: huellaDePassword("$2a$12$hashNuevo") }),
    );
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/api/salir");
  });

  it("un usuario desactivado o inexistente va a /api/salir (como siempre)", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(estado({ activo: false }));
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/api/salir");
    obtenerEstadoDeSesion.mockResolvedValue(null);
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/api/salir");
  });

  it("sin sesión va a /login", async () => {
    auth.mockResolvedValue(null);
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/login");
  });

  it("conserva la semántica del bloqueo: familia bloqueada a /bloqueado salvo permitirBloqueado", async () => {
    auth.mockResolvedValue(sesion({ rol: "JUGADOR" }));
    obtenerEstadoDeSesion.mockResolvedValue(estado({ rol: "JUGADOR", bloqueado: true }));
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/bloqueado");
    await expect(
      requireAuthContext({ permitirBloqueado: true }),
    ).resolves.toMatchObject({ userId: "u1", rol: "JUGADOR" });
  });

  it("un rol que no es JUGADOR nunca se trata como bloqueado", async () => {
    obtenerEstadoDeSesion.mockResolvedValue(estado({ bloqueado: true }));
    await expect(requireAuthContext()).resolves.toMatchObject({ userId: "u1" });
  });
});

describe("requirePanelUser", () => {
  it("una sesión revocada va a /api/salir", async () => {
    auth.mockResolvedValue(sesion({ huellaPassword: undefined }));
    await expect(requirePanelUser("ESCUELA_ADMIN")).rejects.toThrow(
      "REDIRECT:/api/salir",
    );
  });

  it("una sesión vigente devuelve al usuario del panel", async () => {
    await expect(requirePanelUser("ESCUELA_ADMIN")).resolves.toMatchObject({
      id: "u1",
      rol: "ESCUELA_ADMIN",
      bloqueado: false,
    });
  });

  it("otro rol sigue yendo a su propio panel", async () => {
    await expect(requirePanelUser("DT")).rejects.toThrow("REDIRECT:/escuela");
  });
});

describe("huella de contraseña", () => {
  it("es corta, determinista y no contiene el hash", () => {
    const hash = "$2a$12$unHashBcryptDeEjemplo";
    expect(huellaDePassword(hash)).toBe(huellaDePassword(hash));
    expect(huellaDePassword(hash)).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain(huellaDePassword(hash));
  });

  it("cambia cuando cambia el hash", () => {
    expect(huellaDePassword("$2a$12$a")).not.toBe(huellaDePassword("$2a$12$b"));
  });
});

describe("callbacks de Auth.js (config edge-safe)", () => {
  const { jwt, session } = authConfig.callbacks;
  const llamarJwt = jwt as unknown as (a: Record<string, unknown>) => Record<string, unknown>;

  it("al iniciar sesión copia la huella al token", () => {
    const token = llamarJwt({
      token: {},
      user: { rol: "DT", escuelaId: "esc1", huellaPassword: HUELLA },
    });
    expect(token).toMatchObject({ rol: "DT", escuelaId: "esc1", huellaPassword: HUELLA });
  });

  it("los datos de sesión que llegan del cliente (POST /api/auth/session) nunca cambian huella, rol ni escuela", () => {
    const base = { rol: "DT", escuelaId: "esc1", huellaPassword: "0000000000000000" };
    for (const trigger of ["update", undefined]) {
      const t = llamarJwt({
        token: { ...base },
        trigger,
        session: { user: { huellaPassword: HUELLA, rol: "SUPER_ADMIN", escuelaId: "otra" } },
      });
      expect(t).toMatchObject(base);
    }
  });

  it("la sesión expone la huella para que getAuthContext la valide", () => {
    const llamarSession = session as unknown as (a: Record<string, unknown>) => {
      user: { huellaPassword?: string };
    };
    const s = llamarSession({
      session: { user: {} },
      token: { sub: "u1", rol: "DT", escuelaId: null, huellaPassword: HUELLA },
    });
    expect(s.user.huellaPassword).toBe(HUELLA);
  });

  it("config.ts sigue siendo edge-safe: sin crypto, Prisma ni bcrypt", () => {
    const fuente = readFileSync(
      path.join(process.cwd(), "src", "lib", "auth", "config.ts"),
      "utf8",
    );
    // Solo las líneas de import (los comentarios mencionan estos módulos).
    const imports = (fuente.match(/^import .*$/gm) ?? []).join(" ");
    expect(imports).not.toMatch(/node:crypto|huella-password|@\/lib\/db|bcrypt|@\/repositories/);
  });
});
