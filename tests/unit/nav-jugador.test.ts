import { describe, it, expect } from "vitest";
import { navJugador } from "@/lib/nav/jugador";
import { ICONOS, esActivo } from "@/components/shell/Sidebar";

const items = navJugador(false);
const activos = (pathname: string) =>
  items.filter((i) => esActivo(pathname, i.href, "/jugador")).map((i) => i.label);

describe("menú de la familia", () => {
  it("incluye Eventos", () => {
    expect(items.map((i) => i.label)).toContain("Eventos");
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
      "Inicio",
      "Calendario",
      "Pagos",
      "Mensajes",
    ]);
  });

  it("Eventos queda en 'Más' (justo después de la barra móvil), no en la barra", () => {
    expect(items.findIndex((i) => i.label === "Eventos")).toBe(4);
  });
});

describe("sección activa de la familia", () => {
  it("el listado y el detalle de un evento activan solo Eventos", () => {
    expect(activos("/jugador/eventos")).toEqual(["Eventos"]);
    expect(activos("/jugador/eventos/abc123")).toEqual(["Eventos"]);
  });

  it("el calendario activa solo Calendario, sin arrastrar a Eventos", () => {
    expect(activos("/jugador/calendario")).toEqual(["Calendario"]);
  });

  it("Inicio solo se activa en la raíz", () => {
    expect(activos("/jugador")).toEqual(["Inicio"]);
    expect(activos("/jugador/pagos")).toEqual(["Pagos"]);
  });

  it("un prefijo parecido no activa otra sección", () => {
    expect(activos("/jugador/eventos-viejos")).toEqual([]);
  });
});

describe("menú de la familia con la cuenta bloqueada", () => {
  it("solo quedan Pagos y Mensajes", () => {
    expect(navJugador(true).map((i) => i.label)).toEqual(["Pagos", "Mensajes"]);
  });
});
