# Política de QA — prueba a ciegas de la aplicación

> **Qué es esto.** El procedimiento obligatorio para auditar Fútbol Career Mode
> **usándolo como lo usaría una persona real**, sin conocer cómo está construido.
> Complementa (no reemplaza) los tests automáticos y la revisión de código.
>
> **Por qué existe.** Una auditoría que lee el código encuentra lo que el código
> *dice*; no encuentra lo que el usuario *vive*. Los defectos más caros de este
> producto (un botón que no se encuentra, una acción sin respuesta visible, un
> flujo de seis pasos que debía ser de dos) no aparecen leyendo `src/`. Aparecen
> sentándose frente a la pantalla sin saber qué esperar.

---

## 1. Principio rector: "sin información"

El auditor se comporta como alguien que **nunca vio este sistema**.

**Puede usar**
- La aplicación en ejecución, solo a través de la interfaz (navegador).
- Las credenciales de acceso por rol que le entregue quien solicita la auditoría.
- Los objetivos de negocio de la sección 4 (qué quiere lograr cada persona, **no**
  cómo hacerlo).
- Su criterio de producto: usabilidad, convenciones web, sentido común del
  dominio (fútbol formativo, cobranza de una escuela, datos de menores).

**No puede usar, durante la fase ciega**
- Nada de `src/`, `prisma/`, `tests/`, `scripts/`.
- Nada de `docs/` (manuales, `ESTADO-DEL-PROYECTO.md`, `PENDIENTES.md`, reportes
  de auditorías anteriores). Leerlos sesga: se termina confirmando lo que ya se
  sabe en vez de descubrir lo que falta.
- `AGENTS.md`, archivos de seed o cualquier lista de rutas.
- Ayuda del equipo sobre "cómo se hace". Si el auditor no logra algo solo, **eso
  es el hallazgo**.

**Regla del "esperado".** El resultado esperado se deduce de lo que cualquier
persona razonable esperaría al ver la pantalla, nunca de un documento. Si dos
personas razonables esperarían cosas distintas, se registra como ambigüedad de
diseño, no como error.

---

## 2. Entorno (innegociable)

- **Nunca producción.** Instancia local (`npm run dev`) contra una base de datos **exclusiva
  de pruebas**.
- **Antes de resetear o sembrar (obligatorio).** `npm run db:reset` y `npm run db:seed` **borran
  todas las tablas** de la base a la que apunte `.env`. Comprueba primero que esa base NO es la de
  producción: compara el servidor y el identificador del proyecto de `DATABASE_URL` / `DIRECT_URL`
  de tu `.env` (la parte `…@host:puerto/…` y el `postgres.<ref>` del usuario, **sin copiar la
  contraseña a ningún lado**) con los de las variables de producción en Vercel. **Si coinciden, es
  la misma base: no resetees, no siembres, y recuerda que cualquier prueba que cree, edite o borre
  datos (logros, evaluaciones, pagos…) está escribiendo en producción.** La solución es un proyecto
  Supabase aparte para desarrollo y QA.
- **Sin efectos externos.** Correos desviados a `EMAIL_DEV_TO` o desactivados;
  Upstash vacío en local; ningún pago, WhatsApp ni servicio de terceros real.
- **Datos ficticios.** Nunca datos reales de menores. Fotos: solo avatares o
  imágenes de prueba (ver `GUIA-DE-MARCA.md`: cero caras de menores).
- **Una sola persona/agente escribe por vez** sobre la base de pruebas; si hay
  varias sesiones, cada una usa su propia escuela de pruebas para no contaminar.
- El auditor anota **versión y commit** de lo que probó (`package.json` + SHA).

---

## 3. Las cuatro fases

### Fase A — Exploración libre (por rol)
Entrar con cada rol y recorrer **todo lo que el menú ofrece**, sin objetivo
previo. Se registra: qué se entiende, qué no, qué parece roto, qué falta, qué
sobra. Se mide el **descubrimiento**: ¿se encuentra cada función sin ayuda?

### Fase B — Misiones por objetivo
Cumplir los objetivos de la sección 4. Para cada uno: ¿se logra?, ¿en cuántos
pasos?, ¿el sistema guía o hay que adivinar?, ¿el resultado se ve reflejado
donde debe (incluido el **otro rol** que debería ver el efecto)?

