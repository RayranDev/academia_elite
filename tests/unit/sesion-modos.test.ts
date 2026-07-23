import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Modo Sesión (PLAN-UX-DT PR-1 §1.4). Se mockea SOLO el cliente Prisma: los
 * repositorios y los services corren de verdad, así los tests cubren la lógica
 * real (mapeo de estados, corrección post-cierre, clamping de goles) y no un
 * doble. `dt-scope` se mockea para fijar el alcance del DT sin tocar la BD.
 */

// `vi.mock` se eleva al tope del archivo, así que las fixtures que usan sus
// factories deben crearse dentro de `vi.hoisted` para existir a tiempo.
const { db, evento, jugador, statActual, publicarResultadoYNotificar } =
  vi.hoisted(() => {
    const evento = {
      id: "ev1",
      categoriaId: "cat1",
      tipo: "PARTIDO",
      titulo: "vs. Academia Sur",
      rival: "Academia Sur",
      esLocal: true,
      sesionIniciadaAt: null as Date | null,
      sesionCerradaAt: null as Date | null,
      resultadoLocal: null as number | null,
      resultadoVisitante: null as number | null,
      convocados: [{ jugadorId: "j1" }],
    };
    const jugador = { id: "j1", categoriaId: "cat1" };
    const statActual = { goles: 0, asistencias: 0, amarillas: 0 };

    const db = {
      evento: {
        findFirst: vi.fn(async () => evento),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      jugador: { findFirst: vi.fn(async () => jugador) },
      asistencia: { upsert: vi.fn(async () => ({})) },
      jugadorConvocado: { upsert: vi.fn(async () => ({})) },
      estadisticaPartido: {
        findUnique: vi.fn(async () => statActual),
        upsert: vi.fn(async () => ({})),
      },
      observacionJugador: { create: vi.fn(async () => ({})) },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
    };

    return {
      db,
      evento,
      jugador,
      statActual,
      publicarResultadoYNotificar: vi.fn(async () => {}),
    };
  });

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@/services/dt-scope", () => ({
  categoriasDelDt: vi.fn(async () => ({
    escuelaId: "esc1",
    entrenadorId: "dt1",
    categoriaIds: ["cat1"],
  })),
}));

vi.mock("@/services/evento.service", () => ({ publicarResultadoYNotificar }));

import type { AuthContext } from "@/lib/auth/context";
import { ValidationError } from "@/lib/errors";
import {
  marcarAsistenciaUnitaria,
  iniciarSesion,
  cerrarSesion,
  agregarConvocadoEnCancha,
  registrarGolVivo,
  marcarTarjeta,
} from "@/services/sesion.service";

const dt: AuthContext = {
  userId: "u-dt",
  rol: "DT",
  escuelaId: "esc1",
  entrenadorId: "dt1",
};

/**
 * Argumento de un upsert/updateMany de Prisma, para aserciones legibles. Los
 * campos van no-opcionales a propósito: el helper castea y cada test sabe qué
 * forma espera, así las aserciones no se llenan de `?.`.
 */
interface ArgPrisma {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  data: Record<string, unknown>;
}

/** Primer argumento de la n-ésima llamada a un mock, tipado. */
function argDe(
  mock: { mock: { calls: unknown[][] } },
  llamada = 0,
): ArgPrisma {
  return mock.mock.calls[llamada]?.[0] as ArgPrisma;
}

beforeEach(() => {
  vi.clearAllMocks();
  evento.sesionCerradaAt = null;
  evento.resultadoLocal = null;
  evento.resultadoVisitante = null;
  evento.tipo = "PARTIDO";
  evento.esLocal = true;
  jugador.categoriaId = "cat1";
  statActual.goles = 0;
  statActual.asistencias = 0;
});

describe("mapeo de los 3 estados de asistencia", () => {
  it("PRESENTE = presente true, justificado false", async () => {
    await marcarAsistenciaUnitaria(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      estado: "PRESENTE",
    });
    const arg = argDe(db.asistencia.upsert);
    expect(arg.create).toMatchObject({ presente: true, justificado: false });
  });

  it("AUSENTE = presente false, justificado false", async () => {
    await marcarAsistenciaUnitaria(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      estado: "AUSENTE",
    });
    const arg = argDe(db.asistencia.upsert);
    expect(arg.create).toMatchObject({ presente: false, justificado: false });
  });

  it("JUSTIFICADO = presente false, justificado true", async () => {
    await marcarAsistenciaUnitaria(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      estado: "JUSTIFICADO",
    });
    const arg = argDe(db.asistencia.upsert);
    expect(arg.create).toMatchObject({ presente: false, justificado: true });
  });
});

describe("corrección posterior al cierre", () => {
  it("con la sesión cerrada setea corregidoAt y el autor, no marcadoAt", async () => {
    evento.sesionCerradaAt = new Date("2026-01-01T10:00:00Z");
    await marcarAsistenciaUnitaria(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      estado: "AUSENTE",
    });
    const arg = argDe(db.asistencia.upsert);
    expect(arg.update.corregidoAt).toBeInstanceOf(Date);
    expect(arg.update.corregidoPorId).toBe("u-dt");
    expect(arg.update.marcadoAt).toBeUndefined();
  });

  it("con la sesión abierta setea marcadoAt y no corregidoAt", async () => {
    await marcarAsistenciaUnitaria(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      estado: "PRESENTE",
    });
    const arg = argDe(db.asistencia.upsert);
    expect(arg.update.marcadoAt).toBeInstanceOf(Date);
    expect(arg.update.corregidoAt).toBeUndefined();
  });
});

