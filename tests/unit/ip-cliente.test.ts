import { describe, it, expect, afterEach, vi } from "vitest";
import { ipCliente } from "@/lib/ip-cliente";

// Fake mínimo: alcanza con `get`, como usa `ipCliente` tanto `Request.headers`
// como `ReadonlyHeaders` de `await headers()` (next/headers).
function headersFake(valores: Record<string, string | undefined>) {
  return {
    get(name: string): string | null {
      return valores[name] ?? null;
    },
  };
}

describe("ipCliente", () => {
  it("con varias IPs en x-forwarded-for, usa la primera (la del cliente real)", () => {
    const h = headersFake({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" });
    expect(ipCliente(h)).toBe("203.0.113.5");
  });

  it("x-forwarded-for vacío o solo espacios cae a x-real-ip", () => {
    const h1 = headersFake({ "x-forwarded-for": "", "x-real-ip": "198.51.100.9" });
    expect(ipCliente(h1)).toBe("198.51.100.9");

    const h2 = headersFake({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.9" });
    expect(ipCliente(h2)).toBe("198.51.100.9");
  });

  it("sin x-forwarded-for, usa x-real-ip", () => {
    const h = headersFake({ "x-real-ip": "198.51.100.9" });
    expect(ipCliente(h)).toBe("198.51.100.9");
  });

  it("sin ningún header, devuelve 'desconocida'", () => {
    const h = headersFake({});
    expect(ipCliente(h)).toBe("desconocida");
  });

  describe("con IP_CLIENTE_HEADER (VPS detrás de un proxy de confianza)", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("prioriza el header configurado sobre x-forwarded-for falseable", () => {
      vi.stubEnv("IP_CLIENTE_HEADER", "CF-Connecting-IP");
      const h = headersFake({
        "cf-connecting-ip": "203.0.113.7",
        "x-forwarded-for": "6.6.6.6",
      });
      expect(ipCliente(h)).toBe("203.0.113.7");
    });

    it("si apuntan a un header multi-valor, usa solo el primer valor", () => {
      vi.stubEnv("IP_CLIENTE_HEADER", "x-forwarded-for");
      const h = headersFake({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
      expect(ipCliente(h)).toBe("203.0.113.7");
    });

    it("un valor que no parece una IP no sirve de clave: cae al comportamiento normal", () => {
      vi.stubEnv("IP_CLIENTE_HEADER", "cf-connecting-ip");
      const h = headersFake({
        "cf-connecting-ip": "no-soy-una-ip",
        "x-real-ip": "198.51.100.9",
      });
      expect(ipCliente(h)).toBe("198.51.100.9");
    });

    it("si el header configurado no llegó, cae al comportamiento normal", () => {
      vi.stubEnv("IP_CLIENTE_HEADER", "cf-connecting-ip");
      const h = headersFake({ "x-forwarded-for": "198.51.100.1" });
      expect(ipCliente(h)).toBe("198.51.100.1");
    });

    it("sin la env, ignora cf-connecting-ip (no confiamos en él por defecto)", () => {
      const h = headersFake({ "cf-connecting-ip": "6.6.6.6", "x-real-ip": "198.51.100.9" });
      expect(ipCliente(h)).toBe("198.51.100.9");
    });
  });
});
