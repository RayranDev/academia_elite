import { describe, it, expect } from "vitest";
import {
  ventanaActiva,
  logroAplicaAPosicion,
  logroDisponibleParaEscuela,
} from "@/lib/logros";

const HOY = new Date("2026-06-12T12:00:00Z");
const AYER = new Date("2026-06-11T12:00:00Z");
const MANANA = new Date("2026-06-13T12:00:00Z");

describe("ventanaActiva", () => {
  it("sin configuración, el logro está disponible", () => {
    expect(ventanaActiva(null, HOY)).toBe(true);
    expect(ventanaActiva(undefined, HOY)).toBe(true);
  });

  it("desactivado por la escuela → no disponible", () => {
    expect(ventanaActiva({ activo: false, desde: null, hasta: null }, HOY)).toBe(false);
  });

  it("antes del inicio de la ventana → no disponible", () => {
    expect(ventanaActiva({ activo: true, desde: MANANA, hasta: null }, HOY)).toBe(false);
  });

  it("después del fin de la ventana → no disponible", () => {
    expect(ventanaActiva({ activo: true, desde: null, hasta: AYER }, HOY)).toBe(false);
  });

  it("dentro de la ventana → disponible", () => {
    expect(ventanaActiva({ activo: true, desde: AYER, hasta: MANANA }, HOY)).toBe(true);
  });
});

describe("logroAplicaAPosicion", () => {
  it("logro general (null) aplica a cualquier posición", () => {
    expect(logroAplicaAPosicion(null, "POR")).toBe(true);
    expect(logroAplicaAPosicion(null, "DEL")).toBe(true);
  });

  it("logro de posición solo aplica a esa posición", () => {
    expect(logroAplicaAPosicion("DEL", "DEL")).toBe(true);
    expect(logroAplicaAPosicion("DEL", "DEF")).toBe(false);
  });
});

describe("logroDisponibleParaEscuela", () => {
  it("logro inactivo en el catálogo nunca está disponible", () => {
    const logro = { activo: false, escuelaId: null };
    expect(logroDisponibleParaEscuela(logro, "esc-1", null, HOY)).toBe(false);
  });

  it("logro propio de OTRA escuela no está disponible", () => {
    const logro = { activo: true, escuelaId: "esc-2" };
    expect(logroDisponibleParaEscuela(logro, "esc-1", null, HOY)).toBe(false);
  });

  it("logro global activo sin ventana está disponible", () => {
    const logro = { activo: true, escuelaId: null };
    expect(logroDisponibleParaEscuela(logro, "esc-1", null, HOY)).toBe(true);
  });

  it("logro propio de la escuela respeta su ventana", () => {
    const logro = { activo: true, escuelaId: "esc-1" };
    expect(
      logroDisponibleParaEscuela(logro, "esc-1", { activo: true, desde: AYER, hasta: MANANA }, HOY),
    ).toBe(true);
    expect(
      logroDisponibleParaEscuela(logro, "esc-1", { activo: true, desde: MANANA, hasta: null }, HOY),
    ).toBe(false);
  });
});
