# Motor de Estadísticas (Stats Engine v1.1)

El motor de cálculo deportivo (`src/lib/stats-engine/`) es una biblioteca **completamente pura**: no tiene dependencias de Prisma, Next.js ni React. Dadas las mismas entradas, siempre produce exactamente las mismas salidas. Es consumido tanto por la pantalla de evaluación del DT (`src/services/evaluacion.service.ts`) como por el simulador interactivo y la plantilla de cálculo en Excel (`src/services/plantilla-simulador.service.ts`).

---

## 1. Entradas del Motor

El cálculo de una carta requiere un conjunto de medidas crudas y parámetros de contexto:

### 1.1 Medidas de Evaluación (`MedidasEvaluacion`)
1. **Pruebas Físicas Objetivas**:
   - `sprint30mSeg` (segundos): Velocidad lineal. Menor tiempo es mejor (inversa).
   - `saltoVerticalCm` (centímetros): Potencia de tren inferior (directa).
   - `agilidadIllinoisSeg` (segundos): Coordinación y cambio de dirección. Menor tiempo es mejor (inversa).
   - `resistenciaYoyoNivel` (nivel): Capacidad aeróbica intermitente (directa).
2. **Evaluación Técnica (Notas 1.0 a 10.0)**:
   - Jugador de campo: `controlBalon`, `pase`, `tiro`, `regate`.
   - Portero (`POR`): Misma escala numérica pero miden `blocaje`, `distribución`, `juegoAereo`, `achique` (mapeadas semánticamente en `src/lib/medidas-tecnicas.ts`).
3. **Dimensiones de Mentalidad (Notas 1.0 a 10.0)**:
   - `actitud`, `concentracion`, `trabajoEquipo`, `resiliencia`.

### 1.2 Opciones de Cómputo (`OpcionesComputo`)
- `posicion`: `POR` | `DEF` | `MED` | `DEL`.
- `grupoEdad`: `SUB8` | `SUB10` | `SUB12` | `SUB14` | `SUB16` (determina los rangos físicos de referencia) o un objeto de `rangos` personalizado.
- `pesoMenEnOvr`: Ponderación de la mentalidad en el OVR final (por defecto `0.1` = 10%).
- `topeBonus`: Máximo de puntos acumulables por logros (por defecto `3`).
- `bonus`: Arreglo de logros activos `{ stat: StatCarta, valor: number }`.

---

## 2. Normalización de Medidas (`normalize.ts`)

Todas las medidas crudas se normalizan a la escala de carta antes de combinarse.

### 2.1 Pruebas Físicas: Escala `[40, 99]`
Las capacidades físicas no descienden de 40 puntos para preservar la psicología del menor y evitar cartas desmotivantes:
$$\text{frac} = \begin{cases} \dfrac{\text{max} - \text{valor}}{\text{max} - \text{min}} & \text{si es inversa (sprint, agilidad)} \\[8pt] \dfrac{\text{valor} - \text{min}}{\text{max} - \text{min}} & \text{si es directa (salto, yoyo)} \end{cases}$$

$$\text{frac}_{\text{clamp}} = \max(0, \min(1, \text{frac}))$$
$$\text{FísicaNormalizada} = \text{round}(40 + \text{frac}_{\text{clamp}} \times (99 - 40))$$

### 2.2 Pruebas Técnicas y Mentalidad: Escala `[1, 99]`
Multiplicador lineal directo:
$$\text{NotaNormalizada} = \max(1, \min(99, \text{round}(\text{nota} \times 9.9)))$$
- Nota `1.0` $\rightarrow 10$
- Nota `5.0` $\rightarrow 50$
- Nota `10.0` $\rightarrow 99$

---

## 3. Derivación de Atributos de Carta (`weights.ts`)

