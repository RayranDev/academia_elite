# Curva de desarrollo del jugador — Documento de diseño

> Estado: **diseño / propuesta** (no implementado). Sirve para entender el
> modelo y para exponerlo a las escuelas. La implementación se planifica al
> final (§9).

---

## 1. Para qué es esto y a quién se lo vendés

Hoy la carta del jugador **nace de una medición real** (jornada de evaluación:
sprint, salto, agilidad, resistencia + notas técnicas/mentalidad) y de ahí sale
el OVR y el nivel (Bronce/Plata/Oro/Héroe). Eso es objetivo y comparable — es
tu activo más fuerte.

Lo que falta es lo que el cliente (la escuela y, sobre todo, la familia) ve
**entre evaluación y evaluación**: el chico entrena, va a los partidos, hace las
tareas… y la carta no se mueve. Se siente "muerta" 29 de cada 30 días.

La **curva de desarrollo** llena ese vacío: convierte el esfuerzo diario en
progreso visible, sin romper la objetividad de la carta. Es lo que transforma el
producto de "una foto cada mes" a "un videojuego de su carrera".

---

## 2. Principio rector (la decisión más importante)

Vos lo planteaste así: *"debería crecer día por día de manera autónoma, son
niños y todos los días mejoran"*. Es la intuición correcta, PERO hay una trampa
que hay que resolver antes de codear nada:

> Si la carta sube sola sin medición, el OVR deja de significar algo. Un Oro
> "inflado por tiempo" no vale lo mismo que un Oro medido. Perdés justo lo que
> te diferencia.

La solución NO es elegir entre "crece solo" o "solo con medición". Es separar en
**dos capas** y dejar que cada cosa crezca por el motivo correcto:

| Capa | Qué es | Cómo crece | Por qué |
|---|---|---|---|
| **Carta oficial** (físico/técnico: RIT, TIR, PAS, REG, DEF, FIS) | La verdad medida | **Solo en evaluaciones** (medición real en cancha) | Mantiene el OVR objetivo y comparable entre jugadores y escuelas |
| **Mentalidad / hábitos (MEN)** | El compromiso y la conducta | **Día a día**, de forma autónoma, por asistencia/tareas/logros | MEN NO es una medida física: es comportamiento, y el comportamiento sí se observa a diario |

Así honrás tu intuición ("crece todos los días") **sin mentir**: lo que crece
solo es el **sello MEN** (que ya pesa en el OVR), y los stats físicos siguen
siendo sagrados. El esfuerzo diario tiene efecto real en la carta — vía MEN — y
además **proyecta** la próxima evaluación (§6).

---

## 3. Las tres velocidades del crecimiento

El jugador progresa en tres ritmos distintos, y la curva los muestra juntos:

1. **Saltos (evaluación)** — cada ~30 días (configurable por escuela). La carta
   física/técnica da un salto medido. Es el "subir de nivel" real.
2. **Pulso semanal (hábitos)** — cada semana el padre/DT valida hábitos
   (asistencia, tareas, conducta). Sube MEN y XP. Ya existe parcialmente como
   `ProgresoSemanal`.
3. **Latido diario (motivación)** — pequeños incrementos diarios de MEN y de un
   indicador de "forma" por asistir/entrenar. Visible, chico, con techo y con
   decaimiento si el chico deja de venir.

La gracia: el **latido diario** y el **pulso semanal** alimentan la expectativa,
y el **salto de la evaluación** la confirma o la corrige. Es un ciclo de
motivación honesto.

---

## 4. Cómo crece cada cosa

### 4.1 Stats físicos/técnicos (RIT, TIR, PAS, REG, DEF, FIS)
- Cambian **únicamente** en la evaluación (medición real). Sin atajos.
- Entre evaluaciones, la app puede mostrar un **"potencial proyectado"** (línea
  punteada) calculado a partir del esfuerzo acumulado (§6) — pero la carta
  oficial no se toca hasta medir.

### 4.2 MEN (mentalidad) — el motor del día a día
MEN se vuelve un **acumulador de compromiso**, no una nota suelta. Sube con:
- **Asistencia** a entrenamientos y partidos (modelo `Asistencia`).
- **Tareas en casa / hábitos** validados semanalmente (`ProgresoSemanal`).
- **Logros personales** no deportivos (puntualidad, conducta, escuela).

MEN tiene techo (99) y **decae lentamente** si el chico deja de asistir o de
cumplir — así premia la constancia, no un pico aislado. Como `PESO_MEN_EN_OVR`
ya mete MEN en el OVR (~10%), un MEN que sube día a día **mueve el OVR de la
carta oficial todos los días, de forma legítima**.

### 4.3 XP y nivel personal (carrera)
Ya existe (`src/lib/progreso/engine.ts`: XP por hábito, niveles). Se le suman
fuentes nuevas: entrenos y partidos dan XP. El nivel personal es la "experiencia
de carrera" del jugador, separada del nivel de carta. Desbloquea fondos/logros.

---

## 5. De dónde salen los puntos (fuentes de progreso)

Cada acción real del día se traduce en puntos. Propuesta de tabla base (todos
los valores **configurables por escuela**, con un default global — encaja con el
sistema de parámetros que ya hicimos):

