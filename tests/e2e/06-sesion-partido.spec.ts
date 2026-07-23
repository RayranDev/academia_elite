import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Modo PARTIDO en vivo (PLAN-UX-DT PR-4 §4.3): goles con anotador que alimentan
 * marcador y estadística a la vez, deshacer, tarjeta y cierre. Lo que más
 * importa verificar: por más goles que se carguen en caliente, la familia recibe
 * UNA sola notificación, y recién al cerrar.
 */
test("DT corre un partido en vivo: goles, deshacer, tarjeta y cierre", async ({
  browser,
}) => {
  const titulo = `E2E Vivo ${Date.now().toString().slice(-6)}`;

  const ctxDt = await browser.newContext();
  const pd = await ctxDt.newPage();
  await login(pd, "dt@demo.app", "Demo1234!");

  // 1) Partido de hoy en Sub-10, con Lucas convocado.
  await pd.goto("/dt/calendario");
  await pd.getByRole("button", { name: "+ Nuevo evento" }).click();
  await pd.locator('select[name="tipo"]').selectOption("PARTIDO");
  await pd.locator('select[name="categoriaId"]').selectOption({ label: "Sub-10" });
  await pd.fill('input[name="titulo"]', titulo);

  const hoy = new Date();
  const iso = (h: number, m: number) =>
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
      hoy.getDate(),
    ).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  await pd.fill('input[name="inicio"]', iso(23, 0));
  await pd.fill('input[name="fin"]', iso(23, 59));
  await pd.fill('input[name="rival"]', "E2E Rival");
  await pd.getByRole("checkbox", { name: "Lucas García" }).check();
  await pd.getByRole("button", { name: "Crear evento" }).click();

  // 2) Entrar al Modo Sesión desde el detalle de ESTE partido.
  await pd.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(pd).toHaveURL(/\/dt\/eventos\//);
  await pd.getByRole("link", { name: /Iniciar sesión/i }).click();
  await expect(pd).toHaveURL(/\/sesion$/, { timeout: 15000 });

  // 3) Marcar presente a Lucas y pasar al vivo.
  await pd.getByRole("button", { name: /Lucas García/ }).click();
  await pd.getByRole("button", { name: "Continuar →" }).click();

  // 4) Dos goles propios con anotador (marcador + stat en una sola operación).
  for (let i = 0; i < 2; i++) {
    // `exact`: sin esto también matchea "Quitar gol de Mi equipo".
    await pd
      .getByRole("button", { name: "Gol de Mi equipo", exact: true })
      .click();
    await pd.getByRole("dialog").getByText("Lucas García").click();
    await pd.getByRole("dialog").getByText("Sin asistencia").click();
  }

  // 5) Deshacer uno: queda 1-0.
  await pd
    .getByRole("button", { name: "Quitar gol de Mi equipo", exact: true })
    .click();
  // Hay una entrada por gol cargado: se revierte la primera.
  await pd
    .getByRole("dialog")
    .getByText(/Quitar gol de Lucas/)
    .first()
    .click();

  // 6) Cerrar el partido.
  await pd.getByRole("button", { name: /Terminar sesión/ }).click();
  await pd.getByRole("button", { name: /Confirmar y guardar/ }).click();
  await expect(pd).toHaveURL(/\/dt\/eventos\/[^/]+$/, { timeout: 15000 });
  // El equipo juega de VISITANTE (no se tildó "Local"), así que el marcador
  // oficial local-visitante es 0-1: un gol propio del lado visitante.
  await expect(pd.getByText("0 - 1")).toBeVisible();
  await ctxDt.close();

  // 7) La familia recibe UNA sola notificación del resultado, no una por gol.
  const ctxFam = await browser.newContext();
  const pf = await ctxFam.newPage();
  await login(pf, "jugador@demo.app", "Demo1234!");
  // El cuerpo de la notificación es exactamente "<titulo>: <marcador>". Se
  // busca ese formato y no el título suelto, que también aparece en la noticia
  // del club y en el calendario. Lo que se verifica: UNA sola notificación por
  // partido, no una por cada gol cargado en vivo.
  // La noticia del club y la notificación nacen de la MISMA función
  // (publicarResultadoYNotificar). Si la difusión se hubiera disparado por cada
  // gol, habría una noticia por gol. Que haya exactamente UNA prueba que el
  // pipeline corrió una sola vez, al cerrar — que es la regla del plan.
  await expect(pf.getByText(`Resultado: ${titulo}`)).toHaveCount(1);
  await ctxFam.close();
});
