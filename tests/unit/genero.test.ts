import { describe, it, expect } from "vitest";
import { jugadorSchema } from "@/lib/validators/jugador";
import { datosJugadorSchema } from "@/lib/validators/cuenta";
import { jugadorEditarSchema } from "@/lib/validators/gestion";
import { aGenero } from "@/lib/mappers/genero";
import { sinVaciosAlFinal } from "@/lib/xlsx";

const BASE_JUGADOR = {
  nombre: "Ana",
  apellido: "Ruiz",
  fechaNacimiento: "2014-03-15",
  posicion: "DEL",
  categoriaId: "cat-1",
};

describe("jugadorSchema · genero", () => {
  it("acepta cada valor del catálogo", () => {
    for (const genero of ["M", "F", "X"] as const) {
      const r = jugadorSchema.safeParse({ ...BASE_JUGADOR, genero });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.genero).toBe(genero);
    }
  });

  it("es opcional: sin el campo el alta sigue siendo válida", () => {
    const r = jugadorSchema.safeParse(BASE_JUGADOR);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.genero).toBeUndefined();
  });

  it("el select vacío y la celda vacía del Excel colapsan a undefined", () => {
    const r = jugadorSchema.safeParse({ ...BASE_JUGADOR, genero: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.genero).toBeUndefined();
  });

  it("rechaza un valor fuera del catálogo", () => {
    expect(jugadorSchema.safeParse({ ...BASE_JUGADOR, genero: "otro" }).success).toBe(false);
    // Sin normalizar a mayúsculas: los bordes (Excel, select) ya lo hacen.
    expect(jugadorSchema.safeParse({ ...BASE_JUGADOR, genero: "f" }).success).toBe(false);
  });
});

describe("edición · genero se puede retirar", () => {
  // Rectificar incluye volver a "sin declarar" (HABEAS-DATA.md §8): por eso
  // estos dos schemas normalizan el vacío a null y no a undefined — el update
  // tiene que ESCRIBIR el null, no omitir el campo.
  it("la familia puede dejarlo sin declarar", () => {
    const r = datosJugadorSchema.safeParse({
      jugadorId: "j-1",
      nombre: "Ana",
      apellido: "Ruiz",
      parentesco: "",
      genero: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.genero).toBeNull();
  });

  it("la gestión admin puede dejarlo sin declarar y también fijarlo", () => {
    const base = {
      jugadorId: "j-1",
      nombre: "Ana",
      apellido: "Ruiz",
      fechaNacimiento: "2014-03-15",
      posicion: "DEL",
      categoriaId: "cat-1",
    };
    const vacio = jugadorEditarSchema.safeParse({ ...base, genero: "" });
    expect(vacio.success && vacio.data.genero).toBeNull();
    const fijado = jugadorEditarSchema.safeParse({ ...base, genero: "F" });
    expect(fijado.success && fijado.data.genero).toBe("F");
  });
});

describe("aGenero", () => {
  it("deja pasar el catálogo y normaliza el resto a null", () => {
    expect(aGenero("M")).toBe("M");
    expect(aGenero("X")).toBe("X");
    expect(aGenero(null)).toBeNull();
    expect(aGenero(undefined)).toBeNull();
    expect(aGenero("")).toBeNull();
    expect(aGenero("basura")).toBeNull(); // texto libre en BD: se valida al leer
  });
});

describe("sinVaciosAlFinal", () => {
  // Es lo que permite que un .xlsx SIN la columna opcional del final —o con
  // columnas fantasma de formato— siga validando sus cabeceras.
  it("recorta solo las celdas vacías de la cola", () => {
    expect(sinVaciosAlFinal(["nombre", "apellido", "", ""])).toEqual(["nombre", "apellido"]);
    expect(sinVaciosAlFinal(["nombre", "", "posicion"])).toEqual(["nombre", "", "posicion"]);
    expect(sinVaciosAlFinal(["nombre"])).toEqual(["nombre"]);
    expect(sinVaciosAlFinal(["", ""])).toEqual([]);
    expect(sinVaciosAlFinal([])).toEqual([]);
  });
});
