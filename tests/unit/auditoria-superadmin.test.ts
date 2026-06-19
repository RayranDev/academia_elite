import { describe, it, expect, vi } from "vitest";

// Las funciones de servicio importan repositorios que cargan el cliente Prisma
// (src/lib/db.ts lo instancia en el import). Mockeamos `db` para no abrir la BD:
// la regla de soporte (assertMotivoSoporte) se evalúa ANTES de cualquier query,
// así que el stub nunca se usa. (ROL-SUPER-ADMIN.md M1.)
vi.mock("@/lib/db", () => ({ db: {} }));

import { assertMotivoSoporte } from "@/lib/auth/guards";
import { ValidationError } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth/context";
import type { JugadorEditarInput } from "@/lib/validators/gestion";
import {
  editarJugador,
  cambiarEstadoJugadorGestion,
  eliminarJugadorLogico,
  restaurarJugador,
  resetPasswordFamilia,
} from "@/services/gestion-jugadores.service";
import { desbloquearAccesoJugador } from "@/services/bloqueo.service";

const sa: AuthContext = { userId: "sa", rol: "SUPER_ADMIN", escuelaId: null };
const escuela: AuthContext = {
  userId: "ea",
  rol: "ESCUELA_ADMIN",
  escuelaId: "esc1",
};

const MSG = "El soporte requiere un motivo.";

describe("assertMotivoSoporte", () => {
  it("lanza ValidationError si SUPER_ADMIN no da motivo", () => {
    expect(() => assertMotivoSoporte(sa)).toThrow(ValidationError);
    expect(() => assertMotivoSoporte(sa)).toThrow(MSG);
  });

  it("lanza ValidationError si el motivo es solo espacios", () => {
    expect(() => assertMotivoSoporte(sa, "   ")).toThrow(ValidationError);
  });

  it("no lanza si SUPER_ADMIN da un motivo", () => {
    expect(() => assertMotivoSoporte(sa, "Soporte: ticket #42")).not.toThrow();
  });

  it("es no-op para roles que operan en su propia escuela", () => {
    expect(() => assertMotivoSoporte(escuela)).not.toThrow();
    expect(() => assertMotivoSoporte(escuela, undefined)).not.toThrow();
  });
});

describe("escrituras cross-tenant del SUPER_ADMIN exigen motivo", () => {
  it("editarJugador rechaza sin motivo", async () => {
    await expect(
      editarJugador(sa, { jugadorId: "j1" } as unknown as JugadorEditarInput),
    ).rejects.toThrow(MSG);
  });

  it("cambiarEstadoJugadorGestion rechaza con motivo vacío", async () => {
    await expect(
      cambiarEstadoJugadorGestion(sa, "j1", "INACTIVO", "  "),
    ).rejects.toThrow(MSG);
  });

  it("eliminarJugadorLogico rechaza con motivo vacío", async () => {
    await expect(
      eliminarJugadorLogico(sa, "j1", "confirmación", ""),
    ).rejects.toThrow(MSG);
  });

  it("restaurarJugador rechaza sin motivo", async () => {
    await expect(restaurarJugador(sa, "j1")).rejects.toThrow(MSG);
  });

  it("resetPasswordFamilia rechaza sin motivo", async () => {
    await expect(resetPasswordFamilia(sa, "j1")).rejects.toThrow(MSG);
  });

  it("desbloquearAccesoJugador rechaza sin motivo", async () => {
    await expect(desbloquearAccesoJugador(sa, "j1")).rejects.toThrow(MSG);
  });
});