A partir de las medidas normalizadas ($\text{vel}, \text{pot}, \text{agi}, \text{res}, \text{ctrl}, \text{pasT}, \text{tirT}, \text{regT}$), se calculan los 6 stats visibles. Todas las combinaciones ponderadas suman exactamente 1.0.

### 3.1 Jugador de Campo (`COEF_CAMPO`)
| Stat de Carta | Fórmula de Composición | Medidas Intervinientes |
|---|---|---|
| **RIT** (Ritmo) | $0.65 \times \text{vel} + 0.35 \times \text{agi}$ | Velocidad (65%) + Agilidad (35%) |
| **TIR** (Tiro) | $0.75 \times \text{tirT} + 0.25 \times \text{pot}$ | Técnica de tiro (75%) + Potencia de salto (25%) |
| **PAS** (Pase) | $0.75 \times \text{pasT} + 0.25 \times \text{ctrl}$ | Técnica de pase (75%) + Control de balón (25%) |
| **REG** (Regate) | $0.55 \times \text{regT} + 0.25 \times \text{agi} + 0.20 \times \text{ctrl}$ | Técnica de regate (55%) + Agilidad (25%) + Control (20%) |
| **DEF** (Defensa) | $0.45 \times \text{res} + 0.30 \times \text{pot} + 0.25 \times \text{ctrl}$ | Resistencia (45%) + Potencia (30%) + Control (25%) |
| **FIS** (Físico) | $0.50 \times \text{res} + 0.35 \times \text{pot} + 0.15 \times \text{vel}$ | Resistencia (50%) + Potencia (35%) + Velocidad (15%) |

### 3.2 Portero (`COEF_PORTERO`)
El arquero utiliza una derivación técnica especializada porque sus notas evaluadas representan fundamentos específicos de su puesto:
- `ctrl` = Blocaje y seguridad de manos
- `pasT` = Distribución con mano y pie
- `tirT` = Salidas y juego aéreo
- `regT` = Achique y mano a mano

| Stat de Carta | Fórmula de Composición | Justificación Técnica |
|---|---|---|
| **RIT** | $0.60 \times \text{agi} + 0.40 \times \text{vel}$ | Reacción de piernas y velocidad de anticipación |
| **TIR** | $0.60 \times \text{tirT} + 0.40 \times \text{pot}$ | Juego aéreo de puños impulsado por salto vertical |
| **PAS** | $0.80 \times \text{pasT} + 0.20 \times \text{pot}$ | Distribución precisa respaldada por potencia de saque |
| **REG** | $0.60 \times \text{regT} + 0.40 \times \text{agi}$ | Capacidad de achique y flexibilidad en el uno contra uno |
| **DEF** | $0.50 \times \text{ctrl} + 0.25 \times \text{agi} + 0.25 \times \text{tirT}$ | Blocaje de manos (50%) + Reflejos ágiles (25%) + Dominio aéreo (25%) |
| **FIS** | $0.50 \times \text{res} + 0.35 \times \text{pot} + 0.15 \times \text{vel}$ | Base física idéntica al jugador de campo |

---

## 4. Mentalidad (MEN) y Logros

### 4.1 Cálculo de MEN
El atributo **MEN** (Mentalidad) es el promedio aritmético de las 4 notas psicológicas normalizadas:
$$\text{MEN} = \text{round}\left(\frac{\text{norm}(\text{actitud}) + \text{norm}(\text{concentracion}) + \text{norm}(\text{trabajoEquipo}) + \text{norm}(\text{resiliencia})}{4}\right)$$

### 4.2 Aplicación de Bonificaciones de Logros
Si el deportista tiene insignias o reconocimientos especiales otorgados por su DT (`opts.bonus`):
- Los puntos de bonificación se suman directamente al atributo correspondiente (o a MEN) **antes** de calcular el OVR.
- El incremento total combinado no puede superar el límite `opts.topeBonus` (3 puntos por defecto).

---

## 5. Cálculo del OVR (Overall Rating)

El OVR combina el rendimiento por posición con el factor de mentalidad:

