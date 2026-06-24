import { test, expect } from "@playwright/test";
import { login, futuroInput } from "./helpers";

// Flujo crítico 2: evento → convocatoria → confirmación → resultado → noticia.
test("DT crea partido y carga resultado; la familia confirma y ve la noticia", async ({
  browser,
}) => {
  const ts = Date.now().toString().slice(-6);
  const titulo = `E2E Partido ${ts}`;

  // 1) El DT crea un partido en Sub-10 y convoca
  const ctxDt = await browser.newContext();
  const pd = await ctxDt.newPage();
  await login(pd, "dt@demo.app", "Demo1234!");
  await pd.goto("/dt/calendario");
  await pd.getByRole("button", { name: "+ Nuevo evento" }).click();
  await pd.locator('select[name="tipo"]').selectOption("PARTIDO");
  await pd.locator('select[name="categoriaId"]').selectOption({ label: "Sub-10" });
  await pd.fill('input[name="titulo"]', titulo);
  await pd.fill('input[name="inicio"]', futuroInput(3));
  await pd.fill('input[name="fin"]', futuroInput(5));
  await pd.fill('input[name="rival"]', "E2E Rival");
  // Convoca al jugador de la familia demo (Lucas García). No usar .first(): la
  // lista se ordena por apellido, así que el primer checkbox NO es Lucas.
  await pd.getByRole("checkbox", { name: "Lucas García" }).check();
  await pd.getByRole("button", { name: "Crear evento" }).click();

  // 2) Navegar al evento desde "Próximos eventos" y cargar resultado
  await pd.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(pd).toHaveURL(/\/dt\/eventos\//);
  await pd.fill('input[name="resultadoLocal"]', "4");
  await pd.fill('input[name="resultadoVisitante"]', "2");
  await pd.getByRole("button", { name: "Cargar resultado" }).click();
  await expect(pd.getByText("4 - 2")).toBeVisible();
  await ctxDt.close();

  // 3) La familia confirma una convocatoria y ve la noticia del resultado
  const ctxFam = await browser.newContext();
  const pf = await ctxFam.newPage();
  await login(pf, "jugador@demo.app", "Demo1234!");
  await pf.getByRole("button", { name: "Confirmar" }).first().click();
  await expect(pf.getByText("Asistencia confirmada").first()).toBeVisible();
  await expect(pf.getByText(`Resultado: ${titulo}`)).toBeVisible();
  await ctxFam.close();
});
