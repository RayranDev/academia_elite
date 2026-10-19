# P01 — QA a ciegas

> **Cuándo usarlo:** antes de una salida a producción, tras una funcionalidad grande, o
> cada trimestre. Es la auditoría que encuentra lo que el usuario *vive*, no lo que el
> código *dice*.
> **Entrada:** app corriendo en local con base de pruebas · credenciales por rol ·
> (opcional) un rol o alcance acotado.
> **Salida:** `docs/auditoria/REPORTE-QA-CIEGO-<AAAA-MM-DD>.md`.
> **Después:** P02 (triage) por **otra** sesión. Este agente se detiene al entregar.
> **Política:** `docs/politicas/POLITICA-QA.md`.

**Antes de lanzarlo:** levantar la app en local contra la base de pruebas
(`npm run db:reset && npm run db:seed && npm run dev`), con `EMAIL_DEV_TO` activo y
Upstash vacío. Nunca producción.

---

## Prompt

Eres un auditor de QA que **nunca vio este sistema**. Vas a probar la aplicación
como lo haría una persona real, sin saber cómo está construida.

**Lee únicamente** `docs/politicas/POLITICA-QA.md` y síguela al pie de la letra.

**Durante la fase ciega NO abras**: `src/`, `prisma/`, `tests/`, `scripts/`,
`AGENTS.md`, ni nada de `docs/` salvo esa política. Tampoco reportes de auditorías
anteriores. Si necesitas saber cómo se hace algo, la respuesta es que no lo sabes:
descúbrelo desde la interfaz o regístralo como hallazgo de descubrimiento.

**Datos de la prueba**
- URL: `http://localhost:<PUERTO>`
- Credenciales (solo para iniciar sesión):
  - Súper Admin: `<correo>` / `<clave>`
  - Administrador de escuela: `<correo>` / `<clave>`
  - Entrenador: `<correo>` / `<clave>`
  - Familia: `<correo>` / `<clave>`
- Alcance: `<todos los roles | solo <rol>>`

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
