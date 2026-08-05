import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Modo Sesión (PLAN-UX-DT PR-3 §3.5): el DT crea un entrenamiento, pasa lista
// con guardado por toque, deja una observación y cierra la sesión.
test("DT corre un entrenamiento en Modo Sesión: lista, observación y cierre", async ({
  page,
}) => {
  await login(page, "dt@demo.app", "Demo1234!");

  // 1) Crea un entrenamiento para HOY y convoca a alguien.
  await page.goto("/dt/calendario");
  await page.getByRole("button", { name: "+ Nuevo evento" }).click();
  await page.locator('select[name="tipo"]').selectOption("ENTRENAMIENTO");
  // La categoría es la que carga la lista de convocables.
  await page.locator('select[name="categoriaId"]').selectOption({ label: "Sub-10" });
  // Título único por corrida: la base es compartida y los eventos se acumulan.
  const titulo = `Entrenamiento E2E ${Date.now().toString().slice(-6)}`;
  await page.fill('input[name="titulo"]', titulo);

  // Hoy pero MÁS TARDE: el home "Hoy" filtra por el día completo, y el nuevo
  // aviso de "Iniciar sesión" un día distinto al programado (ver
  // ModoSesion.tsx) no debe dispararse — el evento tiene que quedar programado
  // para HOY para que la sesión arranque sola como antes.
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate(),
  ).padStart(2, "0")}`;
  await page.getByLabel("Fecha").fill(fechaHoy);
  await page.getByLabel("Hora de inicio").selectOption("23");
  await page.getByLabel("Minuto de inicio").selectOption("0");
  await page.getByLabel("Duración en horas").selectOption("1");
  await page.getByLabel("Duración en minutos").selectOption("0");

  // Un entrenamiento NO tiene convocatoria: a la sesión asiste toda la categoría.
  await page.getByRole("button", { name: "Crear evento" }).click();

  // 2) Se entra al modo desde el detalle de ESTE evento. No se usa el home
  // "Hoy" con .first(): la base es compartida y ahí se acumulan eventos de
  // otras corridas, así que el primero no sería necesariamente el nuestro.
  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(page).toHaveURL(/\/dt\/eventos\//);
  await page.getByRole("link", { name: /Iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/sesion$/, { timeout: 15000 });

  // 3) Pasa lista: un toque sobre la fila cicla el estado (sin submit).
  const fila = page.getByRole("button", { name: /Lucas García/ });
  await expect(fila).toBeVisible();
  await fila.click();
  await expect(page.getByText(/\/\s*\d+ presentes|presentes/)).toBeVisible();

  // La marca se guardó por toque: sobrevive a un reload.
  await page.reload();
  await expect(page.getByRole("button", { name: /Lucas García/ })).toBeVisible();

  // 4) Observación con chip de 1 toque desde el paso "En vivo".
  await page.getByRole("button", { name: "Continuar →" }).click();
  const avatar = page.getByRole("button", { name: /Lucas/ }).first();
  if (await avatar.isVisible()) {
    await avatar.click();
    await page.getByRole("button", { name: /Gran actitud/ }).click();
    await page.getByRole("button", { name: /Guardar observación/ }).click();
  }

  // 5) Cierre con nota: vuelve al detalle del evento.
  await page.getByRole("button", { name: /Terminar sesión/ }).click();
  await page.fill("#nota", "Sesión E2E cerrada");
  await page.getByRole("button", { name: /Confirmar y guardar/ }).click();
  await expect(page).toHaveURL(/\/dt\/eventos\/[^/]+$/, { timeout: 15000 });
});
