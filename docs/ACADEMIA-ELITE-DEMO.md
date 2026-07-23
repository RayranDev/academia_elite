# Academia Elite — escuela demo curada

> Entorno de prueba **ordenado** (no aleatorio) para recorrer todo lo construido.
> Convive con "Academia Demo" (que queda reservada para los tests E2E). Se genera
> con `npm run db:seed` — que **borra y recrea** toda la base, así que corrélo solo
> cuando quieras resetear los datos de prueba.
>
> Última generación: 2026-07-23.

---

## 🔑 Accesos

Contraseña única para todas las cuentas: **`Demo1234!`**

| Rol | Email | Qué ve |
|---|---|---|
| **Escuela (dueño)** | `elite-admin@demo.app` | Panel de la escuela: jugadores, categorías, asistencia, ranking, membresías, anuncios, branding, exports. |
| **DT (entrenador)** | `elite-dt@demo.app` | Su "Hoy", plantel, calendario, Modo Sesión (entrenamiento y partido en vivo), evaluaciones. |
| **Familia / Jugador** | `elite-familia@demo.app` | El hub del jugador Bautista Ramírez: carta, progreso, próximos eventos, convocatorias, notificaciones. |

> El Súper Admin es global (no de esta escuela): `admin@demo.app` / `Demo1234!`.
> Para entrar al detalle de Academia Elite como Súper Admin necesita una **sesión
> de soporte** (M2), con motivo, que queda auditada.

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

## 💳 Membresías (para ver cobranza y su export)

Cargadas en **los tres estados** para el mes actual, más mora arrastrada del mes
anterior:

- **Pagadas:** 5 · **Pendientes:** 4 · **Vencidas:** 6 (incluye 2 con mora del mes previo).
- Monto de referencia: $45.000 por cuota.

> Descargá el Excel desde **Membresías → Descargar cobranza**.

---

## 📅 Eventos (categoría Sub-14, la de la familia)

| Cuándo | Tipo | Detalle |
|---|---|---|
| **Hoy 18:00** | Entrenamiento | "Control y pase" — sirve para probar **Iniciar sesión** desde el "Hoy" del DT. |
| +2 y +4 días | Entrenamiento | Dos entrenamientos técnicos próximos. |
| +3 días | Partido | vs. **Deportivo Andes** (local) — convocatoria con 2 confirmados y el resto pendiente. |
| Hace 6 días | Partido | vs. **Real Cuyo** (visitante), **empate 2-2** — con asistencia, y doblete de Bautista → alimenta ranking, goleadores y el **export de resultados**. |

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
npm run db:seed   # ⚠️ borra TODO y recrea Academia Demo + Academia Elite
```

Las credenciales y los datos son deterministas: cada re-seed reproduce exactamente
esta escuela.
