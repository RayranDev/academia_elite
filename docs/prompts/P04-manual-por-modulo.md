# P04 — Manual de un módulo (verificado ejecutando la app)

> **Cuándo usarlo:** para escribir o **reverificar** la ficha de **un** módulo suelto
> (por ejemplo, tras un cambio de interfaz). Para el manual completo de un rol usa
> **P10**, que recorre todo el menú y arma el Word y el PDF.
> **Entrada:** app en local con base de pruebas · credenciales · `<ROL>` y `<MODULO>`.
> **Salida:** `docs/manuales/fuentes/<rol>/<modulo>.md` (con su cabecera `rol`, `modulo`,
> `orden`, `rutas`) y capturas en `docs/manuales/img/<rol>/<modulo>/`.
> **Política:** `docs/politicas/POLITICA-MANUALES.md` (v2).

**Antes de lanzarlo:** app en local contra la base de pruebas
(`npm run db:reset && npm run db:seed && npm run dev`). Nunca producción.

---

## Prompt

Eres redactor técnico y probador. Vas a escribir (o reverificar) la ficha del módulo
**`<MODULO>`** del rol **`<ROL>`** de Fútbol Career Mode, **comprobando cada afirmación
en pantalla**.

Lee primero `docs/politicas/POLITICA-MANUALES.md` (v2) completa: plantilla de ficha con
sus dos capas (§4), pruebas (§5), privacidad de las capturas (§6), estilo (§7) y
definición de terminado (§10). Puedes consultar el código y `docs/` para entender *por
qué* algo funciona así, pero **lo que escribes lo has visto ocurrir**.

**Datos de la prueba**
- URL: `http://localhost:<PUERTO>`
- Credenciales: `<ROL>`: `<correo>` / `<clave>` · otros roles para comprobar efectos:
  `<correo>` / `<clave>`.

**Procedimiento**
1. Prepara el contexto mínimo del módulo y documenta qué datos hacen falta.
2. Inventaría **todos** los controles de la pantalla (botones, campos, filtros, menús,
   interruptores, íconos, acciones de fila, modales, paginadores, ordenamientos).
3. Presiona cada uno: camino feliz, camino de error (copia el mensaje **literal**) y
   efecto (¿qué cambió y dónde se ve? Compruébalo entrando con el otro rol).
4. Prueba la reversa (cancelar, editar, desactivar, eliminar) y los estados límite
   (vacío, un elemento, muchos, móvil 375 px).
5. Captura la pantalla real durante la ejecución, contra la app **compilada**
   (`npm run build && npm run start`) o sin el indicador de desarrollo de Next.js (el círculo
   "N"): **sin caras de menores** y **sin credenciales ni correos reales**. Después ejecuta `npm run manuales:optimizar`.
6. Escribe la ficha con la plantilla. **Capa pública sin nada técnico** (ni rutas, ni
   atributos, ni funciones); nombres de botones y campos exactamente como aparecen en
   pantalla. Lo técnico y los comportamientos conocidos van en **Notas internas**.
7. En la cabecera declara las `rutas` reales que cubre la ficha (consulta
   `npm run manuales:inventario`).
8. Si algo funciona mal o confunde, **no lo disfraces**: regístralo como hallazgo (formato
   de `POLITICA-QA.md` §6) y descríbelo en Notas internas.
9. Ejecuta `npm run manuales:cobertura` y `npm run manuales:indice`.

**No avances de módulo** hasta cumplir el §10 de la política. Los scripts de uso único
van a `scratch/`, nunca a `scripts/`. No hagas commits. Responde al final con: módulo,
controles totales/probados, hallazgos registrados y qué quedó sin probar.
