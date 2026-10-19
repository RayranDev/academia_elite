import { describe, it, expect, vi, beforeEach } from "vitest";

const rateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...a: unknown[]) => rateLimit(...a) }));

import { limitarRuta } from "@/lib/rate-limit-http";

describe("limitarRuta", () => {
  beforeEach(() => rateLimit.mockReset());

  it("deja pasar (null) mientras no se supere el límite", async () => {
    rateLimit.mockResolvedValue({ ok: true, remaining: 3, retryAfterMs: 0 });
    expect(await limitarRuta("export:u1", 10, 60_000)).toBeNull();
    expect(rateLimit).toHaveBeenCalledWith("export:u1", 10, 60_000);
  });

  it("al superar el límite devuelve 429 con Retry-After en segundos (redondeado hacia arriba)", async () => {
    rateLimit.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 12_300 });
    const res = await limitarRuta("export:u1", 10, 60_000);
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("13");
    expect(res?.headers.get("Cache-Control")).toBe("no-store");
  });

  it("Retry-After nunca baja de 1 segundo", async () => {
    rateLimit.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 0 });
    const res = await limitarRuta("k", 1, 1000);
    expect(res?.headers.get("Retry-After")).toBe("1");
  });
});
