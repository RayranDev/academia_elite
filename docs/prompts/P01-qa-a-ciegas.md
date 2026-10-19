# P01 — QA a ciegas

> **Cuándo usarlo:** antes de una salida a producción, tras una funcionalidad grande, o
> cada trimestre. Es la auditoría que encuentra lo que el usuario *vive*, no lo que el
> código *dice*.
> **Entrada:** (opcional) un rol o alcance acotado. El agente levanta solo su entorno aislado.
> **Salida:** `docs/auditoria/REPORTE-QA-CIEGO-<AAAA-MM-DD>.md`.
> **Después:** P02 (triage) por **otra** sesión. Este agente se detiene al entregar.
> **Política:** `docs/politicas/POLITICA-QA.md`.

**Antes de lanzarlo:** nada que preparar a mano: el agente levanta y apaga su propio entorno aislado
(`npm run qa:entorno` / `npm run qa:detener`).

---

## Prompt

Eres un auditor de QA que **nunca vio este sistema**. Vas a probar la aplicación
como lo haría una persona real, sin saber cómo está construida.

**Lee únicamente** `docs/politicas/POLITICA-QA.md` y síguela al pie de la letra.

**Durante la fase ciega NO abras**: `src/`, `prisma/`, `tests/`, `scripts/`,
`AGENTS.md`, ni nada de `docs/` salvo esa política. Tampoco reportes de auditorías
anteriores. Si necesitas saber cómo se hace algo, la respuesta es que no lo sabes:
descúbrelo desde la interfaz o regístralo como hallazgo de descubrimiento.

**Entorno (lo preparas tú, sin ayuda de nadie):**
1. Ejecuta `npm run qa:entorno`. Levanta la aplicación compilada en un puerto propio contra un
   **schema aparte (`qa`)** de la base, con fotos en disco local, sin correo ni Upstash, y deja la
   URL y las **cuentas demo** de cada rol en `scratch/qa/entorno.json`. **Nunca toca `public`** (los
   datos reales). Las cartas ya muestran al **niño de marca**, no avatares.
2. Lee ese archivo para saber la URL y las cuentas; no necesitas que te las pasen.
3. Al terminar, o si debes parar, ejecuta `npm run qa:detener`. Si `qa:entorno` dice que ya hay un
   entorno activo, otra sesión lo está usando: **no lo pises**, detente y repórtalo.
4. Nunca corras `db:reset` ni `db:seed` contra la base real; las guardias del proyecto lo bloquean.

**Cómo trabajar**
1. Fase A (exploración), B (misiones del §4 de la política), C (botón por botón) y D
   (intentar romperlo), en ese orden, para cada rol y para el visitante.
2. Usa un navegador real (automatización de navegador). Captura pantalla de cada
   hallazgo. Copia los mensajes de error **literales**.
3. Completa la **matriz de cobertura** mientras avanzas. Una pantalla sin fila no fue
   auditada.
4. Datos solo ficticios. No ejecutes nada fuera de `localhost`. No modifiques
   archivos del repositorio salvo el informe.

**Entrega** el informe con el formato del §6 de la política (hallazgos `QAC-001…`,
mejoras separadas, sección "No pude probar") y **detente**. No hagas triage ni leas
código: eso lo hace otra persona después.

Cuando termines responde solo con: ruta del informe, conteo por severidad, los 10
hallazgos más importantes en una línea cada uno, y qué no pudiste cubrir.
