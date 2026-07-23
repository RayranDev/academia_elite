import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Flujo crítico 1: código → registro padre → aprobación → evaluación → carta.
test("escuela genera código → familia se registra → DT aprueba y evalúa → nace la carta", async ({
  browser,
}) => {
  const ts = Date.now().toString().slice(-6);
  // Marcador único estable bajo Title Case (formatearNombre): "Fam123456" no se altera.
  const apellido = `Fam${ts}`;
  const email = `padre${ts}@e2e.test`;

  // 1) Escuela genera un código para Sub-12
  const ctxEsc = await browser.newContext();
  const pe = await ctxEsc.newPage();
  await login(pe, "escuela@demo.app", "Demo1234!");
  await pe.goto("/escuela/codigos");
  await pe.getByRole("button", { name: "+ Generar código" }).click();
  await pe.locator('select[name="categoriaId"]').selectOption({ label: "Sub-12" });
  await pe.getByRole("button", { name: "Generar", exact: true }).click();
  const codigo = (await pe.getByTestId("codigo-generado").innerText()).trim();
  expect(codigo).toMatch(/^[A-Z0-9]{8}$/);
  await ctxEsc.close();

  // 2) La familia se registra con el código
  const ctxFam = await browser.newContext();
  const pf = await ctxFam.newPage();
  await pf.goto(`/registro/${codigo}`);
  await pf.fill('input[name="padreNombre"]', "Padre E2E");
  await pf.fill('input[name="padreEmail"]', email);
  await pf.fill('input[name="password"]', "Demo1234!");
  await pf.fill('input[name="jugadorNombre"]', "HijoE2E");
  await pf.fill('input[name="jugadorApellido"]', apellido);
  await pf.fill('input[name="fechaNacimiento"]', "2013-05-10");
  await pf.locator('select[name="posicion"]').selectOption("DEL");
  // Habeas data: aceptar el tratamiento de datos es obligatorio para registrarse.
  await pf.check('input[name="aceptaTerminos"]');
  await pf.getByRole("button", { name: "Crear cuenta" }).click();
  // Auto-login: tras registrar con código válido, la familia entra directo a su hub.
  await expect(pf).toHaveURL(/\/jugador/, { timeout: 10000 });
  await ctxFam.close();

  // 3) El DT aprueba la solicitud y evalúa
  const ctxDt = await browser.newContext();
  const pd = await ctxDt.newPage();
  await login(pd, "dt@demo.app", "Demo1234!");
  await pd.goto("/dt/solicitudes");
  const tarjeta = pd.locator("div.rounded-2xl").filter({ hasText: apellido });
  await expect(tarjeta).toBeVisible();
  await tarjeta.getByRole("button", { name: "Aprobar" }).click();
  // La solicitud aprobada desaparece de la lista (confirma que surtió efecto).
  await expect(
    pd.locator("div.rounded-2xl").filter({ hasText: apellido }),
  ).toHaveCount(0);

  await pd.goto("/dt");
  await pd.getByRole("link", { name: new RegExp(apellido) }).first().click();
  await expect(pd).toHaveURL(/\/dt\/jugadores\//);
  await pd.getByRole("link", { name: "Evaluar ahora" }).click();

  // Cargar las 12 medidas
  const medidas: Record<string, string> = {
    sprint30mSeg: "5.0",
    saltoVerticalCm: "38",
    agilidadIllinoisSeg: "16.8",
    resistenciaYoyoNivel: "13",
    controlBalon: "8",
    pase: "8",
    tiro: "7",
    regate: "8",
    actitud: "9",
    concentracion: "8",
    trabajoEquipo: "9",
    resiliencia: "8",
  };
  for (const [name, valor] of Object.entries(medidas)) {
    await pd.fill(`input[name="${name}"]`, valor);
  }
  await pd
    .getByRole("button", { name: "Guardar evaluación y generar carta" })
    .click();

  // La carta nace
  await expect(pd.getByText("¡La carta nació!")).toBeVisible();
  await ctxDt.close();
});
