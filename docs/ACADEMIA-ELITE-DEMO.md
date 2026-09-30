# Academia Elite — escuela demo curada

> Entorno de prueba **ordenado** (no aleatorio) para recorrer todo lo construido.
> Convive con "Academia Demo" (que queda reservada para los tests E2E). Se genera
> con `npm run db:seed` — que **borra y recrea** toda la base, así que corrélo solo
> cuando quieras resetear los datos de prueba.
>
> Última generación: 2026-09-29.

---

## 🔑 Accesos

Contraseñas en `credenciales.md` (raíz del proyecto, local, no se sube al repo).

| Rol | Email | Qué ve |
|---|---|---|
| **Escuela (dueño)** | `elite-admin@demo.app` | Panel de la escuela: jugadores, categorías, asistencia, ranking, membresías, anuncios, branding, exports. |
| **DT (entrenador)** | `elite-dt@demo.app` | Su "Hoy", plantel, calendario, Modo Sesión (entrenamiento y partido en vivo), evaluaciones. |
| **Familia / Jugador** | `elite-familia@demo.app` | El hub del jugador Bautista Ramírez: carta, progreso, próximos eventos, convocatorias, notificaciones. |

> El Súper Admin es global (no de esta escuela): `admin@demo.app` (contraseña en
> `credenciales.md`). Para entrar al detalle de Academia Elite como Súper Admin
> necesita una **sesión de soporte** (M2), con motivo, que queda auditada.

---

## 🏫 La escuela

- **Nombre:** Academia Elite · **slug:** `elite` · **color de marca:** azul (`#3B82F6`).
- **Sede:** Predio Elite (Cancha Principal + Cancha Auxiliar).
- **DT:** Prof. Martín Herrera, a cargo de las 4 categorías.
- **Familia demo:** Familia Ramírez (papá de Bautista), con teléfono y parentesco
  cargados → alimenta el **export de contactos/nómina**.

### Categorías (por año de nacimiento)

| Categoría | Años | Jugadores |
|---|---|---|
| Sub-8 | 2018–2019 | 2 |
| Sub-10 | 2016–2017 | 3 |
| Sub-12 | 2014–2015 | 4 |
| Sub-14 | 2012–2013 | 4 |

---

## ⚽ Plantel (13 jugadores, todos ACTIVOS y evaluados)

Diseñado para mostrar **los 4 niveles de carta** (el color/marco depende del OVR).

| Cat | # | Jugador | Pos | OVR | Nivel | Foto |
|---|---|---|---|---|---|---|
| Sub-14 | 1 | **Bautista Ramírez** (familia) | DEL | 90 | 🟣 Héroe | ✅ |
| Sub-14 | 2 | Thiago Fernández | MED | 84 | 🟡 Oro | ✅ |
| Sub-14 | 3 | Lautaro Gómez | DEF | 76 | 🟡 Oro | — |
| Sub-14 | 4 | Ignacio Torres | POR | 68 | ⚪ Plata | — |
| Sub-12 | 5 | Dante Aguirre | MED | 89 | 🟣 Héroe | ✅ |
| Sub-12 | 6 | Valentín Silva | DEL | 84 | 🟡 Oro | — |
| Sub-12 | 7 | Benicio Morales | MED | 76 | 🟡 Oro | — |
| Sub-12 | 8 | Ciro Herrera | DEF | 68 | ⚪ Plata | — |
| Sub-10 | 9 | Bruno Navarro | DEL | 79 | 🟡 Oro | — |
| Sub-10 | 10 | Emilio Rojas | MED | 55 | 🟤 Bronce | — |
| Sub-10 | 11 | Gael Ortiz | DEF | 63 | 🟤 Bronce | — |
| Sub-8 | 12 | Tobías Cabrera | MED | 55 | 🟤 Bronce | — |
| Sub-8 | 13 | León Ríos | DEL | 59 | 🟤 Bronce | — |

Resumen de niveles: **Héroe 2 · Oro 5 · Plata 2 · Bronce 4**. Cada jugador tiene
2 evaluaciones (una más floja y otra al día) para ver **progresión** en la curva.