### 5.1 Ponderaciones por Posición (`PESOS_POSICION`)
Cada fila suma 1.0 (100%):

| Posición | RIT | TIR | PAS | REG | DEF | FIS |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **POR** (Portero) | 0.10 | 0.05 | 0.15 | 0.10 | **0.35** | 0.25 |
| **DEF** (Defensa) | 0.15 | 0.05 | 0.15 | 0.10 | **0.35** | 0.20 |
| **MED** (Mediocampista) | 0.15 | 0.15 | **0.30** | 0.20 | 0.10 | 0.10 |
| **DEL** (Delantero) | 0.20 | **0.30** | 0.15 | 0.20 | 0.05 | 0.10 |

### 5.2 Fórmula de Cierre
$$\text{SumaPosicion} = \sum (\text{Stat}_i \times \text{Peso}_{\text{pos}, i})$$
$$\text{OVR} = \max(1, \min(99, \text{round}((1 - \text{pesoMen}) \times \text{SumaPosicion} + \text{pesoMen} \times \text{MEN})))$$

---

## 6. Niveles de Carta (`levels.ts`)

El OVR obtenido clasifica al deportista en cuatro niveles de tarjeta de colección:

| Nivel | Rango de OVR | Estética y Color | Simbología |
|---|:---:|---|---|
| **BRONCE** | $\le 64$ | Tonalidad cobre / terrosa | Etapa de iniciación y fundamentos |
| **PLATA** | $65 - 74$ | Gris metalizado brillante | Dominio técnico y constancia |
| **ORO** | $75 - 84$ | Dorado luminoso | Rendimiento superior y liderazgo |
| **HÉROE** | $\ge 85$ | Efectos holográficos especiales | Excelencia deportiva de élite |

*Nota técnica*: Los umbrales (65, 75, 85) son configurables a nivel global mediante `ParametroFormula` o por academia mediante `ParametroEscuela`. La función `umbralesDesdeParametros` valida la monotonía estricta ($\text{plata} < \text{oro} < \text{heroe}$); si hay incoherencia, recurre a los valores seguros por defecto.

---

## 7. Recálculo Dinámico: Curva de Desarrollo (`ovrConMen`)

Para evitar re-evaluar físicamente al menor cada semana, la plataforma cuenta con una función pura de ajuste continuo:
$$\text{OVR}_{\text{actualizado}} = \text{round}((1 - \text{pesoMen}) \times \text{SumaPosicionBase} + \text{pesoMen} \times \text{MEN}_{\text{dinamico}})$$
Esto permite que los micro-hábitos de entrenamiento, la asistencia a clases y el cumplimiento de tareas de la semana actualicen el OVR de la carta en tiempo real mediante un cron nocturno (`/api/cron/men-diario`).

---

## 8. Ejemplo Numérico Verificado Paso a Paso

Consideremos un jugador de categoría **SUB12**, posición **DEL** (Delantero):

### 1. Entradas Crudas:
- **Físicas**: `sprint30mSeg` = 5.0 s, `saltoVerticalCm` = 30 cm, `agilidadIllinoisSeg` = 17.5 s, `resistenciaYoyoNivel` = 10.0.
- **Técnicas**: `controlBalon` = 8.0, `pase` = 7.0, `tiro` = 9.0, `regate` = 8.5.
- **Mentalidad**: `actitud` = 8.0, `concentracion` = 8.0, `trabajoEquipo` = 7.0, `resiliencia` = 9.0.

