# Política de manuales de usuario

> **Qué es esto.** Cómo se escriben, verifican, construyen y mantienen los manuales
> de Fútbol Career Mode. Un manual es una **promesa**: si dice que un botón hace
> algo, alguien lo tocó y lo comprobó en esta versión.
>
> **Versión 2 (2026-10-19).** Reemplaza a la v1. La v1 trataba el Markdown como
> producto y dejaba el Word/PDF como un paso opcional; el resultado fueron fichas
> sueltas de unos pocos módulos que ningún usuario puede abrir. Cambia el producto,
> el alcance y cómo se mide que está completo.

---

## 1. Qué se entrega

**Un manual por rol, en Word (.docx) y PDF.** Es lo único que recibe un entrenador,
una familia, un administrador de escuela o el equipo de plataforma. El Markdown es
un paso intermedio de trabajo, nunca el entregable.

| Rol | Manual | Carpeta de la app |
|---|---|---|
| Súper Admin | Manual del Súper Administrador | `/admin` |
| Administrador de escuela | Manual del Administrador de Escuela | `/escuela` |
| Entrenador (DT) | Manual del Entrenador | `/dt` |
| Familia / jugador | Manual de la Familia y el Jugador | `/jugador` |

Cada manual tiene portada, índice, una introducción de cómo leerlo y **un capítulo
por pantalla del menú del rol**, con capturas reales numeradas.

**Se entregan como adjunto** (para capacitaciones, correo o almacenamiento propio).
**No se versionan** los .docx/.pdf/.html generados: pesan decenas de MB y se
reconstruyen en un minuto desde las fuentes (`docs/manuales/salida/` está en
`.gitignore`).

---

## 2. Alcance: todas las pantallas, medido por una herramienta

"Cubrimos los módulos importantes" no existe. **Un manual está completo cuando cada
pantalla del rol tiene su capítulo**, y eso lo mide `npm run manuales:cobertura`, no
una persona:

- El inventario sale de `src/app/<prefijo>/**/page.tsx`: toda ruta es una pantalla.
- Cada ficha declara en su cabecera las rutas que documenta (campo `rutas`).
- Una ruta sin ficha figura como **pendiente**; una ruta declarada que no existe
  figura como **error**. Con `--estricto` la herramienta falla.
- Las pantallas que no merecen capítulo (p. ej. una redirección) se excluyen **en
  `docs/manuales/roles.json`, con la razón escrita**.

Una pantalla puede ser un módulo entero (Logros) o parte de uno (el detalle de un
jugador forma parte de "Plantilla"). La unidad de trabajo sigue siendo el módulo.

---

## 3. Principios

1. **Se documenta lo que se ejecutó, no lo que se supone.** Cada afirmación sale de
   usar la función en la versión vigente.
2. **Módulo por módulo, control por control.** Todo botón, campo, filtro, interruptor,
   menú y acción de fila se prueba y se explica.
3. **El manual no tapa defectos.** Si un control se comporta mal o confunde, no se
   escribe un rodeo en silencio: se registra el hallazgo (formato de
   `POLITICA-QA.md` §6) y se anota en "Notas internas". El manual describe lo que
   ocurre.
4. **Una sola fuente de verdad.** Un manual vigente por rol. El texto vive en las
   fichas; **nunca** dentro de un script generador (así se rompió la v1: cinco
   generadores con el contenido escrito adentro).
5. **Se escribe para quien no sabe.** Lenguaje de la persona que usa el producto.

---

## 4. La ficha de módulo: dos capas

Archivo: `docs/manuales/fuentes/<rol>/<modulo>.md`. Tiene **capa pública**, que llega
al manual, y **capa interna**, que el generador **omite**.

