import { describe, it, expect, vi, beforeEach } from "vitest";

const obtenerEscuela = vi.fn();
const leerFoto = vi.fn();
vi.mock("@/repositories/escuela.repository", () => ({
  obtenerEscuela: (...a: unknown[]) => obtenerEscuela(...a),
}));
vi.mock("@/lib/foto/storage", () => ({ leerFoto: (...a: unknown[]) => leerFoto(...a) }));

import { obtenerEscudoEscuela } from "@/services/escudo.service";
import type { AuthContext } from "@/lib/auth/context";

const dt: AuthContext = { userId: "u1", rol: "DT", escuelaId: "esc1" };
const sa: AuthContext = { userId: "sa", rol: "SUPER_ADMIN", escuelaId: null };
const saSoporte = (escuelaId: string): AuthContext => ({
  ...sa,
  soporte: { sesionId: "s1", escuelaId, soloLectura: true, motivo: "soporte" },
});
const png = Buffer.from("png");

describe("obtenerEscudoEscuela", () => {
  beforeEach(() => {
    obtenerEscuela.mockReset();
    leerFoto.mockReset();
    obtenerEscuela.mockResolvedValue({ logoUrl: "escudos/esc1.png" });
    leerFoto.mockResolvedValue(png);
  });

  it("el propio tenant recibe el escudo", async () => {
    expect(await obtenerEscudoEscuela(dt, "esc1")).toBe(png);
  });

  it("el SUPER_ADMIN SIN sesión de soporte no lo ve (sin acceso ambiental)", async () => {
    expect(await obtenerEscudoEscuela(sa, "esc1")).toBeNull();
    expect(obtenerEscuela).not.toHaveBeenCalled();
  });

  it("el SUPER_ADMIN con soporte de ESA escuela sí; con soporte de otra, no", async () => {
    expect(await obtenerEscudoEscuela(saSoporte("esc1"), "esc1")).toBe(png);
    expect(await obtenerEscudoEscuela(saSoporte("esc2"), "esc1")).toBeNull();
  });

  it("otra escuela recibe null y ni siquiera se consulta la base", async () => {
    expect(await obtenerEscudoEscuela(dt, "esc2")).toBeNull();
    expect(obtenerEscuela).not.toHaveBeenCalled();
  });

  it("sin escudo cargado devuelve null", async () => {
    obtenerEscuela.mockResolvedValue({ logoUrl: null });
    expect(await obtenerEscudoEscuela(dt, "esc1")).toBeNull();
  });
});
