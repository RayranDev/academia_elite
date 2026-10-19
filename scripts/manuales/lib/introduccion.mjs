// Introducción genérica de cada manual (cómo usarlo y convenciones).
// Se escribe en Markdown para pasar por el mismo lexer que las fichas.

/**
 * @param {{ titulo: string, audiencia: string }} rol
 * @returns {string} Markdown.
 */
export function introduccionMarkdown(rol) {
  return `## Cómo usar este manual

Este documento es la guía de uso de **Academia Élite**. Dirigido a: ${rol.audiencia} Explica, pantalla por pantalla, qué hace cada botón, cada campo y cada filtro, y cómo completar las tareas del día a día.

Cada capítulo corresponde a una función del menú y sigue el mismo orden:

1. **Para qué sirve**, **Quién lo usa y dónde está** y **Antes de empezar**: qué es la función, cómo llegar a ella y qué necesitas tener listo.
2. **Mapa de la pantalla** y **Controles**: capturas y una tabla con cada elemento de la pantalla, sus reglas y los mensajes que puede mostrar el sistema.
3. **Cómo se hace**: las tareas completas, paso a paso, con el resultado esperado.
4. **Qué ve la otra parte** y **Errores y situaciones frecuentes**: qué cambia para las demás personas y qué hacer ante cada aviso.

## Convenciones del documento

- Los nombres de botones, campos, menús y secciones aparecen en **negrita**, escritos exactamente como se ven en la pantalla.
- Los mensajes que muestra el sistema aparecen en *cursiva y entre comillas*, tal cual se leen.
- Los pasos numerados se siguen en orden; al final de cada tarea se indica el resultado que debes ver.
- Las capturas se numeran de corrido (Figura 1, Figura 2…) y usan datos de ejemplo ficticios.
- Tres tipos de recuadro destacan información especial:

> **Importante:** información que necesitas para completar bien una tarea.

> **Ojo:** detalle fácil de pasar por alto que puede causar confusión.

> **Advertencia:** acción con riesgo real, por ejemplo algo que no se puede deshacer o que afecta datos de menores.

Los datos de menores de edad son sensibles: consúltalos solo cuando tu función lo requiera y no los compartas fuera de la plataforma. Si algo en la pantalla no coincide con este manual, avisa a tu escuela o al equipo de soporte.
`;
}
