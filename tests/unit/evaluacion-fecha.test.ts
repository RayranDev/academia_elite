import { describe, it, expect, vi } from "vitest";

// `evaluarJugadorCore` toca Prisma directo (transacción) y varios repos/
// servicios de lectura. Se mockean todos para poder probar la lógica de
// `opciones.fecha` (Evaluacion.fecha + StatsCalculados.createdAt) sin abrir
// la BD real, mismo criterio que landing.test.ts / auditoria-superadmin.test.ts.
// `vi.hoisted` (no un `const` suelto): agregar una CUARTA `const … = vi.fn()`
// acá rompía con un `ReferenceError` de TDZ al mockear `@/lib/db` — el
// hoisting automático de Vitest para variables sueltas no es confiable en
// este caso, `vi.hoisted` sí lo garantiza.
const { evaluacionCreate, statsCalculadosCreate, logroJugadorUpdateMany, jugadorFindFirst } =
  vi.hoisted(() => ({
    evaluacionCreate: vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: "eval1",
      ...args.data,
    })),
    statsCalculadosCreate: vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: "stats1",
      ...args.data,
    })),
    logroJugadorUpdateMany: vi.fn(async () => ({ count: 0 })),
    // Usado por `evaluarJugadorPorId` (vía `obtenerJugador`, sin mockear —
    // el repositorio real solo llama a `db.jugador.findFirst`).
    jugadorFindFirst: vi.fn(async (): Promise<unknown> => null),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        evaluacion: { create: evaluacionCreate },
        statsCalculados: { create: statsCalculadosCreate },
        logroJugador: { updateMany: logroJugadorUpdateMany },
      }),
    ),
    jugador: { findFirst: jugadorFindFirst },
  },
}));
vi.mock("@/repositories/escuela.repository", () => ({
  obtenerEscuela: vi.fn(async () => ({ topeBonusEntreEvals: 3 })),
}));
vi.mock("@/repositories/parametro.repository", () => ({
  obtenerParametroGlobal: vi.fn(async () => null),
}));
vi.mock("@/services/parametro-escuela.service", () => ({
  resolverParametrosEscuela: vi.fn(async () => ({})),
}));
vi.mock("@/repositories/evaluacion.repository", () => ({
  bonusPendientes: vi.fn(async () => []),
  obtenerEvaluacion: vi.fn(),
  marcarEvaluacionAnulada: vi.fn(),
}));
vi.mock("@/repositories/logro.repository", () => ({
  listarConfigLogrosEscuela: vi.fn(async () => []),
}));
vi.mock("@/services/categoria-rango.service", () => ({
  obtenerRangosFisicosDeCategoria: vi.fn(async () => RANGOS_POR_GRUPO.SUB10),
}));

import { RANGOS_POR_GRUPO } from "@/lib/stats-engine";
import { evaluarJugadorCore, evaluarJugadorPorId } from "@/services/evaluacion.service";
import { NotFoundError } from "@/lib/errors";
import type { EvaluacionInput } from "@/lib/validators/evaluacion";

const jugador = {
  id: "jug1",
  categoriaId: "cat1",
  posicion: "MED",
} as unknown as Parameters<typeof evaluarJugadorCore>[2];

const input: EvaluacionInput = {
  jugadorId: "jug1",
  sprint30mSeg: 5.5,
  saltoVerticalCm: 30,
  agilidadIllinoisSeg: 18,
  resistenciaYoyoNivel: 10,
  controlBalon: 7,
  pase: 7,
  tiro: 6,
  regate: 7,
  actitud: 8,
  concentracion: 7,
  trabajoEquipo: 8,
  resiliencia: 7,
};

describe("evaluarJugadorCore — override de fecha", () => {
  it("sin `opciones.fecha` usa el instante actual (comportamiento por defecto sin cambios)", async () => {
    const antes = Date.now();
    await evaluarJugadorCore("esc1", "ent1", jugador, input);
    const despues = Date.now();

    const dataEval = evaluacionCreate.mock.calls.at(-1)![0].data as { fecha: Date };
    const dataStats = statsCalculadosCreate.mock.calls.at(-1)![0].data as {
      createdAt: Date;
    };
    expect(dataEval.fecha).toBeInstanceOf(Date);
    expect(dataEval.fecha.getTime()).toBeGreaterThanOrEqual(antes);
    expect(dataEval.fecha.getTime()).toBeLessThanOrEqual(despues);
    expect(dataStats.createdAt.getTime()).toBe(dataEval.fecha.getTime());
  });

  it("con `opciones.fecha` backdatea Evaluacion.fecha y StatsCalculados.createdAt", async () => {
    const fecha = new Date("2026-07-01T15:00:00.000Z");
    await evaluarJugadorCore("esc1", "ent1", jugador, input, { fecha });

    const dataEval = evaluacionCreate.mock.calls.at(-1)![0].data as { fecha: Date };
    const dataStats = statsCalculadosCreate.mock.calls.at(-1)![0].data as {
      createdAt: Date;
    };
    expect(dataEval.fecha).toEqual(fecha);
    expect(dataStats.createdAt).toEqual(fecha);
  });
});

describe("evaluarJugadorPorId", () => {
  it("resuelve el jugador por id (sin que el llamador importe el repositorio) y delega en evaluarJugadorCore", async () => {
    jugadorFindFirst.mockResolvedValueOnce(jugador);
    const fecha = new Date("2026-08-01T12:00:00.000Z");

    await evaluarJugadorPorId("esc1", "ent1", "jug1", input, { fecha });

    expect(jugadorFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "jug1", escuelaId: "esc1" } }),
    );
    const dataEval = evaluacionCreate.mock.calls.at(-1)![0].data as { fecha: Date };
    expect(dataEval.fecha).toEqual(fecha);
  });

  it("lanza NotFoundError si el jugador no existe en esa escuela", async () => {
    jugadorFindFirst.mockResolvedValueOnce(null);

    await expect(evaluarJugadorPorId("esc1", "ent1", "inexistente", input)).rejects.toThrow(
      NotFoundError,
    );
  });
});
