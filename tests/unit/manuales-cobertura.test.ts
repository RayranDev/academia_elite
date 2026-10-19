import { describe, expect, it } from "vitest";
import { calcularCobertura, hayProblemasDeCobertura } from "../../scripts/manuales/lib/cobertura.mjs";
import { normalizarRuta, rutaDesdePagina } from "../../scripts/manuales/lib/rutas.mjs";

describe("rutaDesdePagina", () => {
  it("convierte carpetas con parámetros y quita el archivo", () => {
    expect(rutaDesdePagina("dt/jugadores/[id]/evaluar/page.tsx")).toBe("/dt/jugadores/[id]/evaluar");
  });

  it("la raíz del rol es la ruta del prefijo", () => {
    expect(rutaDesdePagina("admin/page.tsx")).toBe("/admin");
  });

  it("ignora route groups y slots", () => {
    expect(rutaDesdePagina("(auth)/login/page.tsx")).toBe("/login");
    expect(rutaDesdePagina("escuela/@modal/ranking/page.tsx")).toBe("/escuela/ranking");
  });

  it("acepta separadores de Windows", () => {
    expect(rutaDesdePagina("dt\\mensajes\\[id]\\page.tsx")).toBe("/dt/mensajes/[id]");
  });
});

describe("normalizarRuta", () => {
  it("el nombre del parámetro no importa", () => {
    expect(normalizarRuta("/dt/jugadores/[id]")).toBe(normalizarRuta("/dt/jugadores/[jugadorId]"));
  });

  it("ignora la barra final", () => {
    expect(normalizarRuta("/dt/plantilla/")).toBe("/dt/plantilla");
  });
});

const roles = [{ id: "entrenador", exclusiones: [] as { ruta: string; razon?: string }[] }];
const inventario = { entrenador: ["/dt", "/dt/logros", "/dt/jugadores/[id]"] };

describe("calcularCobertura", () => {
  it("marca como cubiertas las rutas que alguna ficha declara y como ausentes las demás", () => {
    const fichas = [{ rol: "entrenador", modulo: "Logros", rutas: ["/dt/logros"] }];
    const [c] = calcularCobertura(roles, inventario, fichas);

    expect(c.total).toBe(3);
    expect(c.cubiertas.map((x) => x.ruta)).toEqual(["/dt/logros"]);
    expect(c.sinDocumentar).toEqual(["/dt", "/dt/jugadores/[id]"]);
    expect(c.porcentaje).toBe(33.3);
    expect(hayProblemasDeCobertura([c])).toBe(true);
  });

  it("reporta las rutas declaradas que no existen", () => {
    const fichas = [{ rol: "entrenador", modulo: "Fantasma", rutas: ["/dt/no-existe", "/dt"] }];
    const [c] = calcularCobertura(roles, inventario, fichas);

    expect(c.inexistentes).toEqual([{ ruta: "/dt/no-existe", modulo: "Fantasma" }]);
    expect(c.cubiertas.map((x) => x.ruta)).toEqual(["/dt"]);
  });

  it("compara parámetros sin importar su nombre y acumula los módulos que cubren una ruta", () => {
    const fichas = [
      { rol: "entrenador", modulo: "Ficha", rutas: ["/dt/jugadores/[jugadorId]"] },
      { rol: "entrenador", modulo: "Mediciones", rutas: ["/dt/jugadores/[id]"] },
    ];
    const [c] = calcularCobertura(roles, inventario, fichas);
    expect(c.cubiertas).toEqual([{ ruta: "/dt/jugadores/[id]", modulos: ["Ficha", "Mediciones"] }]);
  });

  it("ignora las fichas de otro rol", () => {
    const fichas = [{ rol: "jugador", modulo: "Logros", rutas: ["/dt/logros"] }];
    const [c] = calcularCobertura(roles, inventario, fichas);
    expect(c.cubiertas).toEqual([]);
    expect(c.inexistentes).toEqual([]);
  });

  it("no cuenta las exclusiones justificadas y rechaza las que no tienen razón", () => {
    const conExclusiones = [
      {
        id: "entrenador",
        exclusiones: [{ ruta: "/dt", razon: "Solo redirige a la plantilla" }, { ruta: "/dt/logros" }],
      },
    ];
    const [c] = calcularCobertura(conExclusiones, inventario, []);

    expect(c.excluidas).toEqual([{ ruta: "/dt", razon: "Solo redirige a la plantilla" }]);
    expect(c.total).toBe(2);
    expect(c.exclusionesSinRazon).toEqual(["/dt/logros"]);
    expect(c.sinDocumentar).toContain("/dt/logros");
  });

  it("con todo cubierto no hay problemas y el porcentaje es 100", () => {
    const fichas = [{ rol: "entrenador", modulo: "Todo", rutas: inventario.entrenador }];
    const [c] = calcularCobertura(roles, inventario, fichas);
    expect(c.porcentaje).toBe(100);
    expect(hayProblemasDeCobertura([c])).toBe(false);
  });

  it("un rol sin pantallas cuenta como 100 % cubierto", () => {
    const [c] = calcularCobertura(roles, { entrenador: [] }, []);
    expect(c.total).toBe(0);
    expect(c.porcentaje).toBe(100);
  });
});
