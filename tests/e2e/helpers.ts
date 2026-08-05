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

/**
 * Fecha/hora/duración de un evento N horas en el futuro, ya en el formato que
 * espera el formulario nuevo (`CrearEventoDialog`/`EditarEventoDialog`): un
 * `<input type="date">` + selects de hora/minuto de inicio (franjas de 15') y
 * de duración en horas/minutos (franjas de 15'). El minuto de inicio se
 * redondea hacia abajo al múltiplo de 15 más cercano porque el select real
 * solo ofrece 0/15/30/45.
 */
export function eventoFuturo(horasDesdeAhora: number, duracionHoras: number) {
  const t = new Date(Date.now() + horasDesdeAhora * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const minutoRedondeado = Math.floor(t.getMinutes() / 15) * 15;
  return {
    fecha: `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`,
    hora: String(t.getHours()),
    minuto: String(minutoRedondeado),
    duracionHoras: String(duracionHoras),
    duracionMinutos: "0",
  };
}