---

## 📈 Demo de evolución (3 meses, 4 jugadores nuevos)

Además del plantel curado de arriba, `npm run db:seed:evolucion` (encadenado
también al final de `npm run db:seed`) agrega **4 jugadores nuevos, uno por
posición**, cada uno con **4 evaluaciones reales** (día 0 / 30 / 60 / 90,
terminando cerca de hoy) para poder VER la evolución de 3 meses completa: la
carta, el gráfico de evolución (`EvolutionChart`) y, en el hub, el efecto en
vivo de la curva de MEN sobre el OVR.

No tienen cuenta de login (son roster puro, como la mayoría del plantel de
arriba) ni foto (los avatares se generan en proceso). Se identifican por
`codigoJugador` fijo (`EVOLPOR` / `EVOLDEF` / `EVOLMED` / `EVOLDEL`).

| Jugador | Pos | Categoría | Perfil | Asistencia (13 sem.) | OVR eval 1→2→3→4 | Nivel 1→2→3→4 |
|---|---|---|---|---|---|---|
| Agustín Molina | POR | Sub-14 | Progreso sostenido | ~92 % (1 ausencia justificada) | 57 → 62 → 67 → 71 | Bronce → Bronce → **Plata** → Plata |
| Franco Acosta | DEF | Sub-12 | Meseta (irregular) | ~46 %, sin racha | 67 → 67 → 68 → 68 | Plata (los 4) — prácticamente plano |
| Nicolás Peralta | MED | Sub-10 | Salto grande | ~85 % | 60 → 69 → 78 → 84 | Bronce → **Plata** → **Oro** → Oro |
| Mateo Villalba | DEL | Sub-8 | Bajón y recuperación | ~62 %, racha de 5 semanas ausente (mes 2, justificada) | 67 → 71 → **67 (bajón)** → 73 (recupera y supera el pico anterior) | Plata los 4 |

Notas de lectura:
- Los valores de arriba son la salida **real** de `computeStats` (motor de
  stats, `src/lib/stats-engine/`) para las medidas cargadas — no están
  escritos a mano.
- **Nicolás Peralta** además demuestra el **tope de bonus por evaluación**
  (`Escuela.topeBonusEntreEvals`, default 3): antes de la eval 2 se le otorgan
  4 logros BONUS pendientes → solo entran 3 (`[bonus +3]`), el sobrante queda
  pendiente y se consume junto con 2 nuevos en la eval 3 (otra vez `+3`).
- La asistencia semanal (13 entrenamientos dedicados por jugador, prefijo de
  evento `elite-evol-ev-`) es la que alimenta la **curva de desarrollo**
  (`src/lib/curva.ts`, ventana móvil de 30 días): el script termina llamando al
  MISMO cron real (`recalcularMenDiario`) que corre en producción, así que
  `Jugador.menBonus` de estos 4 queda actualizado de verdad, no simulado.
- El portero (Agustín) tiene sus 4 notas técnicas reetiquetadas por el motor
  (blocaje/distribución/juego aéreo/achique — ver "Evaluación del portero" en
  `DECISIONES.md`), no las de un jugador de campo.

Script: `prisma/seed-demo-evolucion.ts` (función `crearEvolucionDemo`, la
implementación) + `prisma/seed-demo-evolucion.run.ts` (punto de entrada
standalone). Usa el **núcleo real** del motor de evaluación
(`evaluarJugadorCore`, el mismo que la jornada de medición masiva) — no
duplica matemática del motor. Idempotente para SUS PROPIAS filas: identifica
sus jugadores por id fijo (`elite-evol-*`) y sus eventos por prefijo
(`elite-evol-ev-`); re-correrlo borra y recrea SOLO esas filas, nunca toca
otro jugador o evento. Excepción a propósito: el paso final llama al cron
real de la curva (`recalcularMenDiario`), que recalcula `Jugador.menBonus`
de **todos** los jugadores ACTIVO de la plataforma (tenant-global, igual que
en producción) — no solo estos 4.

---

## 💳 Membresías (para ver cobranza y su export)

