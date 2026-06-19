import { describe, it, expect } from "vitest";
import {
  requireRole,
  assertTenant,
  assertOwnPlayer,
  assertSoportePuedeEscribir,
} from "@/lib/auth/guards";
import { ForbiddenError, TenantMismatchError } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth/context";

const dt: AuthContext = {
  userId: "u1",
  rol: "DT",
  escuelaId: "esc1",
  entrenadorId: "ent1",
};
const superAdmin: AuthContext = {
  userId: "u0",
  rol: "SUPER_ADMIN",
  escuelaId: null,
};
const saSoporteLectura: AuthContext = {
  userId: "u0",
  rol: "SUPER_ADMIN",
  escuelaId: null,
  soporte: { sesionId: "s1", escuelaId: "esc1", soloLectura: true },
};
const saSoporteEscritura: AuthContext = {
  userId: "u0",
  rol: "SUPER_ADMIN",
  escuelaId: null,
  soporte: { sesionId: "s1", escuelaId: "esc1", soloLectura: false },
};
const padre: AuthContext = {
  userId: "u2",
  rol: "JUGADOR",
  escuelaId: "esc1",
};

describe("requireRole", () => {
  it("permite un rol incluido", () => {
    expect(() => requireRole(dt, ["DT", "ESCUELA_ADMIN"])).not.toThrow();
  });

  it("lanza ForbiddenError si el rol no está permitido", () => {
    expect(() => requireRole(dt, ["SUPER_ADMIN"])).toThrow(ForbiddenError);
  });
});

describe("assertTenant", () => {
  it("permite acceso dentro del mismo tenant", () => {
    expect(() => assertTenant(dt, "esc1")).not.toThrow();
  });

  it("bloquea cruce de tenant con 404 (TenantMismatchError)", () => {
    expect(() => assertTenant(dt, "esc2")).toThrow(TenantMismatchError);
  });

  it("SUPER_ADMIN sin sesión de soporte NO accede a un tenant (ForbiddenError)", () => {
    expect(() => assertTenant(superAdmin, "esc1")).toThrow(ForbiddenError);
  });

  it("SUPER_ADMIN con soporte accede SOLO a la escuela de la sesión", () => {
    expect(() => assertTenant(saSoporteLectura, "esc1")).not.toThrow();
  });

  it("SUPER_ADMIN con soporte hacia otra escuela → TenantMismatchError", () => {
    expect(() => assertTenant(saSoporteLectura, "esc2")).toThrow(
      TenantMismatchError,
    );
  });
});

describe("assertSoportePuedeEscribir", () => {
  it("no-op para roles que no son SUPER_ADMIN", () => {
    expect(() => assertSoportePuedeEscribir(dt)).not.toThrow();
    expect(() => assertSoportePuedeEscribir(padre)).not.toThrow();
  });

  it("bloquea la escritura si la sesión de soporte es solo-lectura", () => {
    expect(() => assertSoportePuedeEscribir(saSoporteLectura)).toThrow(
      ForbiddenError,
    );
  });

  it("permite la escritura si la sesión de soporte la tiene habilitada", () => {
    expect(() => assertSoportePuedeEscribir(saSoporteEscritura)).not.toThrow();
  });
});

describe("assertOwnPlayer", () => {
  it("permite operar sobre un jugador propio", () => {
    expect(() => assertOwnPlayer(padre, "j1", ["j1", "j2"])).not.toThrow();
  });

  it("bloquea un jugador ajeno con 404", () => {
    expect(() => assertOwnPlayer(padre, "j9", ["j1", "j2"])).toThrow(
      TenantMismatchError,
    );
  });
});
