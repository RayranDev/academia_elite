import { describe, it, expect } from "vitest";
import { cabecerasCorsFoto } from "@/lib/foto/cors";

const h = (v: Record<string, string>) => ({
  get: (n: string) => v[n.toLowerCase()] ?? null,
});

describe("cabecerasCorsFoto", () => {
  it("refleja el origen cuando es el propio dominio de la app", () => {
    const r = cabecerasCorsFoto(h({ origin: "https://app.academia.co", host: "app.academia.co" }));
    expect(r["Access-Control-Allow-Origin"]).toBe("https://app.academia.co");
    expect(r.Vary).toBe("Origin");
  });

  it("detrás de un túnel usa x-forwarded-host en vez de host", () => {
    const r = cabecerasCorsFoto(
      h({
        origin: "https://abc.ngrok.app",
        host: "localhost:3000",
        "x-forwarded-host": "abc.ngrok.app",
      }),
    );
    expect(r["Access-Control-Allow-Origin"]).toBe("https://abc.ngrok.app");
  });

  it("un origen de terceros NO recibe Access-Control-Allow-Origin", () => {
    const r = cabecerasCorsFoto(h({ origin: "https://sitio-malo.com", host: "app.academia.co" }));
    expect(r["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(r.Vary).toBe("Origin");
  });

  it("sin Origin (carga normal de <img>) no emite CORS", () => {
    const r = cabecerasCorsFoto(h({ host: "app.academia.co" }));
    expect(r["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("un Origin malformado se ignora sin lanzar", () => {
    const r = cabecerasCorsFoto(h({ origin: "null", host: "app.academia.co" }));
    expect(r["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
