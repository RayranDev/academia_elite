import { describe, it, expect, vi, beforeEach } from "vitest";

const rateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...a: unknown[]) => rateLimit(...a) }));

import { excedeLimitePublico, LIMITE_PUBLICO_POR_MINUTO } from "@/lib/limite-publico";

const conIp = (ip?: string) =>
  new Headers(ip ? { "x-forwarded-for": ip } : {});

describe("excedeLimitePublico", () => {
  beforeEach(() => rateLimit.mockReset());

  it("con IP desconocida NO limita ni consulta el contador (no se castiga a todos por uno)", async () => {
    expect(await excedeLimitePublico(conIp())).toBeNull();
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("dentro del tope deja pasar y cuenta por IP", async () => {
    rateLimit.mockResolvedValue({ ok: true, remaining: 5, retryAfterMs: 0 });
    expect(await excedeLimitePublico(conIp("203.0.113.5"))).toBeNull();
    expect(rateLimit).toHaveBeenCalledWith(
      "publico:203.0.113.5",
      LIMITE_PUBLICO_POR_MINUTO,
      60_000,
    );
  });

  it("al excederlo responde 429 con Retry-After y sin caché", async () => {
    rateLimit.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 47_200 });
    const res = await excedeLimitePublico(conIp("203.0.113.5"));
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("48");
    expect(res?.headers.get("Cache-Control")).toBe("no-store");
  });
});