```markdown
---
rol: entrenador
modulo: Mediciones y evaluación
orden: 4
rutas: ["/dt/plantilla", "/dt/jugadores/[id]", "/dt/jugadores/[id]/evaluar"]
---
# Mediciones y evaluación

> Verificado en la versión 0.1.0 (`abc1234`) el AAAA-MM-DD por <quién/agente>.

**Para qué sirve:** una frase.
**Dónde está:** Menú → Sección → Pantalla.        (nombres del menú, no rutas técnicas)
**Antes de empezar:** datos o pasos previos necesarios.

## Mapa de la pantalla
<captura con los controles numerados>   *Figura 1: ...*

## Controles
| N.º | Control (nombre exacto en pantalla) | Qué hace | Reglas y límites | Si se equivoca (mensaje literal) | Verificado |

## Cómo se hace
### <Tarea: p. ej. "Evaluar a un jugador por primera vez">
1. …  (nombre exacto del botón o campo en cada paso)
**Resultado:** qué ve al terminar.

## Qué ve la otra parte
Qué cambia en la pantalla de la familia / el entrenador / la escuela.

## Errores y situaciones frecuentes
Pantalla vacía, mensajes de error, qué hacer.

## Notas internas            <- NO se publica
Comportamientos conocidos, rutas técnicas, selectores, referencias a hallazgos.

## Registro de verificación  <- NO se publica
Fecha · versión · controles totales / probados · quién.
```

**Regla de la capa pública:** nada técnico. Ni rutas (`/dt/plantilla`), ni atributos
HTML, ni nombres de funciones, ni identificadores. Si hace falta decir dónde está algo,
se usa el camino del menú. La columna **Verificado** de la tabla es interna y el
generador la quita. El generador **avisa** cuando detecta una fuga técnica en la
capa pública.

### Nivel de detalle esperado (ejemplos)
- **Mediciones y evaluación**: cada campo físico y técnico (unidad, rango válido, qué
  pasa fuera de rango), las notas de 1 a 10 y su significado, qué cambia según la
  posición (campo vs. arquero), cuándo se calcula la carta, qué hace "anular
  evaluación" y cómo lo ve la familia.
- **Creación de fondos**: cada opción del editor, la vista previa, qué efectos
  existen, cómo se publica o desactiva, qué pasa con las cartas que ya lo tenían
  equipado, cómo lo elige la familia.
- **Logros**: cómo se crean y configuran, condiciones para otorgarlos, quién los
  otorga, qué suma o no a la carta, cómo se ve en el perfil del jugador.

---

## 5. Cómo se prueba un módulo

Entorno igual al de `POLITICA-QA.md` §2: instancia **local**, base de pruebas, datos
ficticios, sin efectos externos. **Nunca producción.**

1. **Preparar el contexto** mínimo y documentar qué datos hacen falta.
2. **Inventariar los controles** de la pantalla: botones, campos, filtros, menús,
   interruptores, íconos, acciones de fila, modales, paginadores, ordenamientos.
3. **Probar cada control** con tres intentos: camino feliz, camino de error (se copia
   el mensaje **literal**) y **efecto** (qué cambió y dónde se ve, comprobado entrando
   con el otro rol).
4. **Probar la reversa**: cancelar, editar, desactivar, eliminar y qué pasa con lo que
   dependía de eso.
5. **Estados límite**: módulo vacío, un elemento, muchos; móvil de 375 px.
6. **Capturar** durante la ejecución real (§6).

No se acepta: describir un botón sin haberlo presionado, copiar texto de otro manual
o del código, ni "debería funcionar así".

---

## 6. Evidencia y privacidad

- Capturas **de la ejecución real**, nunca montadas ni de memoria.
- **Cero caras de menores:** solo avatares generados, el personaje de marca o imágenes
  de prueba (`GUIA-DE-MARCA.md`).
- **Cero credenciales visibles:** ni contraseñas, ni tokens, ni correos reales, ni la
  barra del navegador con datos de un entorno.
- Datos ficticios coherentes entre módulos: el mismo jugador de demostración recorre
  todo el manual.
- **Sin el indicador de desarrollo de Next.js.** En modo desarrollo aparece un círculo con
  una "N" abajo a la izquierda y arruina la captura. Se captura contra la aplicación
  compilada (`npm run build && npm run start`) o con ese indicador desactivado.
- **Peso:** las capturas se optimizan con `npm run manuales:optimizar` (máx. 1400 px de
  ancho, PNG comprimido) **antes** de commitearse. Las fuentes (`.md`) y las capturas
  optimizadas sí se versionan.

---

## 7. Estilo

- Español neutro, directo, en segunda persona del singular o impersonal; el mismo
  registro que la interfaz.
- Los nombres de botones y campos van **tal como aparecen en pantalla**, en negrita.
- Sin términos técnicos (nada de "tenant", "Server Action", "endpoint", "DTO").
- Una tarea por sección, pasos numerados, un verbo por paso, y el **resultado
  esperado** al final de cada tarea.
