import { describe, it, expect } from "vitest";
import { puedeVerFoto } from "@/lib/foto/permisos";
import type { AuthContext } from "@/lib/auth/context";

const jugador = {
  escuelaId: "esc1",
  padreUserId: "padre1",
  cuentaUserId: null,
  consentimientoFoto: true,
};
const sinConsentimiento = { ...jugador, consentimientoFoto: false };

const dt: AuthContext = { userId: "dt1", rol: "DT", escuelaId: "esc1" };
const dtOtraEscuela: AuthContext = { userId: "dt2", rol: "DT", escuelaId: "esc2" };
const admin: AuthContext = { userId: "a1", rol: "ESCUELA_ADMIN", escuelaId: "esc1" };
const padre: AuthContext = { userId: "padre1", rol: "JUGADOR", escuelaId: "esc1" };
const otroPadre: AuthContext = { userId: "padre2", rol: "JUGADOR", escuelaId: "esc1" };
const superSinSoporte: AuthContext = { userId: "sa", rol: "SUPER_ADMIN", escuelaId: null };
const superSoporteEsc1: AuthContext = {
  userId: "sa",
  rol: "SUPER_ADMIN",
  escuelaId: null,
  soporte: { sesionId: "s1", escuelaId: "esc1", soloLectura: true, motivo: "soporte" },
};
const superSoporteEsc2: AuthContext = {
  ...superSoporteEsc1,
  soporte: { sesionId: "s2", escuelaId: "esc2", soloLectura: true, motivo: "soporte" },
};

describe("puedeVerFoto", () => {
  it("el SUPER_ADMIN sin sesión de soporte NO ve la foto (sin acceso ambiental)", () => {
    expect(puedeVerFoto(superSinSoporte, jugador)).toBe(false);
  });

  it("el SUPER_ADMIN con soporte de OTRA escuela NO ve la foto", () => {
    expect(puedeVerFoto(superSoporteEsc2, jugador)).toBe(false);
  });

  it("el SUPER_ADMIN con soporte de la escuela ve la foto si hay consentimiento", () => {
    expect(puedeVerFoto(superSoporteEsc1, jugador)).toBe(true);
    expect(puedeVerFoto(superSoporteEsc1, sinConsentimiento)).toBe(false);
  });

  it("el staff de la escuela ve la foto solo con consentimiento", () => {
    expect(puedeVerFoto(dt, jugador)).toBe(true);
    expect(puedeVerFoto(admin, jugador)).toBe(true);
    expect(puedeVerFoto(dt, sinConsentimiento)).toBe(false);
    expect(puedeVerFoto(admin, sinConsentimiento)).toBe(false);
  });

  it("el responsable ve la foto aun sin consentimiento", () => {
    expect(puedeVerFoto(padre, sinConsentimiento)).toBe(true);
  });

  it("otro padre de la misma escuela NO ve la foto", () => {
    expect(puedeVerFoto(otroPadre, jugador)).toBe(false);
  });

  it("el staff de otra escuela NO ve la foto", () => {
    expect(puedeVerFoto(dtOtraEscuela, jugador)).toBe(false);
  });

  it("una falla inesperada NO se disfraza de 404: se propaga", () => {
    expect(() => puedeVerFoto(null as unknown as AuthContext, jugador)).toThrow(TypeError);
  });
});
