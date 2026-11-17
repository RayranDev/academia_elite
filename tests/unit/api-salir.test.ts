import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/salir/route";

/**
 * /api/salir borra las cookies de Auth.js. Sobre HTTPS los nombres llevan prefijo
 * (`__Secure-`, `__Host-`) y el navegador rechaza un Set-Cookie de esos nombres
 * sin `Secure`, borrados incluidos: la sesión sobrevivía y el usuario quedaba en
 * bucle. Este test serializa la respuesta real de la ruta y mira los atributos.
 * NO prueba que un navegador acepte el borrado (eso exige HTTPS real), solo que
 * el Set-Cookie sale con lo que la regla de los prefijos exige.
 */
async function borrar(cookieHeader: string) {
  const res = await GET(
    new Request("https://app.example/api/salir", { headers: { cookie: cookieHeader } }),
  );
  const porNombre: Record<string, string> = {};
  for (const linea of res.headers.getSetCookie()) {
    porNombre[linea.split("=")[0]] = linea;
  }
  return { res, porNombre };
}

describe("/api/salir: atributos del borrado de cookies", () => {
  it("un nombre __Secure- se borra con Secure, Path=/, HttpOnly y SameSite=lax", async () => {
    const { porNombre } = await borrar("__Secure-authjs.session-token=abc");
    const c = porNombre["__Secure-authjs.session-token"];
    expect(c).toMatch(/;\s*Secure/i);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=lax/i);
    expect(c).toMatch(/Max-Age=0/i);
    expect(c).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(c).not.toMatch(/Domain=/i);
  });

  it("un __Host- se borra con Secure, Path=/ y SIN Domain (lo exige el prefijo)", async () => {
    const { porNombre } = await borrar("__Host-authjs.csrf-token=abc%7Cdef");
    const c = porNombre["__Host-authjs.csrf-token"];
    expect(c).toMatch(/;\s*Secure/i);
    expect(c).toMatch(/Path=\//);
    expect(c).not.toMatch(/Domain=/i);
  });

  it("los fragmentos de una sesión grande (.0, .1) llevan los mismos atributos", async () => {
    const { porNombre } = await borrar(
      "__Secure-authjs.session-token.0=a; __Secure-authjs.session-token.1=b",
    );
    for (const nombre of ["__Secure-authjs.session-token.0", "__Secure-authjs.session-token.1"]) {
      expect(porNombre[nombre]).toMatch(/;\s*Secure/i);
      expect(porNombre[nombre]).toMatch(/Path=\//);
    }
  });

  it("un nombre sin prefijo (HTTP, dev, e2e) se borra sin Secure", async () => {
    const { porNombre } = await borrar("authjs.session-token=abc");
    const c = porNombre["authjs.session-token"];
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).not.toMatch(/;\s*Secure/i);
  });

  it("no toca cookies ajenas a Auth.js y redirige al login con el aviso", async () => {
    const { res, porNombre } = await borrar("otra=1; authjs.session-token=abc");
    expect(porNombre["otra"]).toBeUndefined();
    expect(res.headers.get("location")).toBe("https://app.example/login?expirada=1");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
