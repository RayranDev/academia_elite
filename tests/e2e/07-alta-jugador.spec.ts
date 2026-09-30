import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Alta completa de un jugador por pasos: identidad, ficha médica, acudiente y
// confirmación. La escuela carga TODO en un solo flujo y la familia entra con la
// contraseña temporal que se muestra una única vez.
test("la escuela da de alta un jugador con ficha y acudiente; la familia entra con su cuenta", async ({
  browser,
}) => {
  const ts = Date.now().toString().slice(-6);
  const nombre = `Alta${ts}`;
  const emailFamilia = `acudiente${ts}@e2e.test`;

  const ctxEsc = await browser.newContext();
  const pe = await ctxEsc.newPage();
  await login(pe, "escuela@demo.app", "Demo1234!");
  await pe.goto("/escuela/jugadores");
  await pe.getByRole("button", { name: "+ Nuevo jugador" }).click();
  const dialogo = pe.getByRole("dialog");

  // Validación en línea: no avanza con lo obligatorio vacío y lo dice.
  await dialogo.getByRole("button", { name: "Siguiente" }).click();
  await expect(dialogo.getByText("Nombre requerido.")).toBeVisible();
  await expect(dialogo.getByText("Elige una posición.")).toBeVisible();

  // Paso 1 · datos del jugador
  await dialogo.locator('[name="nombre"]').fill(nombre);
  await dialogo.locator('[name="apellido"]').fill("Completo");
  await dialogo.locator('[name="fechaNacimiento"]').fill("2014-05-20");
  await dialogo.locator('[name="posicion"]').selectOption("MED");
  await dialogo.locator('[name="categoriaId"]').selectOption({ label: "Sub-12" });
  await dialogo.locator('[name="tipoDocumento"]').selectOption("TI");
  await dialogo.locator('[name="numeroDocumento"]').fill("1023456789");
  await dialogo.getByRole("button", { name: "Siguiente" }).click();

  // Paso 2 · ficha médica: opcional; los datos de salud piden la autorización.
  await expect(dialogo.getByText("Todo este paso es opcional.")).toBeVisible();
  await expect(dialogo.locator('[name="eps"]')).toBeDisabled();
  await dialogo.getByLabel(/La familia autoriza el tratamiento/).check();
  await expect(dialogo.locator('[name="eps"]')).toBeEnabled();
  await dialogo.locator('[name="eps"]').fill("Sura");
  await dialogo.locator('[name="alergias"]').fill("Penicilina");
  await dialogo.locator('[name="contactoEmergenciaNombre"]').fill("Rosa Pérez");
  await dialogo.getByRole("button", { name: "Siguiente" }).click();

  // Paso 3 · acudiente: el correo es obligatorio si se carga y se valida.
  await dialogo.getByLabel("Registrar al acudiente ahora").check();
  await dialogo.locator('[name="acudienteNombre"]').fill("Rosa Pérez");
  await dialogo.locator('[name="acudienteEmail"]').fill("no-es-un-correo");
  await dialogo.getByRole("button", { name: "Revisar" }).click();
  await expect(dialogo.getByText("El correo del acudiente no es válido.")).toBeVisible();
  await expect(dialogo.getByText(/Confirma que el acudiente autoriza/)).toBeVisible();
  await dialogo.locator('[name="acudienteEmail"]').fill(emailFamilia);
  await dialogo.getByLabel(/autoriza el tratamiento de sus datos/).check();
  await dialogo.getByRole("button", { name: "Revisar" }).click();

  // Paso 4 · confirmar: el número de documento no se repite en claro.
  await expect(dialogo.getByText(nombre)).toBeVisible();
  await expect(dialogo.getByText(emailFamilia)).toBeVisible();
  await expect(dialogo.getByText("1023456789")).toHaveCount(0);
  await dialogo.getByRole("button", { name: "Crear jugador" }).click();

  // Éxito: credenciales visibles una sola vez.
  await expect(dialogo.getByText(/ya está en la plantilla/)).toBeVisible({ timeout: 20000 });
  const password = (
    await dialogo.locator("p.select-all.font-mono").innerText()
  ).trim();
  expect(password.length).toBeGreaterThanOrEqual(12);
  await dialogo.getByRole("button", { name: "Listo" }).click();
  await expect(pe.getByText(`${nombre} Completo`).first()).toBeVisible({ timeout: 15000 });
  await ctxEsc.close();

  // La familia entra con la cuenta creada.
  const ctxFam = await browser.newContext();
  const pf = await ctxFam.newPage();
  await login(pf, emailFamilia, password);
  await expect(pf).toHaveURL(/\/jugador/);
  await expect(pf.getByText(new RegExp(nombre, "i")).first()).toBeVisible({ timeout: 15000 });
  await ctxFam.close();
});

// El DT usa el mismo flujo, pero el servidor limita lo que guarda de la ficha:
// documento y EPS son de la escuela.
test("el DT da de alta un jugador sin acudiente y el formulario no le pide documento ni EPS", async ({
  page,
}) => {
  const ts = Date.now().toString().slice(-6);
  const nombre = `Dt${ts}`;
  await login(page, "dt@demo.app", "Demo1234!");
  await page.goto("/dt/plantilla");
  await page.getByRole("button", { name: "+ Nuevo jugador" }).click();
  const dialogo = page.getByRole("dialog");

  await dialogo.locator('[name="nombre"]').fill(nombre);
  await dialogo.locator('[name="apellido"]').fill("Sin Acudiente");
  await dialogo.locator('[name="fechaNacimiento"]').fill("2014-08-01");
  await dialogo.locator('[name="posicion"]').selectOption("DEL");
  await dialogo.locator('[name="categoriaId"]').selectOption({ index: 1 });
  await expect(dialogo.locator('[name="numeroDocumento"]')).toHaveCount(0);
  await dialogo.getByRole("button", { name: "Siguiente" }).click();
  await expect(dialogo.locator('[name="eps"]')).toHaveCount(0);
  await dialogo.getByRole("button", { name: "Siguiente" }).click();
  // Acudiente sin cargar: opcional.
  await dialogo.getByRole("button", { name: "Revisar" }).click();
  await expect(dialogo.getByText(/Sin acudiente: la familia/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Crear jugador" }).click();
  await expect(dialogo.getByText(/ya está en la plantilla/)).toBeVisible({ timeout: 20000 });
  await expect(dialogo.getByText(/Código del jugador/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByText(`${nombre} Sin Acudiente`).first()).toBeVisible({ timeout: 15000 });
});
