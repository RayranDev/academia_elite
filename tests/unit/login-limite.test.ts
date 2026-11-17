import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * El tope de intentos de login vive DENTRO de los `authorize` de `src/auth.ts`:
 * el endpoint /api/auth/callback/* llega al mismo código, así que no hay forma de
 * adivinar contraseñas sin pasar por el tope. Se mockea Auth.js (para capturar la
 * config con los providers reales), el rate limit y el acceso a datos.
 */
const { capturado, rateLimit, buscarCredencialesPorEmail, verifyPassword, verificarOtp, signIn } =
  vi.hoisted(() => ({
    capturado: { config: null as null | { providers: ProviderCapturado[] } },
    rateLimit: vi.fn(),
    buscarCredencialesPorEmail: vi.fn(),
    verifyPassword: vi.fn(),
    verificarOtp: vi.fn(),
    signIn: vi.fn(),
  }));

type ProviderCapturado = {
  id?: string;
  authorize: (
    credentials: Record<string, unknown>,
    request: Request,
  ) => Promise<Record<string, unknown> | null>;
};

vi.mock("next-auth", () => {
  class AuthError extends Error {}
  class CredentialsSignin extends AuthError {
    code = "credentials";
  }
  return {
    default: (config: { providers: ProviderCapturado[] }) => {
      capturado.config = config;
      return {
        handlers: {},
        auth: vi.fn(),
        signIn,
        signOut: vi.fn(),
        unstable_update: vi.fn(),
      };
    },
    AuthError,
    CredentialsSignin,
  };
});
vi.mock("next-auth/providers/credentials", () => ({
  default: (opciones: ProviderCapturado) => opciones,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/repositories/user.repository", () => ({ buscarCredencialesPorEmail }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword }));
vi.mock("@/services/otp.service", () => ({
  verificarOtp,
  rolPorEmail: vi.fn(async () => "DT"),
}));
// `auth.actions` importa `session.ts` (server-only + Prisma) solo por `panelPorRol`.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ panelPorRol: () => "/dt" }));

import { huellaDePassword } from "@/lib/auth/huella-password";
import { LimiteIntentosError, esLimiteDeIntentos } from "@/lib/auth/limite-login";
import { login } from "@/actions/auth.actions";
import "@/auth";

function proveedor(id: string): ProviderCapturado {
  const p = capturado.config?.providers.find((x) => (x.id ?? "credentials") === id);
  if (!p) throw new Error(`provider ${id} no registrado`);
  return p;
}

const peticion = (ip = "203.0.113.7") =>
  new Request("http://localhost/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });

const PASSWORD_HASH = "$2a$12$hashDePruebaQueNoSeDebeFiltrarNunca";
const usuario = {
  id: "u1",
  email: "dt@demo.app",
  nombre: "DT",
  rol: "DT",
  escuelaId: "esc1",
  activo: true,
  passwordHash: PASSWORD_HASH,
};

const ok = { ok: true, remaining: 1, retryAfterMs: 0 };
const bloqueado = { ok: false, remaining: 0, retryAfterMs: 30_000 };

beforeEach(() => {
  // reset (no solo clear): descarta también las respuestas "once" sin consumir.
  vi.resetAllMocks();
  rateLimit.mockResolvedValue(ok);
  buscarCredencialesPorEmail.mockResolvedValue(usuario);
  verifyPassword.mockResolvedValue(true);
});

describe("authorize de contraseña: el tope vive acá", () => {
  const credenciales = { email: "DT@demo.app", password: "x" };

  it("cuenta el intento por IP+correo y por correo solo (sin IP)", async () => {
    await proveedor("credentials").authorize(credenciales, peticion("198.51.100.4"));

    expect(rateLimit).toHaveBeenCalledTimes(2);
    // Mismo tope que tenía la action: 5 por minuto por IP+correo (correo normalizado).
    expect(rateLimit).toHaveBeenNthCalledWith(1, "login:198.51.100.4:dt@demo.app", 5, 60_000);
    // Tope por correo, sin IP: no se esquiva rotando de IP.
    expect(rateLimit).toHaveBeenNthCalledWith(2, "login-correo:dt@demo.app", 20, 15 * 60_000);
  });

  it("si se superó el tope por IP+correo, corta ANTES de tocar la base o bcrypt", async () => {
    rateLimit.mockResolvedValueOnce(bloqueado);

    await expect(
      proveedor("credentials").authorize(credenciales, peticion()),
    ).rejects.toBeInstanceOf(LimiteIntentosError);

    expect(buscarCredencialesPorEmail).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
    // No gasta el cupo por correo cuando ya lo frenó el de IP+correo.
    expect(rateLimit).toHaveBeenCalledTimes(1);
  });

  it("si se superó el tope por correo (IP rotando), también corta antes de la base", async () => {
    rateLimit.mockResolvedValueOnce(ok).mockResolvedValueOnce(bloqueado);

    await expect(
      proveedor("credentials").authorize(credenciales, peticion("192.0.2.99")),
    ).rejects.toBeInstanceOf(LimiteIntentosError);

    expect(buscarCredencialesPorEmail).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("no revela si la cuenta existe: el corte es idéntico con o sin cuenta", async () => {
    const resultados: unknown[] = [];
    for (const cuenta of [usuario, null]) {
      buscarCredencialesPorEmail.mockResolvedValue(cuenta);
      rateLimit.mockResolvedValueOnce(bloqueado);
      resultados.push(
        await proveedor("credentials")
          .authorize(credenciales, peticion())
          .catch((e: unknown) => e),
      );
    }
    expect(resultados.every((e) => e instanceof LimiteIntentosError)).toBe(true);
    expect(buscarCredencialesPorEmail).not.toHaveBeenCalled();
  });

  it("una contraseña incorrecta devuelve null (credenciales inválidas), no el error de límite", async () => {
    verifyPassword.mockResolvedValue(false);
    await expect(
      proveedor("credentials").authorize(credenciales, peticion()),
    ).resolves.toBeNull();
  });

  it("datos mal formados salen antes y no consumen cupo", async () => {
    await expect(
      proveedor("credentials").authorize({ email: "no-es-correo", password: "x" }, peticion()),
    ).resolves.toBeNull();
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("un login correcto lleva la huella de la contraseña, nunca el hash", async () => {
    const user = await proveedor("credentials").authorize(credenciales, peticion());
    expect(user).toMatchObject({
      id: "u1",
      rol: "DT",
      huellaPassword: huellaDePassword(PASSWORD_HASH),
    });
    expect(JSON.stringify(user)).not.toContain(PASSWORD_HASH);
    expect(user?.huellaPassword).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("authorize de OTP: el tope vive acá", () => {
  const credenciales = { email: "dt@demo.app", codigo: "123456" };

  it("cuenta el intento por IP+correo (5 / 15 min) y por correo solo", async () => {
    verificarOtp.mockResolvedValue(null);
    await proveedor("otp").authorize(credenciales, peticion("198.51.100.4"));

    expect(rateLimit).toHaveBeenNthCalledWith(1, "otp-login:198.51.100.4:dt@demo.app", 5, 15 * 60_000);
    expect(rateLimit).toHaveBeenNthCalledWith(2, "otp-login-correo:dt@demo.app", 20, 15 * 60_000);
  });

  it("superado el tope, no llega a verificar el código", async () => {
    rateLimit.mockResolvedValueOnce(bloqueado);
    await expect(
      proveedor("otp").authorize(credenciales, peticion()),
    ).rejects.toBeInstanceOf(LimiteIntentosError);
    expect(verificarOtp).not.toHaveBeenCalled();
  });

  it("un OTP correcto lleva la huella que calculó el servicio", async () => {
    verificarOtp.mockResolvedValue({
      id: "u1",
      email: "dt@demo.app",
      nombre: "DT",
      rol: "DT",
      escuelaId: "esc1",
      huellaPassword: "0123456789abcdef",
    });
    const user = await proveedor("otp").authorize(credenciales, peticion());
    expect(user).toMatchObject({ id: "u1", huellaPassword: "0123456789abcdef" });
  });
});

describe("la action de login no cuenta el intento otra vez", () => {
  function formulario() {
    const fd = new FormData();
    fd.set("email", "dt@demo.app");
    fd.set("password", "x");
    return fd;
  }

  it("traduce el error de límite al mensaje de siempre, sin tocar el rate limit", async () => {
    signIn.mockRejectedValue(new LimiteIntentosError());
    const res = await login(undefined, formulario());
    expect(res).toEqual({
      ok: false,
      error: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    });
    // El conteo es de `authorize`: la action no vuelve a llamar al limitador.
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("un fallo de credenciales sigue siendo el mensaje genérico", async () => {
    const { CredentialsSignin } = await import("next-auth");
    signIn.mockRejectedValue(new CredentialsSignin());
    const res = await login(undefined, formulario());
    expect(res).toEqual({ ok: false, error: "Credenciales inválidas." });
  });
});

describe("esLimiteDeIntentos", () => {
  it("distingue el límite de un fallo de credenciales cualquiera", async () => {
    const { CredentialsSignin } = await import("next-auth");
    expect(esLimiteDeIntentos(new LimiteIntentosError())).toBe(true);
    expect(esLimiteDeIntentos(new CredentialsSignin())).toBe(false);
    expect(esLimiteDeIntentos(new Error("otro"))).toBe(false);
  });
});
