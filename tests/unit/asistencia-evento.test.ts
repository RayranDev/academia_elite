import { describe, it, expect } from "vitest";
import {
  contarPresentes,
  resumirAsistencia,
  textoContadorAsistencia,
  mensajeAsistenciaGuardada,
  leerRegistrosAsistencia,
} from "@/lib/eventos/asistencia";
import { pasarListaSchema } from "@/lib/validators/evento";

const r = (jugadorId: string, presente: boolean) => ({ jugadorId, presente });

describe("contarPresentes", () => {
  it("cuenta solo los marcados como presentes", () => {
    expect(contarPresentes([r("a", true), r("b", false), r("c", true)])).toBe(2);
    expect(contarPresentes([])).toBe(0);
  });
});

describe("resumirAsistencia", () => {
  it("total y presentes salen de lo guardado; omitidos, de la diferencia", () => {
    const enviados = [r("a", true), r("b", false), r("c", true)];
    const guardados = [r("a", true), r("b", false)];
    expect(resumirAsistencia(enviados, guardados)).toEqual({
      presentes: 1,
      total: 2,
      omitidos: 1,
    });
  });
});

describe("textoContadorAsistencia", () => {
  it("usa el plural salvo con un solo jugador en la lista", () => {
    expect(textoContadorAsistencia(3, 12)).toBe("3 de 12 presentes");
    expect(textoContadorAsistencia(0, 12)).toBe("0 de 12 presentes");
    expect(textoContadorAsistencia(1, 1)).toBe("1 de 1 presente");
  });
});

describe("mensajeAsistenciaGuardada", () => {
  it("confirma cuántos presentes de cuántos", () => {
    expect(mensajeAsistenciaGuardada({ presentes: 8, total: 12, omitidos: 0 })).toBe(
      "Asistencia guardada: 8 presentes de 12.",
    );
  });

  it("singulariza un solo presente", () => {
    expect(mensajeAsistenciaGuardada({ presentes: 1, total: 12, omitidos: 0 })).toBe(
      "Asistencia guardada: 1 presente de 12.",
    );
  });

  it("no oculta a los jugadores que no se guardaron", () => {
    expect(mensajeAsistenciaGuardada({ presentes: 8, total: 11, omitidos: 1 })).toContain(
      "1 jugador no se guardó porque ya no está en el plantel de la categoría.",
    );
    expect(mensajeAsistenciaGuardada({ presentes: 8, total: 10, omitidos: 2 })).toContain(
      "2 jugadores no se guardaron porque ya no están en el plantel de la categoría.",
    );
  });

  it("con lista en cero presentes lo dice tal cual (nadie vino también es un dato)", () => {
    expect(mensajeAsistenciaGuardada({ presentes: 0, total: 5, omitidos: 0 })).toBe(
      "Asistencia guardada: 0 presentes de 5.",
    );
  });
});

describe("leerRegistrosAsistencia", () => {
  function form(pares: [string, string][]): FormData {
    const fd = new FormData();
    for (const [k, v] of pares) fd.append(k, v);
    return fd;
  }

  it("lee los ids de `jugadores` y marca presente solo si el checkbox vino en on", () => {
    const fd = form([
      ["jugadores", "a"],
      ["jugadores", "b"],
      ["presente_a", "on"],
    ]);
    expect(leerRegistrosAsistencia(fd)).toEqual([r("a", true), r("b", false)]);
  });

  it("descarta ids repetidos y vacíos", () => {
    const fd = form([
      ["jugadores", "a"],
      ["jugadores", "a"],
      ["jugadores", ""],
      ["presente_a", "on"],
    ]);
    expect(leerRegistrosAsistencia(fd)).toEqual([r("a", true)]);
  });

  it("un checkbox de otro jugador no marca a un tercero", () => {
    const fd = form([
      ["jugadores", "a"],
      ["presente_b", "on"],
    ]);
    expect(leerRegistrosAsistencia(fd)).toEqual([r("a", false)]);
  });

  it("sin jugadores devuelve lista vacía", () => {
    expect(leerRegistrosAsistencia(new FormData())).toEqual([]);
  });
});

describe("pasarListaSchema (borde de la acción)", () => {
  it("acepta la salida de leerRegistrosAsistencia con el nombre de campo real", () => {
    // Guarda contra un renombre silencioso: safeParse convierte un campo
    // faltante en un error genérico en runtime, no en un error de tipos.
    const fd = new FormData();
    fd.append("jugadores", "a");
    fd.append("presente_a", "on");
    const parsed = pasarListaSchema.safeParse({
      eventoId: "ev1",
      registros: leerRegistrosAsistencia(fd),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.registros).toEqual([r("a", true)]);
  });

  it("rechaza una lista vacía con un mensaje entendible", () => {
    const parsed = pasarListaSchema.safeParse({ eventoId: "ev1", registros: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("La lista no tiene jugadores.");
  });

  it("rechaza un evento vacío y listas desmedidas", () => {
    expect(pasarListaSchema.safeParse({ eventoId: "", registros: [r("a", true)] }).success).toBe(false);
    const enorme = Array.from({ length: 301 }, (_, i) => r(`j${i}`, true));
    expect(pasarListaSchema.safeParse({ eventoId: "ev1", registros: enorme }).success).toBe(false);
  });
});
