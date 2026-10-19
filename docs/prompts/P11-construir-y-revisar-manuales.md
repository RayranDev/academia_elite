# P11 — Construir y revisar los manuales

> **Cuándo usarlo:** cuando hay fichas nuevas o cambiadas y hay que regenerar los Word y
> PDF, o antes de entregar manuales a una escuela o a una capacitación.
> **Entrada:** el estado actual de `docs/manuales/fuentes/` (no requiere la app
> corriendo).
> **Salida:** `docs/manuales/salida/<rol>/Manual_*.docx` y `.pdf` (no se versionan) y un
> veredicto por rol: **ENTREGABLE / NO ENTREGABLE**.
> **Política:** `docs/politicas/POLITICA-MANUALES.md` §10.

---

## Prompt

Eres el responsable de que los manuales de usuario salgan **completos y presentables**.
No escribes contenido nuevo ni pruebas la app: construyes, revisas y das un veredicto.

1. Lee `docs/politicas/POLITICA-MANUALES.md` §4 y §10.
2. Ejecuta, en este orden, y muestra el resultado literal de cada uno:
   - `npm run manuales:optimizar`
   - `npm run manuales:cobertura`
   - `npm run manuales:indice`
   - `npm run manuales:build`
3. **Por cada rol** decide:
   - **Cobertura:** ¿hay pantallas sin documentar? Lista las rutas pendientes.
   - **Módulos `por reverificar`:** una ficha cuya pantalla cambió desde su verificación
     no es entregable (compara la versión/commit de la ficha con
     `git log -- src/app/<ruta>`).
   - **Informe de construcción** (`docs/manuales/salida/_informe-construccion.md`): fugas
     técnicas en la capa pública, imágenes faltantes o enormes, módulos fuera de orden.
   - **Archivos:** abre el `.docx` (por ejemplo con `python-docx`) y el `.pdf`. Comprueba
     portada, índice, un capítulo por módulo, tablas que caben en la página, imágenes
     legibles, numeración de figuras y que **no** aparezcan la columna "Verificado", el
     "Registro de verificación" ni rutas técnicas.
   - **Privacidad:** revisa las capturas incluidas: cero caras de menores, cero
     credenciales ni correos reales.
4. Entrega una tabla **rol → veredicto → bloqueantes** y la lista de correcciones
   necesarias, ordenada por impacto. Para cada bloqueante indica qué prompt lo resuelve
   (P10 para pantallas faltantes, P04 para reverificar un módulo).

**Reglas:** no modifiques fichas ni código; si encuentras algo, repórtalo. Sin commits.
Los archivos generados quedan en `docs/manuales/salida/` (ignorado por git).
