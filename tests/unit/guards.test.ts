import { describe, it, expect } from "vitest";
import {
  requireRole,
  assertTenant,
  assertOwnPlayer,
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

  it("SUPER_ADMIN puede cruzar tenants", () => {
    expect(() => assertTenant(superAdmin, "cualquiera")).not.toThrow();
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