### Fase C — Cobertura botón por botón
En cada pantalla se toca **cada elemento interactivo**: botones, enlaces,
pestañas, filtros, ordenamientos, paginadores, interruptores, menús, íconos,
acciones de fila, modales (abrir, cancelar, confirmar, cerrar con Escape y con
clic fuera). Se registra en la matriz de cobertura (sección 6).

### Fase D — Intento de romperlo
En cada formulario y acción:
- Campos vacíos, un solo carácter, textos larguísimos, emojis, tildes, comillas,
  `<script>`, espacios al inicio y al final.
- Números negativos, cero, decimales con coma y con punto, valores enormes, fechas
  imposibles, futuras y pasadas.
- Doble clic / doble envío, atrás y adelante del navegador, recargar a mitad de
  un flujo, abrir la misma pantalla en dos pestañas.
- Duplicados (mismo documento, mismo correo, mismo código).
- Eliminar algo que otra pantalla usa; editar mientras otro rol lo mira.
- **Sin datos** (escuela recién creada, listas vacías) y **con muchos datos**
  (cientos de jugadores).
- Cambiar identificadores en la URL (ver otra escuela, otro jugador, otro rol).
- Cerrar sesión y volver con "atrás"; sesión vencida a mitad de una acción.
- Pantalla pequeña (375 px), zoom 200 %, solo teclado, lector de pantalla básico.

---

## 4. Objetivos de negocio por rol (qué se quiere lograr, no cómo)

El auditor los recibe como lista de tareas; **descubre el camino**.

**Súper Admin**: dar de alta una escuela y su administrador; atender una solicitud
de contacto; entrar a ayudar a una escuela y dejar constancia; crear un fondo de
carta y un logro; ajustar parámetros del cálculo; simular el efecto de unas
medidas; revisar quién hizo qué.

**Administrador de escuela**: configurar la escuela (marca, sedes, categorías);
dar de alta jugadores y familias; invitar a un entrenador; definir cuánto se
cobra y a quién se le descuenta; registrar y revisar pagos; ver quién debe;
registrar un gasto; publicar un anuncio; ver asistencia y ranking.

**Entrenador (DT)**: ver mi plantilla; medir y evaluar a un jugador; dar de alta
un jugador; crear un entrenamiento o partido; tomar asistencia; correr un
partido en vivo; cargar el resultado; otorgar un logro; escribir a una familia;
revisar el progreso de un jugador.

**Familia / jugador**: ver la carta; entender de dónde salen los números; ver el
progreso; confirmar o rechazar asistencia a un evento; reportar un pago; elegir
un fondo para la carta; leer mensajes y anuncios; cambiar mis datos y mi clave.

**Visitante sin cuenta**: conocer una escuela; pedir información; registrarse con
un código; recuperar la contraseña.

---

## 5. Qué se evalúa (no solo seguridad)

| Dimensión | Pregunta que responde |
|---|---|
| **Funcionalidad** | ¿Hace lo que dice y lo que cualquiera esperaría? ¿Los cálculos son coherentes (misma medida → mismo resultado, números que cierran)? |
| **Consistencia entre roles** | Lo que un rol hace, ¿lo ve el otro donde corresponde y a tiempo? |
| **Descubrimiento** | ¿Se encuentra la función sin ayuda? ¿Hay rutas que existen pero no se llega por el menú? |
| **Respuesta del sistema** | ¿Toda acción confirma éxito, error o carga? ¿Los mensajes dicen qué hacer? |
| **Flujo** | Cantidad de pasos y pantallas frente a lo que la tarea merece. |
| **Contenido** | Textos de plantilla, errores de ortografía, términos técnicos al usuario, idioma mezclado. |
| **Datos y fechas** | Fechas corridas de día, zonas horarias, formatos de moneda y número. |
| **Accesibilidad y móvil** | Teclado, foco, contraste, tamaño táctil, 375 px. |
| **Rendimiento percibido** | Esperas sin indicador, pantallas que parpadean, listas largas. |
| **Seguridad observable** | Acceso a lo ajeno cambiando la URL, datos de otra escuela, acciones sin permiso, fotos de menores expuestas, mensajes de error que filtran información. |