Cargadas en **los tres estados** para el mes actual, más mora arrastrada del mes
anterior:

- **Pagadas:** 5 · **Pendientes:** 4 · **Vencidas:** 6 (incluye 2 con mora del mes previo).
- Monto de referencia: $45.000 por cuota.

> Descargá el Excel desde **Membresías → Descargar cobranza**.

---

## 📅 Eventos

### Historial de asistencia (todas las categorías)

**8 semanas de entrenamientos ya cerrados con asistencia cargada** — es lo que
hace que la matriz de asistencia, la **evolución mensual** y el export tengan
datos de verdad. La tasa de presentes varía a propósito por categoría para que
el semáforo muestre los tres colores:

| Categoría | Tasa de asistencia | Semáforo |
|---|---|---|
| Sub-14 | ~92 % | 🟢 verde |
| Sub-12 | ~80 % | 🟢 verde |
| Sub-10 | ~64 % | 🟡 ámbar |
| Sub-8 | ~45 % | 🔴 rojo |

### Agenda de la Sub-14 (la categoría de la familia)

| Cuándo | Tipo | Detalle |
|---|---|---|
| **Hoy 18:00** | Entrenamiento | "Control y pase" — sirve para probar **Iniciar sesión** desde el "Hoy" del DT. |
| +2 y +4 días | Entrenamiento | Dos entrenamientos técnicos próximos. |
| +3 días | Partido | vs. **Deportivo Andes** (local) — convocatoria con 2 confirmados y el resto pendiente. |
| Hace 6 días | Partido | vs. **Real Cuyo** (visitante), **empate 2-2** — con asistencia y doblete de Bautista → alimenta ranking, goleadores y el **export de resultados**. |

> ⏱️ **Las fechas son relativas al día en que corriste el seed.** El evento "de
> hoy" es *hoy* solo la jornada en que seedeaste; al día siguiente pasa a ser
> pasado y el "Hoy" del DT no tiene eventos de hoy (muestra el próximo evento). Volvé a correr `npm run db:seed` para
> refrescar la agenda.

---

## 🧭 Qué recorrer por rol

**Como Escuela (`elite-admin@demo.app`):**
1. **Jugadores** → botones *Descargar jugadores / evaluaciones / contactos*.
2. **Asistencia** → matriz *Evolución mensual* + *Descargar asistencia*.
3. **Ranking** → Top OVR y goleadores + *Descargar resultados*.
4. **Membresías** → buscador con autocomplete + estados + *Descargar cobranza*.
5. **Auditoría** → filtros y paginación (cada export queda registrado).

**Como DT (`elite-dt@demo.app`):**
1. **Hoy** → el entrenamiento de hoy con **▶ Iniciar**.
2. **Modo Sesión** → pasar lista (1 toque), observaciones, cierre.
3. En un **partido**: marcador en vivo, goles con anotador, tarjetas (sumar/quitar,
   2 amarillas = roja), y cierre que notifica una sola vez.

**Como Familia (`elite-familia@demo.app`):**
1. El **hub** de Bautista: carta Héroe, stats, progreso.
2. **Convocatorias**: confirmar/rechazar el próximo partido.
3. **Mi cuenta**: nombre, teléfono y parentesco (los que alimentan el export de contactos).

---

## ♻️ Regenerar

```bash
npm run db:seed             # ⚠️ borra TODO y recrea Academia Demo + Academia Elite
                             #    (incluye la demo de evolución del final)
npm run db:seed:evolucion   # regenera SOLO los 4 jugadores de evolución
                             #    (rápido; también recalcula el bonus de MEN
                             #    de TODA la plataforma vía el cron real)
```

Las credenciales y los datos son deterministas: cada re-seed reproduce exactamente
esta escuela. `db:seed:evolucion` es igual de determinista: identifica sus 4
jugadores por id fijo y los recrea sin tocar otro jugador o evento — útil para
iterar rápido sobre la demo de evolución sin re-sembrar toda la base (sí
recalcula, vía el cron real de la curva, el bonus de MEN de todos los
jugadores activos de la plataforma — ver la sección de arriba).
