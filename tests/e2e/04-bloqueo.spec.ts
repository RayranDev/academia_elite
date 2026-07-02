import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// G2: la escuela bloquea el acceso de una familia; al entrar ve el mensaje.
// El test deja el estado como lo encontró (desbloquea al final).

async function logout(page: Page) {
  await page.goto("/api/salir");
  await page.waitForURL(/\/login/, { timeout: 15000 });
}

async function abrirFichaLucas(page: Page) {
  await page.goto("/escuela/jugadores");
  await page.getByLabel("Buscar jugador").fill("Lucas");
  // La búsqueda tiene debounce (350ms) + filtrado server-side: hay que esperar
  // a que la navegación con ?q=Lucas se asiente ANTES de interactuar, si no el
  // refetch en vuelo re-renderiza la fila bajo el click (carrera que el SQLite
  // local ocultaba por instantáneo; Postgres remoto la expone).
  await page.waitForURL(/[?&]q=Lucas/, { timeout: 15000 });
  await expect(page.getByText("Lucas García").first()).toBeVisible();
  // Solo Lucas en la lista filtrada: garantiza que el refetch terminó.
  await expect(page.getByText("Lucas García")).toHaveCount(1);
}

test("una familia bloqueada ve su mensaje al entrar", async ({ page }) => {
  // 1) La escuela bloquea a la familia de Lucas con el motivo "Comunícate con tu DT".
  await login(page, "escuela@demo.app", "Demo1234!");
  await abrirFichaLucas(page);
  await page.getByRole("button", { name: "Bloquear", exact: true }).first().click();
  await page.locator('select[name="tipo"]').selectOption("CONTACTA_DT");
  await page.getByRole("button", { name: "Bloquear acceso" }).click();
  await expect(page.getByText("Bloqueado").first()).toBeVisible({ timeout: 15000 });
  await logout(page);

  // 2) La familia inicia sesión y termina en /bloqueado con el mensaje.
  await page.goto("/login");
  await page.fill('input[name="email"]', "jugador@demo.app");
  await page.fill('input[name="password"]', "Demo1234!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/bloqueado/, { timeout: 15000 });
  await expect(page.getByText("Acceso suspendido")).toBeVisible();
  await expect(page.getByText(/comunícate con tu director técnico/i)).toBeVisible();
  await logout(page);

  // 3) Limpieza: la escuela desbloquea para dejar el estado original.
  await login(page, "escuela@demo.app", "Demo1234!");
  await abrirFichaLucas(page);
  await page.getByRole("button", { name: "Desbloquear", exact: true }).first().click();
  await page.getByRole("button", { name: "Desbloquear", exact: true }).last().click();
  await expect(page.getByText("Bloqueado")).toHaveCount(0, { timeout: 15000 });
});
