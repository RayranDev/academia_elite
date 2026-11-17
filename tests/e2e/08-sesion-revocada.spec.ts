import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Revocación de sesiones y tope de intentos de login por el endpoint de Auth.js.
// Corre al final a propósito: cambia la contraseña de `admin@demo.app`, que ningún
// otro spec usa (la base E2E se recrea en cada corrida).
test.describe("Sesiones y límite de intentos", () => {
  test("cambiar la propia contraseña cierra TODAS las sesiones, la de este dispositivo incluida", async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    try {
      await login(pageA, "admin@demo.app", "Demo1234!");
      await login(pageB, "admin@demo.app", "Demo1234!");

      // Antes del cambio, la segunda sesión llega a la API protegida.
      const antes = await pageB.request.get("/api/auditoria-export");
      expect(antes.status()).toBe(200);

      await pageA.goto("/admin/cuenta");
      await pageA.fill('input[name="actual"]', "Demo1234!");
      await pageA.fill('input[name="nueva"]', "NuevaClave#2026");
      await pageA.fill('input[name="confirmacion"]', "NuevaClave#2026");
      await pageA.getByRole("button", { name: "Cambiar contraseña" }).click();

      // El dispositivo que cambió la contraseña vuelve al login con un mensaje
      // claro (no se refresca el JWT: ver la nota en `cambiarMiPasswordAction`).
      await expect(pageA).toHaveURL(/\/login\?clave=1/);
      await expect(pageA.getByText("Cambiaste tu contraseña")).toBeVisible();
      await pageA.goto("/admin");
      await expect(pageA).toHaveURL(/\/login/);

      // La otra sesión quedó revocada: la API responde como a un anónimo y las
      // páginas devuelven al login.
      const despues = await pageB.request.get("/api/auditoria-export");
      expect(despues.status()).toBe(401);
      await pageB.goto("/admin");
      await expect(pageB).toHaveURL(/\/login/);

      // Y con la contraseña nueva se entra normalmente.
      await login(pageA, "admin@demo.app", "NuevaClave#2026");
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("el endpoint de Auth.js también corta los intentos de contraseña", async ({
    request,
  }) => {
    // Correo inexistente: no toca cuentas reales y comprueba que el límite se
    // aplica igual (no revela si la cuenta existe).
    const email = `fuerza-bruta-${Date.now()}@demo.app`;
    const { csrfToken } = await (await request.get("/api/auth/csrf")).json();

    const intentar = async () => {
      const res = await request.post("/api/auth/callback/credentials", {
        form: { csrfToken, email, password: "incorrecta-1", callbackUrl: "/" },
        maxRedirects: 0,
      });
      return res.headers()["location"] ?? "";
    };

    // Los primeros 5 intentos son contraseña inválida; el 6.º ya no pasa por
    // la verificación: lo corta el tope, sin pasar por ninguna Server Action.
    for (let i = 0; i < 5; i++) {
      expect(await intentar()).toContain("code=credentials");
    }
    expect(await intentar()).toContain("code=demasiados_intentos");
  });
});
