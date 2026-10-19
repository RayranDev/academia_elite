# P04 — Manual de un módulo (verificado ejecutando la app)

> **Cuándo usarlo:** para escribir o reverificar el manual de uno o varios módulos.
> Un módulo por vez.
> **Entrada:** app en local con base de pruebas · credenciales · `<ROL>` y `<MODULO>`
> (p. ej. `Entrenador` / `Mediciones y evaluación`, `Súper Admin` / `Fondos`,
> `Súper Admin` / `Logros`).
> **Salida:** `docs/manuales/fuentes/<rol>/<modulo>.md`, capturas en
> `docs/manuales/img/<rol>/<modulo>/` y fila actualizada en `docs/manuales/INDICE.md`.
> **Política:** `docs/politicas/POLITICA-MANUALES.md`.

**Antes de lanzarlo:** app en local contra la base de pruebas
(`npm run db:reset && npm run db:seed && npm run dev`). Nunca producción.

---

## Prompt

Eres redactor técnico y probador. Vas a escribir el manual del módulo **`<MODULO>`**
del rol **`<ROL>`** de Fútbol Career Mode, **comprobando cada afirmación en pantalla**.

Lee primero `docs/politicas/POLITICA-MANUALES.md` y síguela completa (plantilla de
ficha del §4, privacidad del §5, estilo del §6, definición de terminado del §9).
Puedes consultar el código y `docs/` para entender *por qué* algo funciona así, pero
**lo que escribes lo has visto ocurrir**.

**Datos de la prueba**
- URL: `http://localhost:<PUERTO>`
- Credenciales: `<ROL>`: `<correo>` / `<clave>` · otros roles que necesites para
  comprobar el efecto: `<correo>` / `<clave>`.

**Procedimiento**
1. Prepara el contexto mínimo del módulo y documenta qué datos hacen falta.
2. Inventaría **todos** los controles de la pantalla (botones, campos, filtros,
   menús, interruptores, íconos, acciones de fila, modales).
3. Presiona cada uno: camino feliz, camino de error (copia el mensaje **literal**) y
   efecto (¿qué cambió y dónde se ve? Compruébalo entrando con el otro rol).
4. Prueba la reversa (cancelar, editar, desactivar, eliminar) y los estados límite
   (vacío, un elemento, muchos, móvil 375 px).
5. Captura la pantalla real durante la ejecución: **sin caras de menores** (solo
   avatares o imágenes de prueba) y **sin credenciales ni correos reales**.
6. Escribe la ficha con la plantilla. Usa los nombres de botones y campos
   exactamente como aparecen en pantalla.
7. Si algo funciona de forma confusa o incorrecta, **no lo tapes**: descríbelo como
   "Comportamiento conocido" y registra el hallazgo (formato de `POLITICA-QA.md` §6).
8. Actualiza la fila del módulo en `INDICE.md` (versión de `package.json` + SHA corto,
   fecha, estado).

**No avances de módulo** hasta cumplir la definición de terminado del §9. No hagas
commits. Responde al final con: módulo, controles totales/probados, hallazgos
registrados y qué quedó sin probar.
