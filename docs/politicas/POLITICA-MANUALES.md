# Política de manuales de usuario

> **Qué es esto.** Cómo se escriben, verifican y mantienen los manuales de
> Fútbol Career Mode. Un manual es una **promesa**: si dice que un botón hace
> algo, alguien lo tocó y lo comprobó en esta versión.
>
> **Por qué existe.** Un manual escrito de memoria o leyendo el código envejece
> mal y, peor, miente con aplomo. Los lectores son entrenadores, familias y
> administradores de escuela: no pueden contrastar el texto contra el código, solo
> contra la pantalla. Si no coincide, pierden la confianza en ambos.

---

## 1. Principios

1. **Se documenta lo que se ejecutó, no lo que se supone.** Cada afirmación sale
   de usar la función en la versión vigente.
2. **Módulo por módulo, control por control.** La unidad de trabajo es el módulo
   (una pantalla o función de un rol). Todo botón, campo, filtro, interruptor,
   menú y acción de fila se prueba y se explica.
3. **El manual no tapa defectos.** Si un control se comporta de forma confusa o
   incorrecta, no se escribe un rodeo en silencio: se registra el hallazgo
   (`PENDIENTES.md` / reporte de QA) y el manual describe el comportamiento real,
   marcado como **conocido**, hasta que se corrija.
4. **Una sola fuente de verdad.** Existe un único manual vigente por rol. Las
   versiones viejas se eliminan (el historial queda en git), no conviven.
5. **Se escribe para quien no sabe.** Lenguaje de la persona que usa el producto,
   sin términos técnicos.

---

## 2. Qué es un módulo

Una función completa para un rol, con nombre de menú. Ejemplos del alcance:

| Rol | Módulos (lista orientativa, se completa recorriendo el menú real) |
|---|---|
| Súper Admin | Escuelas · Usuarios · Solicitudes (leads) · **Fondos** · **Logros** · Parámetros · Simulador · Auditoría · Sesión de soporte |
| Administrador de escuela | Marca · Sedes · Categorías (rangos) · Jugadores (alta por pasos) · Entrenadores y staff · Códigos · Aranceles, descuentos y conceptos · Membresías y pagos · Morosos · Egresos · Asistencia · Ranking · Anuncios · Landing |
| Entrenador | Plantilla · **Mediciones y evaluación** · Progreso · Eventos y Modo Sesión · Calendario · Logros · Mensajes · Solicitudes · Perfil |
| Familia / jugador | Carta · Progreso · Eventos y calendario · Pagos · **Fondos** · Logros · Mensajes · Perfil y cuenta |

La lista definitiva se arma **recorriendo el menú real** de cada rol, no copiando
esta tabla. Si hay rutas que existen pero no tienen entrada de menú, se anotan
aparte (son un hallazgo de navegación, no un módulo oculto).

---

## 3. Cómo se prueba un módulo

Entorno igual al de `POLITICA-QA.md` §2: instancia local, base de pruebas,
datos ficticios, sin efectos externos.

Para cada módulo, en orden:

1. **Preparar el contexto.** Qué datos hacen falta para que el módulo tenga algo
   que mostrar (p. ej. para Mediciones: un jugador con categoría y posición). Se
   documenta, porque es el primer lugar donde se traba un usuario nuevo.
2. **Inventariar los controles.** Lista completa de lo que se puede tocar en la
   pantalla, incluidos menús desplegables, íconos, filtros, ordenamientos,
   paginadores y modales.
3. **Probar cada control**, con tres intentos como mínimo:
   - **Camino feliz**: con datos válidos.
   - **Camino de error**: vacío, inválido, repetido, fuera de rango. Se copia el
     mensaje **literal** que muestra el sistema.
   - **Efecto**: ¿qué cambió y **dónde se ve** (en esa pantalla, en otra, en otro
     rol)? Se comprueba entrando con el otro rol.
4. **Probar la reversa.** Cancelar, editar, desactivar, eliminar y qué pasa con lo
   que dependía de eso.
5. **Probar estados límite.** Módulo vacío, con un solo elemento, con muchos;
   móvil de 375 px.
6. **Capturar evidencia** durante la ejecución real (sección 5).

### Lo que no se acepta
- Describir un botón sin haberlo presionado.
- Copiar un texto de otro manual o del código.
- "Debería funcionar así": si no se vio, no se escribe.

---

## 4. Ficha de módulo (plantilla obligatoria)

Archivo fuente: `docs/manuales/fuentes/<rol>/<modulo>.md`

```markdown
# <Nombre del módulo, igual que en el menú>

> Verificado en la versión <x.y.z> (<sha corto>) el <AAAA-MM-DD> por <quién/agente>.

**Para qué sirve:** una frase.
**Quién lo usa y dónde está:** rol · ruta del menú (Menú → Sección → Pantalla).
**Antes de empezar:** datos o pasos previos necesarios.

## Mapa de la pantalla
<captura con los controles numerados>

## Controles
| N.º | Control (nombre exacto en pantalla) | Qué hace | Reglas y límites | Si se equivoca (mensaje literal) | Verificado |
|---|---|---|---|---|---|

## Cómo se hace (tareas completas)
### <Tarea 1: p. ej. "Evaluar a un jugador por primera vez">
1. …  (cada paso con el nombre exacto del botón o campo)
Resultado: qué debe ver al terminar.

## Qué ve la otra parte
Qué cambia en la pantalla de la familia / el entrenador / la escuela tras esto.

## Errores y situaciones frecuentes
Pantalla vacía, mensajes de error, qué hacer en cada caso.

## Comportamientos conocidos
Lo que hoy funciona de forma confusa o limitada (con referencia al pendiente).

## Registro de verificación
Fecha · versión · cuántos controles · cuántos probados · quién.
```

