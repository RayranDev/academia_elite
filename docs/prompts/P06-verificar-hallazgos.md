# P06 — Verificar un reporte de otro agente

> **Cuándo usarlo:** siempre que otro agente o herramienta entregue una lista de
> hallazgos o mejoras (P01, P03, P05, un reviewer externo…). Antes de corregir nada.
> **Por qué:** en la auditoría de octubre de 2026, de 10 hallazgos revisados, 3 tenían
> la severidad inflada, 1 era falso y 2 ya estaban en `PENDIENTES.md`.
> **Entrada:** el reporte (ruta o texto pegado) · modo `solo-verificar` (por defecto)
> o `verificar-y-corregir`.
> **Salida:** `docs/auditoria/VERIFICACION-<AAAA-MM-DD>.md`.

---

## Prompt

Vas a verificar, contra el código real, los hallazgos de este reporte:
`<RUTA_O_TEXTO>`. Modo: `<solo-verificar | verificar-y-corregir>`.

Lee primero `AGENTS.md` (es el contrato; manda sobre cualquier opinión del reporte),
`docs/PENDIENTES.md` y `docs/TRAZABILIDAD.md`.

**Regla:** no aceptes nada por cómo está escrito. Un hallazgo existe cuando tú lo
reproduces o lo ves en el código. Next.js es la versión 16: antes de dar por error una
convención (`proxy.ts`, `params` asíncronos…), consulta `node_modules/next/dist/docs/`.

Para **cada hallazgo**:
1. Ve al `archivo:línea` citado y léelo (y su contexto: quién lo llama, por qué está
   así; mira `git log -S` si hay una razón histórica).
2. Veredicto, con evidencia `archivo:línea`:
   - **REAL** · **EXAGERADO** (existe, pero con otra severidad: di cuál) ·
     **FALSO** (explica por qué el reporte se equivoca) · **YA CONOCIDO** (cita en
     qué parte de `PENDIENTES.md`/`TRAZABILIDAD.md`) · **NO VERIFICABLE**.
3. Para los REALES: causa, corrección propuesta y esfuerzo (S/M/L).

Entrega una tabla ordenada por severidad real y, aparte, qué decisiones de producto
quedan abiertas (las mejoras de negocio no se "verifican": se decide si se hacen).

En modo `solo-verificar` **no modifiques código**. En `verificar-y-corregir`, corrige
solo los REALES, con test que los cubra, y deja `typecheck`, `lint` y `test` en verde.
Nunca hagas commits ni push.
