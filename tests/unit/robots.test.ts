import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

function reglas() {
  const r = robots().rules;
  const una = Array.isArray(r) ? r[0] : r;
  return {
    allow: ([] as string[]).concat(una.allow ?? []),
    disallow: ([] as string[]).concat(una.disallow ?? []),
  };
}

describe("robots", () => {
  it("bloquea las áreas con sesión, la API y las pantallas de acceso", () => {
    const { disallow } = reglas();
    for (const ruta of ["/api/", "/admin", "/escuela", "/dt", "/jugador", "/login", "/aceptar-politica"]) {
      expect(disallow).toContain(ruta);
    }
  });

  it("NO bloquea /e/: así el buscador puede leer el noindex de cada landing", () => {
    const { allow, disallow } = reglas();
    expect(allow).toContain("/e/");
    expect(disallow.some((d) => "/e/".startsWith(d) && d !== "/")).toBe(false);
  });
});