describe("registrarGolVivo", () => {
  it("suma al lado propio y a la stat del anotador", async () => {
    const r = await registrarGolVivo(dt, {
      eventoId: "ev1",
      anotadorId: "j1",
      esRival: false,
      delta: 1,
    });
    expect(r).toEqual({ local: 1, visitante: 0 });
    const stat = argDe(db.estadisticaPartido.upsert);
    expect(stat.update).toMatchObject({ goles: 1 });
  });

  it("delta -1 no baja el marcador de 0 ni la stat individual", async () => {
    const r = await registrarGolVivo(dt, {
      eventoId: "ev1",
      anotadorId: "j1",
      esRival: false,
      delta: -1,
    });
    expect(r).toEqual({ local: 0, visitante: 0 });
    const stat = argDe(db.estadisticaPartido.upsert);
    expect(stat.update).toMatchObject({ goles: 0 });
  });

  it("delta -1 revierte un gol ya cargado", async () => {
    evento.resultadoLocal = 2;
    evento.resultadoVisitante = 1;
    statActual.goles = 2;
    const r = await registrarGolVivo(dt, {
      eventoId: "ev1",
      anotadorId: "j1",
      esRival: false,
      delta: -1,
    });
    expect(r).toEqual({ local: 1, visitante: 1 });
    const stat = argDe(db.estadisticaPartido.upsert);
    expect(stat.update).toMatchObject({ goles: 1 });
  });

  it("el gol rival mueve el otro lado y no toca stats individuales", async () => {
    const r = await registrarGolVivo(dt, {
      eventoId: "ev1",
      esRival: true,
      delta: 1,
    });
    expect(r).toEqual({ local: 0, visitante: 1 });
    expect(db.estadisticaPartido.upsert).not.toHaveBeenCalled();
  });

  it("rechaza si el evento no es un partido", async () => {
    evento.tipo = "ENTRENAMIENTO";
    await expect(
      registrarGolVivo(dt, { eventoId: "ev1", esRival: true, delta: 1 }),
    ).rejects.toThrow(ValidationError);
  });
});

describe("agregarConvocadoEnCancha", () => {
  it("rechaza a un jugador de otra categoría", async () => {
    jugador.categoriaId = "cat-otra";
    await expect(
      agregarConvocadoEnCancha(dt, { eventoId: "ev1", jugadorId: "j1" }),
    ).rejects.toThrow(ValidationError);
    expect(db.jugadorConvocado.upsert).not.toHaveBeenCalled();
  });

  it("convoca y marca presente al jugador de la categoría del evento", async () => {
    await agregarConvocadoEnCancha(dt, { eventoId: "ev1", jugadorId: "j1" });
    expect(db.jugadorConvocado.upsert).toHaveBeenCalledTimes(1);
    const arg = argDe(db.asistencia.upsert);
    expect(arg.create).toMatchObject({ presente: true, agregadoEnCancha: true });
  });
});

describe("cerrarSesion", () => {
  it("dispara UNA sola notificación aunque se hayan cargado 5 goles en vivo", async () => {
    for (let i = 0; i < 5; i++) {
      await registrarGolVivo(dt, {
        eventoId: "ev1",
        anotadorId: "j1",
        esRival: false,
        delta: 1,
      });
    }
    // Ningún gol en caliente notifica a las familias.
    expect(publicarResultadoYNotificar).not.toHaveBeenCalled();

    evento.resultadoLocal = 5;
    evento.resultadoVisitante = 0;
    await cerrarSesion(dt, { eventoId: "ev1", notaSesion: "Buen partido" });
    expect(publicarResultadoYNotificar).toHaveBeenCalledTimes(1);
  });

  it("un entrenamiento no publica resultado ni notifica", async () => {
    evento.tipo = "ENTRENAMIENTO";
    await cerrarSesion(dt, { eventoId: "ev1" });
    expect(publicarResultadoYNotificar).not.toHaveBeenCalled();
  });

  it("un partido sin resultado cargado no notifica", async () => {
    await cerrarSesion(dt, { eventoId: "ev1" });
    expect(publicarResultadoYNotificar).not.toHaveBeenCalled();
  });
});

describe("iniciarSesion", () => {
  it("solo arranca el cronómetro si aún no arrancó (no lo resetea)", async () => {
    await iniciarSesion(dt, "ev1");
    const arg = argDe(db.evento.updateMany);
    // La guarda vive en el WHERE: una segunda llamada no matchea ninguna fila.
    expect(arg.where).toMatchObject({ id: "ev1", sesionIniciadaAt: null });
    expect(arg.data.sesionIniciadaAt).toBeInstanceOf(Date);
  });
});

describe("marcarTarjeta", () => {
  it("la amarilla topea en 2", async () => {
    statActual.amarillas = 2;
    await marcarTarjeta(dt, {
      eventoId: "ev1",
      jugadorId: "j1",
      tipo: "AMARILLA",
    });
    const arg = argDe(db.estadisticaPartido.upsert);
    expect(arg.update).toMatchObject({ amarillas: 2 });
  });

  it("la roja setea la bandera", async () => {
    await marcarTarjeta(dt, { eventoId: "ev1", jugadorId: "j1", tipo: "ROJA" });
    const arg = argDe(db.estadisticaPartido.upsert);
    expect(arg.update).toMatchObject({ roja: true });
  });
});
