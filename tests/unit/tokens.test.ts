import { describe, it, expect } from "vitest";
import { generarToken, generarOtp, hashToken } from "@/lib/tokens";

describe("generarToken", () => {
  it("es url-safe (base64url, sin +/= )", () => {
    const muestra = Array.from({ length: 100 }, () => generarToken()).join("");
    expect(muestra).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("no colisiona en una muestra grande", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generarToken()));
    expect(set.size).toBe(1000);
  });
});

describe("generarOtp", () => {
  it("siempre devuelve 6 dígitos (con padding)", () => {
    for (let i = 0; i < 500; i++) {
      const otp = generarOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashToken", () => {
  it("es determinista: mismo token -> mismo hash", () => {
    const t = generarToken();
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it("tokens distintos -> hashes distintos", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("devuelve SHA-256 en hex (64 chars)", () => {
    expect(hashToken("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("no expone el token original", () => {
    const t = generarToken();
    expect(hashToken(t)).not.toContain(t);
  });
});
