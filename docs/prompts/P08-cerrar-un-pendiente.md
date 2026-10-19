# P08 — Cerrar un pendiente

> **Cuándo usarlo:** para ejecutar un paquete de `docs/PENDIENTES.md` de punta a punta,
> con las reglas del proyecto.
> **Entrada:** nombre del paquete (o ítem) · `COMMIT: sí | no` (por defecto `no`).
> **Salida:** código + tests + docs actualizados; con `COMMIT: sí`, commits
> convencionales.
> **No usar para:** ítems "gateados", "diferidos" o "bloqueados por decisión de
> producto" sin que esa decisión esté tomada; en ese caso el agente debe detenerse y
> preguntar.

---

## Prompt

Vas a ejecutar este pendiente de `docs/PENDIENTES.md`: **`<PAQUETE_O_ÍTEM>`**.
`COMMIT: <sí | no>`.

1. Lee `AGENTS.md` completo y la sección del paquete en `docs/PENDIENTES.md`. Es
   Next.js 16: consulta `node_modules/next/dist/docs/` antes de tocar cualquier API de
   Next. Si el paquete está gateado, diferido o depende de una decisión que no figura
   como tomada, **detente y dilo**.
2. Antes de escribir código, resume en pocas líneas qué vas a cambiar y por qué. Si
   hay una decisión de diseño con consecuencias reales, plantéala (no un menú de
   opciones: una recomendación con su costo).
3. Implementa respetando las capas (`app|components → actions → services →
   repositories → prisma`), `ActionResult` en las actions, `textoSeguro()` en texto
   libre, `escuelaId` en toda query de tenant y los componentes de fecha del §6.
4. **Cada acción del usuario tiene respuesta visible** (éxito, error, carga) y cada
   corrección de comportamiento lleva un test que la cubra (§6 bis).
5. Deja en verde: `npm run typecheck`, `npm run lint`, `npm run test`; y
   `npm run test:e2e` si tocaste acceso, carta, semana o bloqueo. Si algo falla,
   muéstralo tal cual.
6. Actualiza la documentación en el mismo cambio: borra o recorta el paquete en
   `PENDIENTES.md`, agrega la entrada en `TRAZABILIDAD.md`, y ajusta `SEGURIDAD.md` /
   `DECISIONES.md` / manuales afectados. Un módulo con manual cuyo UI cambió se marca
   `por reverificar` en `docs/manuales/INDICE.md`.
7. Si `COMMIT: sí`: commits convencionales (`fix`, `feat`, `docs`…), agrupando por
   unidad de trabajo (código + sus tests + su doc), **sin atribución de IA ni
   `Co-Authored-By`**. No hagas push.

Termina con: qué cambió, resultado de cada verificación, y qué quedó fuera de alcance
(registrado en `PENDIENTES.md`, nunca omitido en silencio).