- Recuadros: `> **Importante:**`, `> **Ojo:**` o `> **Advertencia:**` se publican como
  recuadro. Se usan donde hay riesgo real: acciones que no se pueden deshacer, datos
  de menores, cobros.

---

## 8. Estructura y herramientas

```
docs/manuales/
  roles.json                     # los 4 roles, su prefijo de ruta y las exclusiones justificadas
  INDICE.md                      # GENERADO (npm run manuales:indice): no se edita a mano
  fuentes/<rol>/<modulo>.md      # LA fuente de verdad
  img/<rol>/<modulo>/            # capturas optimizadas
  salida/                        # GENERADO e ignorado por git: .docx, .pdf, informe de construcción
scripts/manuales/                # el generador único (y su cobertura)
scratch/                         # trabajo descartable, ignorado por git
```

| Comando | Qué hace |
|---|---|
| `npm run manuales:inventario` | Lista las pantallas de cada rol según `src/app`. |
| `npm run manuales:cobertura` | Cruza pantallas vs. fichas. `--estricto` falla si falta algo. |
| `npm run manuales:indice` | Regenera `INDICE.md` (estado, versión, fecha y cobertura). |
| `npm run manuales:optimizar` | Reduce el peso de las capturas. |
| `npm run manuales:build` | Construye el Word y el PDF de cada rol y escribe el informe. `--estricto` falla por cobertura incompleta, imágenes faltantes **o fugas técnicas**. |
| `npm run manuales:word` | Solo Windows con Microsoft Word: calcula los números de página del índice del .docx, lo guarda y exporta un `*_word.pdf`. Se corre **antes de entregar el Word**. |

- **El índice del Word y su aviso.** Si el .docx pide "actualizar campos" al abrirse
  (la opción `updateFields` o un campo marcado `dirty`), Word muestra al usuario un
  cuadro de advertencia y, abierto de forma automática, se cuelga. Por eso el generador no
  usa ninguna de las dos y publica el índice **sin números de página**; `manuales:word`
  los calcula con Word y los deja guardados. Los manuales se entregan ya pasados por ese
  paso. El script solo toca las carpetas de `roles.json`, nunca `salida/previos-*`.
- **Regla de invalidación.** Todo cambio que toque la interfaz de un módulo lo marca
  `por reverificar` en el mismo cambio; un módulo `por reverificar` no se entrega.
- `docs/MANUAL-DE-USO.md` pasa a ser un índice que apunta a estos manuales cuando el
  rol correspondiente esté completo: no pueden convivir dos manuales.

---

## 9. Relación con QA

- Escribir el manual **es** una auditoría funcional: todo comportamiento raro se
  registra como hallazgo con el formato de `POLITICA-QA.md` §6.
- La prueba a ciegas (`POLITICA-QA.md`) y la redacción del manual se hacen en
  **momentos y por personas o agentes distintos**: el auditor ciego no debe haber leído
  los manuales. El redactor sí puede consultar el código y la documentación para
  entender *por qué*, pero **lo que escribe lo comprueba en pantalla**.

---

## 10. Definición de terminado

**De un módulo**
- [ ] Todos los controles inventariados y probados (camino feliz, error y efecto).
- [ ] Mensajes de error copiados literalmente; efecto en el otro rol comprobado.
- [ ] Capturas reales, optimizadas, sin menores ni credenciales.
- [ ] Ficha completa con front-matter, versión, fecha y registro de verificación.
- [ ] Capa pública sin fugas técnicas; lo interno en "Notas internas".

**De un manual por rol**
- [ ] `npm run manuales:cobertura --estricto` sin pantallas pendientes para el rol.
- [ ] `npm run manuales:build` sin avisos de fugas técnicas ni imágenes faltantes.
- [ ] El Word y el PDF **abiertos y revisados** (portada, índice, tablas que no se
      desbordan, imágenes legibles, números de figura correctos).
- [ ] **Prueba de lectura:** una persona que no conoce el sistema cumple las tareas
      principales siguiendo solo el manual.

---

## 11. Cómo se lanza

Los prompts viven en la biblioteca (`docs/prompts/README.md`):

- **P10** — manual completo de **un rol**: recorre todo su menú, módulo por módulo, y
  al final arma el Word y el PDF.
- **P04** — un solo módulo (escribir o reverificar).
- **P11** — construir y revisar los entregables.
