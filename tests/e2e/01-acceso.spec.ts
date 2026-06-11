import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Flujo crítico 3: cruce de tenant/rol devuelve redirección o 404.
test.describe("Control de acceso", () => {
  test("sin sesión, una ruta protegida redirige a /login", async ({ page }) => {
    await page.goto("/dt");
    await expect(page).toHaveURL(/\/login/);
  });

  test("un rol no puede entrar al panel de otro rol", async ({ page }) => {
    await login(page, "dt@demo.app", "Demo1234!");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dt(\/|$)/);
    await page.goto("/escuela");
    await expect(page).toHaveURL(/\/dt(\/|$)/);
  });

  test("la foto sin sesión devuelve 404", async ({ page }) => {
    const res = await page.request.get("/api/archivos/foto/inexistente");
    expect(res.status()).toBe(404);
  });

  test("un recurso inexistente devuelve 404", async ({ page }) => {
    await login(page, "dt@demo.app", "Demo1234!");
    const res = await page.goto("/dt/jugadores/inexistente-xyz");
    expect(res?.status()).toBe(404);
  });

  test("cabeceras de seguridad presentes", async ({ page }) => {
    const res = await page.goto("/login");
    const headers = res?.headers() ?? {};
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });
});
