import { describe, it, expect } from "vitest";
import {
  reportarPagoSchema,
  motivoPagoSchema,
  reportarPagoDesdeFormData,
  motivoPagoDesdeFormData,
  ESTADOS_PAGO,
  ETIQUETA_ESTADO_PAGO,
} from "@/lib/validators/pago";
import { hoyISO } from "@/lib/fecha-calendario";

// Validadores del reporte de pagos (Track A · corte 1). El módulo de dinero es
// el que sostiene a la escuela: lo que entra por el borde tiene que estar
// acotado — y acá además el mapeo FormData -> schema vive al lado, por el
// mismo motivo documentado en arancel.ts (ver formularios-cobranza.test.ts).

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("ETIQUETA_ESTADO_PAGO", () => {
  it("tiene una etiqueta para cada estado", () => {
    for (const e of ESTADOS_PAGO) {
      expect(ETIQUETA_ESTADO_PAGO[e]).toBeTruthy();
    }
  });
});

describe("reportarPagoDesdeFormData + reportarPagoSchema", () => {
  it("un reporte simple (una cuota, un medio) pasa el schema", () => {
    const { input } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-01",
        nota: "",
        "medios-count": "1",
        "medio-0": "NEQUI",
        "monto-0": "45000",
        "referencia-0": "REF123",
      }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.membresiaIds).toEqual(["mem_1"]);
      expect(r.data.medios).toHaveLength(1);
      expect(r.data.medios[0].monto).toBe(45000);
      expect(r.data.medios[0].referencia).toBe("REF123");
    }
  });

  it("varias cuotas con checkboxes repetidos llegan como getAll", () => {
    const raw = fd({
      fechaPago: "2026-08-01",
      "medios-count": "1",
      "medio-0": "EFECTIVO",
      "monto-0": "90000",
    });
    raw.append("membresiaId", "mem_1");
    raw.append("membresiaId", "mem_2");
    const { input } = reportarPagoDesdeFormData(raw);
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.membresiaIds).toEqual(["mem_1", "mem_2"]);
  });

  it("rechaza sin ninguna cuota elegida", () => {
    const { input } = reportarPagoDesdeFormData(
      fd({ fechaPago: "2026-08-01", "medios-count": "1", "medio-0": "EFECTIVO", "monto-0": "1000" }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Elige al menos una cuota.");
  });

  it("rechaza una cuota repetida en la selección", () => {
    const raw = fd({
      fechaPago: "2026-08-01",
      "medios-count": "1",
      "medio-0": "EFECTIVO",
      "monto-0": "1000",
    });
    raw.append("membresiaId", "mem_1");
    raw.append("membresiaId", "mem_1");
    const { input } = reportarPagoDesdeFormData(raw);
    expect(reportarPagoSchema.safeParse(input).success).toBe(false);
  });

  it("una fila de medio vaciada por el usuario se descarta, no llega como error de Zod", () => {
    // Simula: el usuario agregó una segunda fila y la borró antes de enviar.
    const { input, indicesDeMedios } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-01",
        "medios-count": "2",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
        "medio-1": "", // fila vacía
      }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.medios).toHaveLength(1);
    expect(indicesDeMedios).toEqual([0]); // índice original del único medio real
  });

  it("indicesDeMedios salta el hueco cuando la fila vacía es la del medio", () => {
    const { indicesDeMedios } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-01",
        "medios-count": "3",
        "medio-0": "",
        "medio-1": "NEQUI",
        "monto-1": "1000",
        "medio-2": "EFECTIVO",
        "monto-2": "2000",
      }),
    );
    // La acción usa esto para ir a buscar comprobante-1 y comprobante-2, no
    // comprobante-0 y comprobante-1 (que sería el archivo equivocado).
    expect(indicesDeMedios).toEqual([1, 2]);
  });

  it("rechaza un monto de medio vacío, negativo o cero", () => {
    const base = { membresiaId: "mem_1", fechaPago: "2026-08-01", "medios-count": "1", "medio-0": "EFECTIVO" };
    expect(
      reportarPagoSchema.safeParse(reportarPagoDesdeFormData(fd({ ...base, "monto-0": "" })).input)
        .success,
    ).toBe(false);
    expect(
      reportarPagoSchema.safeParse(reportarPagoDesdeFormData(fd({ ...base, "monto-0": "0" })).input)
        .success,
    ).toBe(false);
    expect(
      reportarPagoSchema.safeParse(reportarPagoDesdeFormData(fd({ ...base, "monto-0": "-5" })).input)
        .success,
    ).toBe(false);
  });

  it("rechaza sin ningún medio de pago", () => {
    const { input } = reportarPagoDesdeFormData(
      fd({ membresiaId: "mem_1", fechaPago: "2026-08-01", "medios-count": "0" }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Agrega al menos un medio de pago.");
  });

  it("rechaza una fecha de pago futura", () => {
    const manana = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { input } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: manana,
        "medios-count": "1",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
      }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("La fecha de pago no puede ser futura.");
    }
  });

  it("acepta la fecha de pago de HOY", () => {
    const { input } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: hoyISO(),
        "medios-count": "1",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
      }),
    );
    expect(reportarPagoSchema.safeParse(input).success).toBe(true);
  });

  it("la fecha de pago se guarda como día de almanaque (medianoche UTC), no como instante", () => {
    const { input } = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-21",
        "medios-count": "1",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
      }),
    );
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fechaPago.toISOString()).toBe("2026-08-21T00:00:00.000Z");
    }
  });

  it("rechaza HTML en la nota y en la referencia (AGENTS.md §5)", () => {
    const conNotaMaliciosa = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-01",
        nota: "<script>alert(1)</script>",
        "medios-count": "1",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
      }),
    ).input;
    expect(reportarPagoSchema.safeParse(conNotaMaliciosa).success).toBe(false);

    const conReferenciaMaliciosa = reportarPagoDesdeFormData(
      fd({
        membresiaId: "mem_1",
        fechaPago: "2026-08-01",
        "medios-count": "1",
        "medio-0": "EFECTIVO",
        "monto-0": "1000",
        "referencia-0": "<img src=x onerror=alert(1)>",
      }),
    ).input;
    expect(reportarPagoSchema.safeParse(conReferenciaMaliciosa).success).toBe(false);
  });

  it("acepta hasta 4 medios y rechaza un quinto", () => {
    const campos: Record<string, string> = {
      membresiaId: "mem_1",
      fechaPago: "2026-08-01",
      "medios-count": "5",
    };
    for (let i = 0; i < 5; i++) {
      campos[`medio-${i}`] = "EFECTIVO";
      campos[`monto-${i}`] = "1000";
    }
    const { input } = reportarPagoDesdeFormData(fd(campos));
    const r = reportarPagoSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Demasiados medios en un solo reporte.");
    }
  });
});

describe("motivoPagoDesdeFormData + motivoPagoSchema", () => {
  it("exige un motivo de al menos 3 caracteres", () => {
    expect(
      motivoPagoSchema.safeParse(motivoPagoDesdeFormData(fd({ pagoId: "pago_1", motivo: "no" })))
        .success,
    ).toBe(false);
    expect(
      motivoPagoSchema.safeParse(
        motivoPagoDesdeFormData(fd({ pagoId: "pago_1", motivo: "Comprobante ilegible" })),
      ).success,
    ).toBe(true);
  });

  it("rechaza HTML en el motivo", () => {
    expect(
      motivoPagoSchema.safeParse(
        motivoPagoDesdeFormData(
          fd({ pagoId: "pago_1", motivo: "<script>alert(1)</script>" }),
        ),
      ).success,
    ).toBe(false);
  });
});
