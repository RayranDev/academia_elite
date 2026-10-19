import { describe, expect, it } from "vitest";
import {
  decidirBorrado,
  exigirBorradoPermitido,
  schemaDeUrl,
} from "../../scripts/guardia-borrado.mjs";

const BASE = "postgresql://usuario:clave@host.example.com:5432/postgres";

describe("decidirBorrado", () => {
  it("bloquea el schema public explícito", () => {
    const d = decidirBorrado({ url: `${BASE}?schema=public`, env: {} });
    expect(d.permitido).toBe(false);
    expect(d.schema).toBe("public");
  });

  it("bloquea una URL sin schema (ausente = public)", () => {
    const d = decidirBorrado({ url: BASE, env: {} });
    expect(d.permitido).toBe(false);
    expect(d.schema).toBe("public");
  });

  it("bloquea un schema vacío y respeta mayúsculas de PUBLIC", () => {
    expect(decidirBorrado({ url: `${BASE}?schema=`, env: {} }).permitido).toBe(false);
    expect(decidirBorrado({ url: `${BASE}?schema=PUBLIC`, env: {} }).permitido).toBe(false);
  });

  it("bloquea aunque haya otros parámetros (pgbouncer) sin schema", () => {
    const d = decidirBorrado({ url: `${BASE}?pgbouncer=true&sslmode=require`, env: {} });
    expect(d.permitido).toBe(false);
  });

  it("permite el schema e2e", () => {
    const d = decidirBorrado({ url: `${BASE}?schema=e2e`, env: {} });
    expect(d.permitido).toBe(true);
    expect(d.schema).toBe("e2e");
  });

  it("permite el schema qa", () => {
    const d = decidirBorrado({ url: `${BASE}?pgbouncer=true&schema=qa`, env: {} });
    expect(d.permitido).toBe(true);
    expect(d.schema).toBe("qa");
  });

  it("permite public solo con PERMITIR_BORRADO_DE_BASE=1", () => {
    expect(
      decidirBorrado({ url: BASE, env: { PERMITIR_BORRADO_DE_BASE: "1" } }).permitido,
    ).toBe(true);
    // Cualquier otro valor NO desbloquea.
    expect(
      decidirBorrado({ url: BASE, env: { PERMITIR_BORRADO_DE_BASE: "true" } }).permitido,
    ).toBe(false);
    expect(
      decidirBorrado({ url: BASE, env: { PERMITIR_BORRADO_DE_BASE: "0" } }).permitido,
    ).toBe(false);
  });

  it("falla cerrado con una URL ausente o ilegible", () => {
    expect(decidirBorrado({ url: undefined, env: {} }).permitido).toBe(false);
    expect(decidirBorrado({ url: "esto no es una url", env: {} }).permitido).toBe(false);
  });
});

describe("exigirBorradoPermitido", () => {
  it("lanza con instrucciones de desbloqueo contra public", () => {
    expect(() => exigirBorradoPermitido({ url: BASE, env: {}, operacion: "este seed" })).toThrow(
      /PERMITIR_BORRADO_DE_BASE=1/,
    );
  });

  it("no lanza contra un schema aislado", () => {
    expect(() =>
      exigirBorradoPermitido({ url: `${BASE}?schema=qa`, env: {} }),
    ).not.toThrow();
  });

  it("el mensaje de bloqueo no filtra credenciales", () => {
    try {
      exigirBorradoPermitido({ url: BASE, env: {} });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("clave");
      expect(String((e as Error).message)).not.toContain("host.example.com");
    }
  });
});

describe("schemaDeUrl", () => {
  it("lee el schema del query string", () => {
    expect(schemaDeUrl(`${BASE}?schema=qa`)).toEqual({ ok: true, schema: "qa" });
  });
});
