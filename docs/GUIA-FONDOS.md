# Guía — Crear fondos de carta con efectos

> Para el Súper Admin. Cómo crear fondos profesionales desde el creador, con o
> sin escribir CSS. El motor de efectos vive en `src/lib/cartas/efectos.ts`.

---

## 1. Cómo entrar

`/admin/fondos` (solo Súper Admin) → **Nuevo fondo**. Cada fondo tiene un código
único (inmutable), nombre, descripción, estilo, efecto y un requisito de
desbloqueo. La vista previa se actualiza en vivo.

## 2. Camino rápido (recomendado)

1. Abrí **Nuevo fondo**.
2. En **Plantillas**, hacé click en una. Eso rellena el estilo, el color de
   texto, el efecto y sus parámetros de golpe — sin tocar CSS.
3. Ajustá **código**, **nombre** y **requisito de desbloqueo**.
4. Mirá el preview y **Crear fondo**.

## 3. Camino manual

- **Estilo CSS**: el valor de `background` de toda la carta (un degradado o
  patrón). Ej.: `linear-gradient(160deg,#0b1220,#1e293b)`.
- **Color de texto**: para que los números se lean sobre el fondo. Elegilo
  pensando en la zona MÁS clara del fondo + efecto.
- **Efecto**: `Ninguno`, `Metálico` (con **tinte**: acero/oro/cobre/titanio),
  `Hielo`, `Trama` (con **patrón**: carbono/espiga/puntos/rombos/líneas/
  hexágonos) u `Holográfico`. Con efecto activo aparece **Intensidad**
  (Sutil/Media/Intensa).

> El efecto apila capas sobre el estilo base. Si elegís un efecto, reemplaza al
> brillo genérico por nivel — el fondo aporta su propia textura.

## 4. Requisito de desbloqueo

- **Siempre**: disponible para todos.
- **Logro**: requiere ese logro.
- **Nivel de carta**: Bronce ≤ Plata ≤ Oro ≤ Héroe.
- **Nivel personal**: nivel mínimo de progreso semanal.

Un desbloqueo, una vez logrado, se conserva aunque el jugador baje de nivel.

## 5. Recetario CSS (para el camino manual)

```css
/* Metálico falso estático (sin motor) */
linear-gradient(160deg,#cbd5e1 0%,#94a3b8 35%,#e2e8f0 60%,#64748b 100%)

/* Hielo base */
linear-gradient(160deg,#bae6fd 0%,#e0f2fe 35%,#7dd3fc 70%,#cffafe 100%)

/* Carbono base (la trama la pone el efecto) */
linear-gradient(160deg,#1f2937,#111827)
```

Para metálico/hielo/trama **animados y parametrizables**, usá el campo **Efecto**
en vez de meter todo en el CSS: el motor agrega grano, reflejos y animación.

## 6. Buenas prácticas

- **Contraste primero**: si los stats no se leen, subí el contraste del color de
  texto o bajá la intensidad.
- **No abuses de la opacidad**: una textura sutil lee como premium; una saturada
  lee como sticker.
- **El estado base manda**: la descarga PNG captura un **frame estático** (la
  animación no se "congela" bien). Cada efecto ya está diseñado para verse
  profesional quieto — verificá el preview antes de guardar.