### Ejemplos del nivel de detalle esperado
- **Mediciones y evaluación**: cada campo físico y técnico (unidad, rango válido,
  qué pasa fuera de rango), las notas de 1 a 10 y su significado, qué cambia según
  la posición del jugador (campo vs. arquero), cuándo se calcula la carta, qué
  hace "anular evaluación", cómo se ve el resultado para la familia.
- **Creación de fondos**: cada opción del editor, cómo se ve la vista previa, qué
  efectos existen y cuándo se activan, cómo se publica o desactiva, qué pasa con
  las cartas que ya lo tenían equipado, cómo lo elige la familia.
- **Logros**: cómo se crean y configuran, condiciones para otorgarlos, quién puede
  otorgarlos, qué suma o no a la carta, cómo se ve en el perfil del jugador.

---

## 5. Evidencia y privacidad

- Las capturas se toman **de la ejecución real**, nunca montadas ni de memoria.
- **Cero caras de menores.** Solo avatares generados, el personaje de marca o
  imágenes de prueba (`GUIA-DE-MARCA.md`).
- **Cero credenciales visibles**: ni contraseñas, ni tokens, ni correos reales,
  ni la barra del navegador con datos de un entorno.
- Datos de ejemplo claramente ficticios y coherentes entre módulos (el mismo
  jugador de demostración recorre todo el manual).
- Capturas optimizadas (formato WebP/PNG comprimido); recortadas a lo relevante.

---

## 6. Estilo

- Español neutro, directo, en segunda persona del singular o impersonal; el mismo
  registro que usa la interfaz.
- **Los nombres de botones y campos van tal como aparecen en pantalla**, en
  negrita. Si la interfaz cambia, el manual cambia.
- Sin términos técnicos (nada de "tenant", "Server Action", "endpoint", "DTO").
- Una tarea por sección, pasos numerados, un verbo por paso.
- Siempre el resultado esperado al final de cada tarea.
- Advertencias donde hay riesgo real: acciones que no se pueden deshacer, datos
  de menores, cobros.

---

## 7. Estructura, versiones y archivos generados

```
docs/manuales/
  INDICE.md                      # estado de cada módulo (tabla de frescura)
  fuentes/<rol>/<modulo>.md      # LA fuente de verdad (Markdown)
  img/<rol>/<modulo>/            # capturas
  (PDF / DOCX / HTML)            # GENERADOS a partir de las fuentes
```

- **Las fuentes se versionan; los generados no.** Los archivos PDF/DOCX/HTML se
  producen con los scripts de `scripts/` y hoy pesan decenas de MB: no se
  commitean (se publican como adjunto de la versión o en el almacenamiento que se
  defina). Lo que se commitea son las fuentes y las capturas optimizadas.
- **Tabla de frescura** en `INDICE.md`: módulo · versión verificada · fecha ·
  estado (`vigente` / `por reverificar` / `sin hacer`).
- **Regla de invalidación.** Todo cambio que toque la interfaz de un módulo marca
  ese módulo como `por reverificar` en el mismo cambio. Un módulo `por
  reverificar` no se publica.
- Los manuales por rol (Súper Admin, Escuela, Entrenador, Familia) se **arman a
  partir de los módulos**; no se escriben aparte.
- Cuando existan los manuales por módulo, `docs/MANUAL-DE-USO.md` pasa a ser un
  índice que apunta a ellos (dos manuales a la vez es la mentira que esta política
  evita).

---

## 8. Relación con QA

- Escribir el manual **es** una auditoría funcional: todo comportamiento raro que
  aparezca se registra como hallazgo siguiendo el formato de `POLITICA-QA.md` §6.
- La prueba a ciegas de QA (`POLITICA-QA.md`) y la verificación de manuales se
  hacen en **momentos y por personas/agentes distintos**: el auditor ciego no debe
  haber leído los manuales; el redactor del manual sí necesita saber qué hace el
  sistema (puede consultar la documentación y el código para entender *por qué*,
  pero **lo que escribe lo comprueba en pantalla**).

---

## 9. Definición de terminado de un módulo

- [ ] Todos los controles inventariados y probados (camino feliz, error y efecto).
- [ ] Mensajes de error copiados literalmente.
- [ ] Efecto en el otro rol comprobado entrando con ese rol.
- [ ] Capturas reales, sin menores ni credenciales.
- [ ] Ficha completa con versión, fecha y registro de verificación.
- [ ] Comportamientos confusos registrados como hallazgo y marcados como conocidos.
- [ ] `INDICE.md` actualizado.

## 10. Definición de terminado de un manual por rol

- [ ] Todos los módulos del menú del rol en estado `vigente`.
- [ ] Ninguna ruta con función propia sin documentar.
- [ ] Un lector nuevo cumple las tareas principales siguiendo solo el manual
      (prueba de lectura con una persona que no conoce el sistema).
- [ ] Documento generado y revisado en PDF y en móvil.

---

## Cómo se lanza

El prompt vive en la biblioteca: **P04** (manual de un módulo). Empezar por
**Mediciones y evaluación**, **Fondos** y **Logros**. Ver `docs/prompts/README.md`.
