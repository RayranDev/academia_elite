# P04 — Manual de un módulo (verificado ejecutando la app)

> **Cuándo usarlo:** para escribir o **reverificar** la ficha de **un** módulo suelto
> (por ejemplo, tras un cambio de interfaz). Para el manual completo de un rol usa
> **P10**, que recorre todo el menú y arma el Word y el PDF.
> **Entrada:** `<ROL>` y `<MODULO>`. El agente levanta solo su entorno aislado.
> **Salida:** `docs/manuales/fuentes/<rol>/<modulo>.md` (con su cabecera `rol`, `modulo`,
> `orden`, `rutas`) y capturas en `docs/manuales/img/<rol>/<modulo>/`.
> **Política:** `docs/politicas/POLITICA-MANUALES.md` (v2).

**Antes de lanzarlo:** nada que preparar a mano: el agente levanta y apaga su propio entorno aislado
(`npm run qa:entorno` / `npm run qa:detener`).

---

## Prompt

Eres redactor técnico y probador. Vas a escribir (o reverificar) la ficha del módulo
**`<MODULO>`** del rol **`<ROL>`** de Fútbol Career Mode, **comprobando cada afirmación
en pantalla**.

Lee primero `docs/politicas/POLITICA-MANUALES.md` (v2) completa: plantilla de ficha con
sus dos capas (§4), pruebas (§5), privacidad de las capturas (§6), estilo (§7) y
definición de terminado (§10). Puedes consultar el código y `docs/` para entender *por
qué* algo funciona así, pero **lo que escribes lo has visto ocurrir**.

**Entorno (lo preparas tú, sin ayuda de nadie):**
1. Ejecuta `npm run qa:entorno`. Levanta la aplicación compilada en un puerto propio contra un
   **schema aparte (`qa`)** de la base, con fotos en disco local, sin correo ni Upstash, y deja la
   URL y las **cuentas demo** de cada rol en `scratch/qa/entorno.json`. **Nunca toca `public`** (los
   datos reales). Las cartas ya muestran al **niño de marca**, no avatares.
2. Lee ese archivo para saber la URL y las cuentas; no necesitas que te las pasen.
3. Al terminar, o si debes parar, ejecuta `npm run qa:detener`. Si `qa:entorno` dice que ya hay un
   entorno activo, otra sesión lo está usando: **no lo pises**, detente y repórtalo.
4. Nunca corras `db:reset` ni `db:seed` contra la base real; las guardias del proyecto lo bloquean.

**Procedimiento**
1. Prepara el contexto mínimo del módulo y documenta qué datos hacen falta.
2. Inventaría **todos** los controles de la pantalla (botones, campos, filtros, menús,
   interruptores, íconos, acciones de fila, modales, paginadores, ordenamientos).
3. Presiona cada uno: camino feliz, camino de error (copia el mensaje **literal**) y
   efecto (¿qué cambió y dónde se ve? Compruébalo entrando con el otro rol).
4. Prueba la reversa (cancelar, editar, desactivar, eliminar) y los estados límite
   (vacío, un elemento, muchos, móvil 375 px).
5. Captura la pantalla real durante la ejecución, con la app **compilada** del entorno QA. Cumple las
   **reglas de capturas** de más abajo y después ejecuta `npm run manuales:optimizar`.
6. Escribe la ficha con la plantilla. **Capa pública sin nada técnico** (ni rutas, ni
   atributos, ni funciones); nombres de botones y campos exactamente como aparecen en
   pantalla. Lo técnico y los comportamientos conocidos van en **Notas internas**.
7. En la cabecera declara las `rutas` reales que cubre la ficha (consulta
   `npm run manuales:inventario`).
8. Si algo funciona mal o confunde, **no lo disfraces**: regístralo como hallazgo (formato
   de `POLITICA-QA.md` §6) y descríbelo en Notas internas.
9. Ejecuta `npm run manuales:cobertura` y `npm run manuales:indice`.

**Capturas (reglas, todas obligatorias):**
- **Todo lo que captures entra en la ficha** con su pie de figura, y toda imagen de
  `docs/manuales/img/<rol>/<modulo>/` que la ficha no use se **borra**. En la primera tanda de manuales solo
  se usaron 16 de 53 capturas: no repitas ese error.
- Pon en la ficha una captura de: la pantalla principal, **cada cuadro o diálogo que un paso abre**, **cada
  mensaje de error que cites literalmente**, el resultado final de cada tarea y **una vista móvil (375 px)**
  del módulo. Entre 6 y 12 figuras por módulo, sin repetir escenas.
- **Antes de guardar cada captura, mírala y comprueba:** (a) **no aparece el círculo negro "N"** de Next.js
  (abajo a la izquierda; solo sale en modo desarrollo: el entorno `qa:entorno` ya es compilado, no uses `npm
  run dev`); (b) **toda carta, ficha o lista de jugadores muestra al niño de marca**, nunca un avatar dibujado
  (si alguna vista de la app usa un avatar por diseño, no la ocultes: anótalo en "Notas internas" y avisa);
  (c) no se ve ninguna contraseña; (d) ninguna foto real.

**No avances de módulo** hasta cumplir el §10 de la política. Los scripts de uso único
van a `scratch/`, nunca a `scripts/`. No hagas commits. Responde al final con: módulo,
controles totales/probados, hallazgos registrados y qué quedó sin probar.
