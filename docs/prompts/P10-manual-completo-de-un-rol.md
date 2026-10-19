# P10 — Manual completo de un rol (Word y PDF)

> **Cuándo usarlo:** para producir el manual de usuario **completo** de un rol: todas sus
> pantallas, módulo por módulo, y el Word y el PDF finales. Es el prompt principal de
> manuales; P04 es solo para un módulo suelto.
> **Entrada:** `<ROL>` (`super-admin` | `escuela` | `entrenador` | `jugador`). **Desatendido:** el
> agente levanta solo su entorno aislado (`npm run qa:entorno`), trabaja y lo apaga.
> **Salida:** fichas en `docs/manuales/fuentes/<rol>/`, capturas en
> `docs/manuales/img/<rol>/`, y los entregables `docs/manuales/salida/<rol>/Manual_*.docx`
> y `.pdf`.
> **Se puede reanudar:** si se corta, se vuelve a lanzar; retoma lo que falte según la
> cobertura.
> **Política:** `docs/politicas/POLITICA-MANUALES.md` (v2).

**Antes de lanzarlo:** nada que preparar a mano: el agente levanta y apaga su propio entorno aislado.
Solo hace falta tener Chromium de Playwright instalado (`npx playwright install chromium`) para el PDF.

---

## Prompt

Vas a escribir el **manual completo del rol `<ROL>`** de Fútbol Career Mode. El
entregable final es un **Word (.docx) y un PDF** que usará una persona que no conoce el
sistema: el Markdown es solo el material de trabajo.

Lee primero, enteros: `docs/politicas/POLITICA-MANUALES.md` (v2, es tu contrato),
`AGENTS.md` y `docs/politicas/POLITICA-QA.md` §2 (entorno). Puedes consultar el código y
`docs/` para entender *por qué* algo funciona así, pero **lo que escribes lo has visto
ocurrir en pantalla**.

**Entorno (lo preparas tú, sin ayuda de nadie):**
1. Ejecuta `npm run qa:entorno`. Levanta la aplicación compilada en un puerto propio contra un
   **schema aparte (`qa`)** de la base, con fotos en disco local, sin correo ni Upstash, y deja la
   URL y las **cuentas demo** de cada rol en `scratch/qa/entorno.json`. **Nunca toca `public`** (los
   datos reales). Las cartas ya muestran al **niño de marca**, no avatares.
2. Lee ese archivo para saber la URL y las cuentas; no necesitas que te las pasen.
3. Al terminar, o si debes parar, ejecuta `npm run qa:detener`. Si `qa:entorno` dice que ya hay un
   entorno activo, otra sesión lo está usando: **no lo pises**, detente y repórtalo.
4. Nunca corras `db:reset` ni `db:seed` contra la base real; las guardias del proyecto lo bloquean.

**Paso 1 — Plan por cobertura (no por intuición)**
1. Ejecuta `npm run manuales:inventario` y `npm run manuales:cobertura`. Cada ruta de
   `<ROL>` que no esté cubierta es trabajo pendiente: **tu lista de tareas es esa lista**,
   no una selección de "los módulos importantes".
2. Agrupa las rutas en **módulos** siguiendo el menú real que ves en pantalla (una
   entrada de menú suele ser un módulo; los detalles `[id]` pertenecen al módulo de su
   listado). Define el orden de capítulos como aparece en el menú.
3. Si hay rutas que no merecen capítulo (redirecciones), propón su exclusión en
   `docs/manuales/roles.json` **con la razón**; no las dejes sin explicar.

**Paso 1b — Fichas que ya existen (hechas ANTES del entorno QA)**
Las fichas de `docs/manuales/fuentes/` creadas antes del 2026-10-19 (Mediciones y evaluación del
entrenador, Logros de los tres roles y Fondos del súper admin) tienen capturas con **dos defectos**: muestran el
círculo "N" de desarrollo de Next.js y **avatares dibujados** en lugar del niño de marca. Si en `<ROL>` ya
existe alguna ficha así, **no la des por cubierta**: reverifícala con el procedimiento de P04 y **recaptura
todas sus imágenes** en el entorno QA, enriqueciéndola con las figuras que le falten (reglas de capturas en
P04). No toques fichas de otro rol.

**Paso 2 — Un módulo a la vez, hasta terminar la lista**
Para cada módulo aplica el procedimiento de `docs/prompts/P04-manual-por-modulo.md`
(inventario de controles, camino feliz / error / efecto, reversa, estados límite,
capturas reales) y la plantilla de ficha de la política §4, con su cabecera
(`rol`, `modulo`, `orden`, `rutas`).
- Trabaja en **tandas de unos 5 módulos**; al cerrar cada tanda ejecuta
  `npm run manuales:optimizar` y `npm run manuales:cobertura` y comprueba que baja la
  lista de pendientes.
- Si tu entorno permite subagentes, delega **un módulo por subagente** con P04 (contexto
  limpio por módulo) y tú coordinas y revisas. No dos escritores sobre el mismo módulo.
- No avances de módulo sin cumplir la definición de terminado del §10 de la política.
- Aplica las **reglas de capturas** de P04 (todo lo capturado entra en la ficha, sin círculo "N", sin
  avatares, vista móvil por módulo).
- Lo técnico va en "Notas internas", nunca en la capa pública.
- Si algo funciona mal, **no lo disfraces**: regístralo como hallazgo (formato de
  `POLITICA-QA.md` §6) y descríbelo en "Notas internas".

**Paso 3 — Construir y revisar**
1. `npm run manuales:cobertura -- --estricto` debe dar 0 pendientes para `<ROL>`.
2. `npm run manuales:indice` y `npm run manuales:build -- --rol=<ROL>`.
3. Lee `docs/manuales/salida/_informe-construccion.md`: corrige **cada** fuga técnica e
   imagen faltante y vuelve a construir hasta que no haya avisos.
4. Abre el `.docx` y el `.pdf`. Revisa portada, índice, tablas desbordadas, imágenes
   ilegibles y numeración de figuras. Corrige y reconstruye.

**Capturas:** contra la aplicación **compilada** (`npm run build && npm run start`) o sin el
indicador de desarrollo de Next.js (el círculo "N" abajo a la izquierda no puede aparecer).

**Entrega del Word:** en Windows con Word, ejecuta `npm run manuales:word` para dejar el
índice con números de página antes de dar el .docx por terminado.

**Reglas:** solo `localhost` y datos ficticios; capturas **sin caras de menores ni
credenciales**; sin commits ni push; scripts de uso único en `scratch/`, nunca en
`scripts/`.

**Entrega.** Responde con: rol, **cobertura final** (rutas cubiertas / totales),
cantidad de módulos y de capturas, rutas de los dos archivos y su número de páginas,
hallazgos registrados, y todo lo que no pudiste probar o dejó avisos.
