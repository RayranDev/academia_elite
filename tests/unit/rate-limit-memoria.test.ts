import { describe, it, expect, vi, beforeEach } from "vitest";

describe("rate limit en memoria (fallback sin Redis)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  it("no crece sin tope aunque lleguen claves nuevas sin parar (una por IP)", async () => {
    const { rateLimit, cleanupRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 10_500; i++) {
      await rateLimit(`publico:10.0.${Math.floor(i / 256)}.${i % 256}`, 5, 3_600_000);
    }
    expect(cleanupRateLimit()).toBeLessThanOrEqual(10_000);
  });

  it("sigue limitando una clave que sí está dentro del tope", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    expect((await rateLimit("k", 2, 60_000)).ok).toBe(true);
    expect((await rateLimit("k", 2, 60_000)).ok).toBe(true);
    expect((await rateLimit("k", 2, 60_000)).ok).toBe(false);
  });
});
