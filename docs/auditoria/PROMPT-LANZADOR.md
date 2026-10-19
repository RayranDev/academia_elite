# Prompt lanzador (pegar esto en Gemini)

---

Vas a hacer dos trabajos sobre este repositorio (Fútbol Career Mode), uno detrás
del otro. Las instrucciones completas de cada uno están en estos archivos;
leelos enteros antes de empezar y seguilos al pie de la letra:

1. `docs/auditoria/PROMPT-QA.md` — auditoría QA integral (funcional, seguridad,
   UX, accesibilidad, rendimiento) + mejoras propuestas.
2. `docs/auditoria/PROMPT-DOCUMENTADOR.md` — documentación integral de la app +
   auditoría de los documentos existentes + mejoras detectadas.

Antes de cualquiera de los dos, leé `AGENTS.md` en la raíz: es el contrato del
proyecto y manda sobre cualquier suposición tuya.

Reglas comunes:

- **No modifiques código ni documentos existentes, no hagas commits ni push.**
  Solo creás los entregables que piden los prompts dentro de `docs/auditoria/`.
- Hacé primero el de QA y después el de documentación. Lo que descubras en uno
  podés usarlo en el otro (citando el ID del hallazgo, por ejemplo `QA-012`).
- Cada afirmación lleva evidencia (`archivo:línea`). Si no lo verificaste,
  marcalo como `NO VERIFICADO` / `PENDIENTE DE CONFIRMAR`.
- Si una tarea es demasiado grande para una sola pasada, trabajá por módulos
  (por rol o por carpeta) y no te saltes ninguno; al final indicá qué quedó
  cubierto y qué no.
- Además de errores, quiero **oportunidades de mejora** concretas y
  priorizadas: pensá como DT, como administrador de escuela y como familia.

Cuando termines, respondé solo con:

1. La lista de archivos que creaste.
2. Los 10 hallazgos más importantes (QA + documentación) en una línea cada uno,
   con su ID y severidad.
3. Las 5 mejoras de mayor impacto.
4. Lo que no pudiste cubrir y por qué.
