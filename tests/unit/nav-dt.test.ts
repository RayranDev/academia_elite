import { describe, it, expect } from "vitest";
import { navDt } from "@/lib/nav/dt";
import { ICONOS, esActivo } from "@/components/shell/Sidebar";

const items = navDt(0);
const activos = (pathname: string) =>
  items.filter((i) => esActivo(pathname, i.href, "/dt")).map((i) => i.label);

describe("menú del DT", () => {
  it("incluye Eventos, pegado a Calendario", () => {
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Eventos");
    expect(labels.indexOf("Eventos")).toBe(labels.indexOf("Calendario") + 1);
  });

  it("todas las entradas usan un ícono registrado y una ruta única", () => {
    for (const i of items) expect(ICONOS[i.icon], `ícono de ${i.label}`).toBeDefined();
    expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
  });

  it("Eventos tiene un ícono propio, no el de otra sección", () => {
    const iconoDe = (label: string) => ICONOS[items.find((i) => i.label === label)!.icon];
    const otros = items.filter((i) => i.label !== "Eventos").map((i) => ICONOS[i.icon]);
    expect(otros).not.toContain(iconoDe("Eventos"));
  });

  it("las 4 primeras (barra inferior móvil) siguen siendo las de siempre", () => {
    expect(items.slice(0, 4).map((i) => i.label)).toEqual([
      "Hoy",
      "Plantilla",
      "Mi perfil",
      "Calendario",
    ]);
  });

  it("el badge de solicitudes lo pone el layout", () => {
    expect(navDt(3).find((i) => i.label === "Solicitudes")?.badge).toBe(3);
  });
});

describe("sección activa del DT", () => {
  it("el listado y el detalle de un evento activan solo Eventos", () => {
    expect(activos("/dt/eventos")).toEqual(["Eventos"]);
    expect(activos("/dt/eventos/abc123")).toEqual(["Eventos"]);
    expect(activos("/dt/eventos/abc123/sesion")).toEqual(["Eventos"]);
  });

  it("el calendario activa solo Calendario, sin arrastrar a Eventos", () => {
    expect(activos("/dt/calendario")).toEqual(["Calendario"]);
  });

  it("Hoy solo se activa en la raíz, no en todo lo que cuelga de /dt", () => {
    expect(activos("/dt")).toEqual(["Hoy"]);
    expect(activos("/dt/plantilla")).toEqual(["Plantilla"]);
  });

  it("un prefijo parecido no activa otra sección", () => {
    // /dt/eventos-viejos no es hijo de /dt/eventos.
    expect(activos("/dt/eventos-viejos")).toEqual([]);
  });
});