---

## 6. Registro y entregable

### Matriz de cobertura (obligatoria)
Una fila por pantalla y rol; el auditor la completa mientras avanza:

| Rol | Pantalla / ruta descubierta | Elementos interactivos | Tocados | Rotos o dudosos | Fase D hecha | Notas |
|---|---|---|---|---|---|---|

Una pantalla sin fila **no fue auditada**.

### Hallazgo (formato único)
```
### QAC-001 — <título corto, en lenguaje de usuario>
- Severidad: CRÍTICO | ALTO | MEDIO | BAJO
- Tipo: error | fricción | función faltante | contenido | accesibilidad | seguridad | rendimiento
- Rol / pantalla: …
- Pasos exactos para reproducir: 1. … 2. …
- Esperado (por qué lo esperaría cualquiera): …
- Observado: …
- Evidencia: captura(s) / texto literal del mensaje
- Frecuencia: siempre | a veces (cuándo) | una vez
```
Prefijo **QAC** (QA ciego) para no mezclarlo con reportes por lectura de código.

**Severidad.** CRÍTICO: pérdida o fuga de datos, acceso a lo ajeno, dinero mal
calculado, bloqueo de un flujo central sin salida. ALTO: una tarea principal no
se puede completar o hay que adivinar. MEDIO: se completa con esfuerzo o
confusión. BAJO: cosmético.

### Mejoras (separadas de los errores)
Cada una con: para quién, problema que vive hoy, propuesta, impacto y esfuerzo
(S/M/L). Una mejora **no** es un error; no se mezclan los conteos.

### Informe final: `docs/auditoria/REPORTE-QA-CIEGO-<AAAA-MM-DD>.md`
Resumen ejecutivo, versión probada, matriz de cobertura, hallazgos ordenados por
severidad, mejoras, y una sección **"No pude probar"** honesta (qué y por qué).

---

## 7. Fase de desenmascarado (solo después de congelar el informe)

Cuando el informe ciego está **terminado y guardado**, recién entonces se permite
leer código y documentación para:

1. **Triage**: ubicar la causa de cada hallazgo (`archivo:línea`) y descartar los
   que son malentendidos del auditor.
2. **Contraste**: comparar lo observado contra `docs/` y `AGENTS.md`; las
   diferencias se registran como discrepancia de documentación.
3. **Rutas huérfanas**: contrastar el inventario de rutas contra lo que el
   auditor llegó a descubrir por el menú. Una función que existe pero que nadie
   encontró es un hallazgo de descubrimiento.

El informe ciego **no se edita** después de este paso: el triage va en una
sección aparte para conservar la evidencia original de qué se entendió sin ayuda.

---

## 8. Cierre del ciclo

- Cada hallazgo **confirmado** termina en uno de tres destinos: corregido (con
  test que lo cubra, AGENTS.md §6 bis), registrado en `PENDIENTES.md` con su
  paquete, o descartado con motivo escrito.
- Los errores funcionales corregidos suman un test (unit o e2e) para que no
  vuelvan.
- Un resumen de lo corregido va a `TRAZABILIDAD.md`; no se acumulan reportes
  viejos como fuente de verdad.

## 9. Cuándo se ejecuta

- Antes de cada salida a producción relevante y tras cada funcionalidad grande.
- Una pasada reducida (Fases B y D sobre lo tocado) tras cada corrección urgente.
- Auditorías de Fase A y C completas: al menos una por trimestre.

## 10. Definición de terminado de un ciclo de QA

- [ ] Los cuatro roles y el visitante recorridos completos.
- [ ] Matriz de cobertura sin pantallas sin fila.
- [ ] Todo objetivo de la sección 4 intentado, con resultado y número de pasos.
- [ ] Fase D aplicada a cada formulario.
- [ ] Informe guardado **antes** del desenmascarado.
- [ ] Triage hecho y cada hallazgo con destino.

---

## Cómo se lanza

Los prompts viven en la biblioteca, no aquí: **P01** (prueba a ciegas, §1 a §6),
**P02** (triage y desenmascarado, §7) y **P07** (seguridad a ciegas entre escuelas).
Ver `docs/prompts/README.md`.