| Acción | Fuente (modelo) | Alimenta | Peso sugerido (default) |
|---|---|---|---|
| Asistir a entrenamiento | `Asistencia.presente` | MEN + XP | + |
| Asistir/jugar un partido | `Asistencia` + `EstadisticaPartido.minutos` | MEN + XP | ++ |
| Marcar gol / dar asistencia | `EstadisticaPartido` | XP + proyección TIR/PAS | + |
| Tarea en casa cumplida | `ProgresoSemanal` (hábito) | MEN | + |
| Hábito de disciplina/puntualidad | `ProgresoSemanal` | MEN | + |
| Logro personal no deportivo | `Logro`/`LogroJugador` | MEN + XP | ++ |
| Inasistencia / semana sin validar | (ausencia de registros) | decaimiento de MEN | − |

Regla de oro: **el deporte sube físico/técnico (en la evaluación); la conducta y
la constancia suben MEN (a diario)**. Las dos cosas terminan en el OVR, pero por
caminos distintos y honestos.

---

## 6. La curva de desarrollo (qué se grafica y cómo se lee)

Una sola gráfica de líneas en el tiempo, que cuenta la historia de la carrera:

- **Línea sólida (OVR real)**: los puntos de cada evaluación. Es la verdad. Ya
  existe como `EvolutionChart` en el hub del jugador.
- **Línea punteada (proyección)**: hacia dónde va el OVR según el esfuerzo
  acumulado (asistencia + hábitos + partidos) desde la última evaluación. Es la
  "promesa" que la próxima medición va a confirmar.
- **Banda de potencial por edad**: un rango esperable de OVR para la edad del
  chico (los niños mejoran con la edad por desarrollo natural). Ubica al jugador
  respecto de su potencial, sin inventarle stats.
- **Hitos**: marcas de logros, subidas de nivel, mejor partido.

Cómo se lee (y cómo se vende): *"Tu hijo está acá (sólido), y si mantiene esta
asistencia y estos hábitos, en la próxima medición va para acá (punteada).
Depende de él."* Eso es lo que engancha a la familia y justifica la mensualidad
para la escuela.

---

## 7. Integridad — por qué sigue siendo creíble

- La carta oficial **nunca** sube sin medición física/técnica.
- MEN sube a diario pero **acotado y con decaimiento**: no se puede "farmear" un
  Oro quedándose quieto; hay que sostener la constancia.
- Todo lo que mueve MEN nace de **registros reales** (asistencia que pasa el DT,
  hábitos que valida el padre, estadística de partido que carga el DT) — no de
  un botón mágico.
- La proyección está **etiquetada como proyección** (punteada), nunca se
  confunde con la carta real.
- El OVR sigue **comparable entre escuelas** porque `PESO_MEN_EN_OVR` y la
  estructura del OVR quedaron globales (decisión de la Fase 1).

---

## 8. Encaje con lo que ya existe

Buena noticia: gran parte de las piezas ya están en el código.

| Pieza | Estado |
|---|---|
| Stats/OVR por medición | ✅ `stats-engine` + evaluaciones |
| Evolución histórica (línea sólida) | ✅ `EvolutionChart` en el hub |
| Hábitos semanales → MEN/XP | 🟡 Existe `ProgresoSemanal` + `progreso/engine`; falta conectarlo a MEN de la carta y al día a día |
| Asistencia | ✅ Modelo `Asistencia` (la registra el DT) — hoy no alimenta nada |
| Estadística de partido | ✅ `EstadisticaPartido` (recién hecha) — hoy informativa |
| Parámetros configurables por escuela | ✅ Fase 1 (extensible a los pesos de progreso) |
| Proyección y banda por edad | ❌ A construir |
| Decaimiento de MEN | ❌ A construir |
| Crecimiento diario (job) | ❌ A construir |

Lo que falta es **conectar** lo que ya registramos (asistencia, partidos,
hábitos) a un acumulador de MEN/XP, y agregar la capa de proyección. No hay que
reinventar el motor de stats: se mantiene puro y se le pasa el MEN acumulado.

---

## 9. Plan de implementación por etapas (cuando se decida construir)

1. **Conectar lo que ya se registra** (sin schema nuevo): que asistencia,
   minutos de partido y hábitos semanales sumen a MEN/XP. Mostrar el efecto en
   la carta. *Riesgo bajo, impacto alto, es el 80% del valor.*
2. **Latido diario + decaimiento**: un cálculo (cron diario o al abrir el hub)
   que ajusta MEN por constancia reciente, con techo y caída suave.
3. **Proyección y banda por edad**: la línea punteada y el rango esperable; pura
   visualización sobre datos que ya existen.
4. **Afinado y parámetros por escuela**: exponer los pesos de la §5 en el panel
   de parámetros (reusa la infra de la Fase 1).

### Decisiones abiertas (cerrar antes de construir)
- **Magnitud del día a día**: ¿cuánto puede mover MEN el esfuerzo diario por
  mes? (sugerencia: que el efecto total de MEN sobre el OVR siga acotado al
  ~10%, para no desbalancear).
- **Cron vs. cálculo perezoso**: ¿un job diario actualiza a todos, o se calcula
  al abrir el hub del jugador? (perezoso es más simple y suficiente al inicio).
- **Decaimiento**: ¿desde cuántos días sin asistencia empieza a caer MEN y a qué
  ritmo?
- **Banda por edad**: ¿de dónde sale el rango esperable? (de los `RANGOS_POR_GRUPO`
  del motor, o de datos propios cuando haya histórico).

---

## 10. El pitch en una frase

> "No es una foto que sacás una vez al mes. Es la **carrera** de tu hijo: cada
> entrenamiento, cada partido y cada hábito lo empujan, lo ves crecer todos los
> días, y la medición lo confirma. Objetivo como un test, adictivo como un
> videojuego."
