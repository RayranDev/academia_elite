# Curva de desarrollo del jugador — Diseño e implementación

> **Estado: la etapa 1 está CONSTRUIDA y corriendo en producción.**
> Actualizado 2026-07-31.
>
> Este documento decía "diseño / propuesta (no implementado)" mucho después de
> que la curva estuviera funcionando — se corrigió. Lo que sigue mezcla el
> **modelo conceptual** (útil para explicárselo a una escuela) con el **estado
> real de cada pieza**, marcado en §8.
>
> **En una línea:** la asistencia a entrenamientos y partidos ya mueve el MEN
> todos los días y eso ya recalcula el OVR de la carta del hub. Lo que todavía
> **no** cuenta es el **rendimiento** (goles, minutos): hoy solo cuenta la
> presencia.

## 0. Qué está construido (resumen ejecutivo)

| Pieza | Dónde | Estado |
|---|---|---|
| Motor puro de la curva | `src/lib/curva.ts` | ✅ |
| Recálculo diario | `src/services/curva.service.ts` + `/api/cron/men-diario` (06:00 UTC) | ✅ |
| Persistencia del bonus | `Jugador.menBonus`, `Jugador.menBonusActualizado` | ✅ |
| Efecto en vivo en la carta | `player.service.ts` `obtenerHub` → `ovrConMen` | ✅ |
| Mensaje motivacional | `proyeccionMen` (cuánto suma el próximo entreno/partido) | ✅ |
| Rendimiento en partido → progreso | `EstadisticaPartido` **no alimenta nada** | ❌ |
| Hábitos semanales → MEN | `ProgresoSemanal` es un sistema de XP aparte | ❌ |
| Línea de proyección punteada (§6) | — | ❌ |
| Vista de seguimiento para el DT | — | ❌ |

**Parámetros vigentes** (`CURVA` en `src/lib/curva.ts`): ventana móvil de **30
días**, **+0.6** por entrenamiento asistido, **+1.2** por partido, tope de
**+12**, penalización de **−1.5** por cada ausencia a partir de la tercera. El
bonus se **recalcula desde cero** en cada corrida: por eso el cron es idempotente
y la recuperación es natural (las ausencias envejecen y salen de la ventana).

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
| Asistencia → MEN | ✅ **Construido**: `Asistencia` alimenta `calcularMenBonus` |
| Crecimiento diario (job) | ✅ **Construido**: cron `men-diario` a las 06:00 UTC |
| Decaimiento por ausencias | ✅ **Construido**: −1.5 desde la 3ª ausencia, recuperable |
| Efecto en vivo sobre la carta | ✅ **Construido**: `obtenerHub` recalcula el OVR con el MEN efectivo |
| Parámetros configurables por escuela | 🟡 Existe la infra (`ParametroEscuela`), pero los pesos de `CURVA` son constantes globales |
| Hábitos semanales → MEN | ❌ `ProgresoSemanal` sigue siendo un sistema de XP aparte |
| **Rendimiento en partido → progreso** | ❌ `EstadisticaPartido` (goles, asistencias, minutos, tarjetas) **no alimenta nada** |
| Proyección punteada y banda por edad | ❌ A construir |
| Vista de seguimiento para el DT | ❌ A construir |

El hueco más importante es el del **rendimiento**: hoy la curva premia la
**presencia**, no lo que pasó en la cancha. Un jugador que marca tres goles suma
exactamente lo mismo que uno que fue y se quedó en el banco. El dato ya se
registra (`EstadisticaPartido`, lo carga el DT en el Modo Sesión); falta
conectarlo.

---

## 9. Plan de implementación por etapas

### ✅ Etapa 1 — Asistencia → MEN, con decaimiento y efecto en vivo (HECHA)
Las decisiones que estaban abiertas quedaron cerradas así:

- **Magnitud**: tope de **+12** de MEN. Como `PESO_MEN_EN_OVR` ronda el 10%, el
  efecto sobre el OVR queda acotado y no desbalancea.
- **Cron vs. perezoso**: **cron diario** (`men-diario`, 06:00 UTC). Se eligió
  frente al cálculo perezoso porque el bonus tiene que estar bien aunque la
  familia no abra la app, y porque recalcular desde la ventana lo vuelve
  idempotente.
- **Decaimiento**: no por días sin asistir, sino por **ausencias a convocatorias**
  — penaliza faltar a algo que existía, no que la escuela no haya programado nada.
  Arranca en la 3ª ausencia, a −1.5, y la ganancia por volver supera la
  penalización: siempre se puede recuperar.
- **Ventana**: 30 días móviles, recalculada desde cero.

### ❌ Etapa 2 — Rendimiento → progreso (el hueco actual)
Que `EstadisticaPartido` (goles, asistencias, minutos, tarjetas) alimente MEN y
XP. Es lo que convierte la curva de "premio por venir" a "premio por lo que hacés
cuando venís".

**Decisiones a cerrar antes de construir:**
- ¿Los minutos jugados pesan por sí solos, o solo el rendimiento (goles/asistencias)?
  Cuidado: premiar minutos castiga al suplente por una decisión del DT, no propia.
- ¿Las tarjetas restan? Si sí, ¿rojas solamente? Son menores: el copy tiene que
  ser constructivo y el efecto, recuperable.
- ¿El tope de +12 se comparte con la asistencia o el rendimiento tiene el suyo?
- ¿Cómo se evita que un goleador de una categoría floja infle más que un defensor
  sólido de una fuerte?

### ❌ Etapa 3 — Proyección y seguimiento
La línea punteada de §6 y una **vista de seguimiento para el DT**: hoy nadie
puede ver "este chico ganó X este mes, y fue por esto". El dato existe; falta
mostrarlo. Es lo que convierte la curva en una herramienta de trabajo del DT y no
solo en un adorno del hub.

### ❌ Etapa 4 — Parámetros por escuela
Exponer los pesos de `CURVA` en el panel de parámetros (reusa `ParametroEscuela`).
Hoy son constantes globales.

### Lo que NO se va a hacer
Los stats **físicos y técnicos** (RIT, TIR, PAS, REG, DEF, FIS) **no** se mueven
por entrenar ni por jugar: solo por una medición real. Es la §2 de este documento
y la tesis del producto. Si alguna vez se cambia, tiene que ser una decisión
explícita en `DECISIONES.md`, no un efecto lateral de esta curva.

---

## 10. El pitch en una frase

> "No es una foto que sacás una vez al mes. Es la **carrera** de tu hijo: cada
> entrenamiento, cada partido y cada hábito lo empujan, lo ves crecer todos los
> días, y la medición lo confirma. Objetivo como un test, adictivo como un
> videojuego."
