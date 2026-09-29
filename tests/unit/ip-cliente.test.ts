import { describe, it, expect } from "vitest";
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
});
