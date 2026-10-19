import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const listarSlugsParaSitemap = vi.fn();
vi.mock("@/services/landing.service", () => ({
  listarSlugsParaSitemap: () => listarSlugsParaSitemap(),
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { urlPublicaBase } from "@/lib/url-publica";

describe("sitemap y url pública", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_URL", "https://app.academia.co/");
    listarSlugsParaSitemap.mockResolvedValue(["club-uno", "club-dos"]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lista portada, legal y solo las landings publicadas", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual([
      "https://app.academia.co/",
      "https://app.academia.co/legal",
      "https://app.academia.co/e/club-uno",
      "https://app.academia.co/e/club-dos",
    ]);
  });

  it("robots.txt apunta al sitemap", () => {
    expect(robots().sitemap).toBe("https://app.academia.co/sitemap.xml");
  });

  it("la URL base no termina en barra y tiene respaldos", () => {
    expect(urlPublicaBase()).toBe("https://app.academia.co");
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "mi-app.vercel.app");
    expect(urlPublicaBase()).toBe("https://mi-app.vercel.app");
  });
});
