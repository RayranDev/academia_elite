# P02 — Triage del QA a ciegas (desenmascarado)

> **Cuándo usarlo:** cuando P01 terminó y su informe está guardado. Recién ahora se
> puede leer código y documentación.
> **Entrada:** ruta del informe `REPORTE-QA-CIEGO-<fecha>.md`.
> **Salida:** `docs/auditoria/REPORTE-QA-CIEGO-<fecha>-TRIAGE.md` (archivo aparte).
> **Regla de oro:** el informe ciego **no se edita**: conserva la evidencia de qué se
> entendió sin ayuda.
> **Política:** `docs/politicas/POLITICA-QA.md` §7.

---

## Prompt

Vas a hacer el **triage** de un informe de QA a ciegas: `<RUTA_DEL_INFORME>`.

Ahora sí puedes leer código y documentación. Lee primero `AGENTS.md`,
`docs/politicas/POLITICA-QA.md` (§6 y §7), `docs/PENDIENTES.md` y
`docs/TRAZABILIDAD.md`.

Para **cada hallazgo** del informe:
1. Reprodúcelo o ubica su causa en el código (`archivo:línea`).
2. Clasifícalo:
   - **CONFIRMADO** — es un defecto real; indica causa y propuesta de corrección.
   - **MALENTENDIDO** — el sistema funciona bien; explica qué ve el usuario y si eso
     sugiere una mejora de claridad (fricción real aunque no sea un error).
   - **YA CONOCIDO** — está en `PENDIENTES.md` o `TRAZABILIDAD.md` (cita dónde).
   - **NO REPRODUCIBLE** — dilo y por qué.
3. Reevalúa la severidad con lo que ahora sabes.

Después, tres contrastes:
- **Rutas huérfanas.** Lista las rutas de `src/app/**/page.tsx` y compara con la
  matriz de cobertura del informe: toda función que existe y el auditor nunca
  descubrió es un hallazgo de descubrimiento.
- **Documentación vs. realidad.** Diferencias entre lo observado y `docs/`
  (formato `DOC-xxx`).
- **Puntos ciegos.** Qué cosas el auditor declaró no poder probar y qué las
  habría permitido.

**Entrega** el archivo de triage con una tabla (hallazgo → clasificación →
causa → destino: `corregir ahora` / `PENDIENTES.md` / `descartar`) y los hallazgos
nuevos. **No corrijas nada** en esta pasada. No hagas commits.