### 2. Normalización de Pruebas Físicas (Rango SUB12: Sprint 4.5 a 6.5s [inv], Salto 15 a 42cm, Agilidad 16 a 21s [inv], Yo-Yo 4 a 15):
- **Velocidad** ($\text{vel}$): $\text{frac} = (6.5 - 5.0) / (6.5 - 4.5) = 1.5 / 2.0 = 0.75 \rightarrow 40 + 0.75 \times 59 = 40 + 44.25 = \mathbf{84}$.
- **Potencia** ($\text{pot}$): $\text{frac} = (30 - 15) / (42 - 15) = 15 / 27 \approx 0.555 \rightarrow 40 + 0.555 \times 59 = 40 + 32.77 = \mathbf{73}$.
- **Agilidad** ($\text{agi}$): $\text{frac} = (21 - 17.5) / (21 - 16) = 3.5 / 5.0 = 0.70 \rightarrow 40 + 0.70 \times 59 = 40 + 41.3 = \mathbf{81}$.
- **Resistencia** ($\text{res}$): $\text{frac} = (10 - 4) / (15 - 4) = 6 / 11 \approx 0.545 \rightarrow 40 + 0.545 \times 59 = 40 + 32.18 = \mathbf{72}$.

### 3. Normalización Técnica:
- $\text{ctrl} = \text{round}(8.0 \times 9.9) = \mathbf{79}$
- $\text{pasT} = \text{round}(7.0 \times 9.9) = \mathbf{69}$
- $\text{tirT} = \text{round}(9.0 \times 9.9) = \mathbf{89}$
- $\text{regT} = \text{round}(8.5 \times 9.9) = \mathbf{84}$

### 4. Derivación de Atributos de Campo:
- $\text{RIT} = 0.65 \times 84 + 0.35 \times 81 = 54.6 + 28.35 = 82.95 \rightarrow \mathbf{83}$
- $\text{TIR} = 0.75 \times 89 + 0.25 \times 73 = 66.75 + 18.25 = 85.0 \rightarrow \mathbf{85}$
- $\text{PAS} = 0.75 \times 69 + 0.25 \times 79 = 51.75 + 19.75 = 71.5 \rightarrow \mathbf{72}$
- $\text{REG} = 0.55 \times 84 + 0.25 \times 81 + 0.20 \times 79 = 46.2 + 20.25 + 15.8 = 82.25 \rightarrow \mathbf{82}$
- $\text{DEF} = 0.45 \times 72 + 0.30 \times 73 + 0.25 \times 79 = 32.4 + 21.9 + 19.75 = 74.05 \rightarrow \mathbf{74}$
- $\text{FIS} = 0.50 \times 72 + 0.35 \times 73 + 0.15 \times 84 = 36.0 + 25.55 + 12.6 = 74.15 \rightarrow \mathbf{74}$

### 5. Mentalidad (MEN):
- $\text{norm}(\text{actitud}) = 79, \quad \text{norm}(\text{concentracion}) = 79, \quad \text{norm}(\text{trabajoEquipo}) = 69, \quad \text{norm}(\text{resiliencia}) = 89$
- $\text{MEN} = \text{round}((79 + 79 + 69 + 89) / 4) = \text{round}(316 / 4) = \mathbf{79}$

### 6. OVR para Delantero (Pesos: RIT 0.20, TIR 0.30, PAS 0.15, REG 0.20, DEF 0.05, FIS 0.10):
$$\text{SumaPosicion} = 83 \times 0.20 + 85 \times 0.30 + 72 \times 0.15 + 82 \times 0.20 + 74 \times 0.05 + 74 \times 0.10$$
$$\text{SumaPosicion} = 16.6 + 25.5 + 10.8 + 16.4 + 3.7 + 7.4 = 80.4$$
$$\text{OVR} = \text{round}((1 - 0.10) \times 80.4 + 0.10 \times 79) = \text{round}(0.90 \times 80.4 + 7.9) = \text{round}(72.36 + 7.9) = \text{round}(80.26) = \mathbf{80}$$

### 7. Resultado Final:
- **Stats**: RIT 83, TIR 85, PAS 72, REG 82, DEF 74, FIS 74, MEN 79.
- **OVR**: **80**.
- **Nivel de Carta**: **ORO** (al encontrarse en el rango 75–84).
