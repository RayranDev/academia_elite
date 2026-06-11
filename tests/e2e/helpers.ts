import { type Page, expect } from "@playwright/test";

/** Inicia sesión y espera la redirección al panel del rol. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(admin|escuela|dt|jugador)(\/|$)/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/(admin|escuela|dt|jugador)/);
}

/** Valor para <input type="datetime-local"> a N horas en el futuro (siempre > ahora). */
export function futuroInput(horasDesdeAhora: number): string {
  const t = new Date(Date.now() + horasDesdeAhora * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}
