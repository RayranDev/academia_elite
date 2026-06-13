# CLAUDE.md

Este proyecto usa **`AGENTS.md`** como fuente única de reglas para agentes
(estándar multi-herramienta: Claude Code, Codex, Cursor, etc.).

`CLAUDE.md` no duplica esas reglas: las **importa**. La línea `@AGENTS.md` de
abajo hace que Claude Code expanda e inyecte todo el contenido de `AGENTS.md` en
contexto. Editá las reglas en `AGENTS.md`, nunca acá — así no hay dos fuentes de
verdad que se contradigan.

@AGENTS.md
