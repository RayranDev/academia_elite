import { describe, it, expect } from "vitest";
import { mensajeRespuestaConvocatoria } from "@/lib/eventos/convocatoria";
import { CONFIRMACIONES } from "@/types";

describe("mensaje de respuesta a una convocatoria", () => {
  it("confirmar y rechazar dicen algo distinto y explícito", () => {
    const si = mensajeRespuestaConvocatoria("CONFIRMADO");
    const no = mensajeRespuestaConvocatoria("RECHAZADO");
    expect(si).toMatch(/confirmaste la asistencia/);
    expect(no).toMatch(/no asistirá/);
    expect(si).not.toBe(no);
  });

  it("toda confirmación posible tiene un mensaje no vacío", () => {
    for (const c of CONFIRMACIONES) {
      expect(mensajeRespuestaConvocatoria(c).length, c).toBeGreaterThan(0);
    }
  });

  it("usa tuteo neutro, sin voseo", () => {
    for (const c of CONFIRMACIONES) {
      expect(mensajeRespuestaConvocatoria(c)).not.toMatch(/\b(confirmá|avisá|elegí|guardá)\b/i);
    }
  });
});
