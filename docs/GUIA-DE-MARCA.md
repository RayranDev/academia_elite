# Guía de marca

> Cómo se presenta **Academia Élite** hacia afuera: nombre, voz, colores, perfiles
> públicos y qué se puede mostrar. Esto es permanente y sobrevive a cualquier campaña.
> El plan de una campaña concreta vive aparte y referencia este documento; nunca repite
> sus valores.

---

## 1. Regla innegociable: cero caras de menores

Manda sobre cualquier decisión creativa. Hoy y siempre.

**Nunca se publica la foto de un menor real.** Ni con permiso verbal, ni "solo en una
story", ni recortada, ni de espaldas si se lo reconoce.

La razón no es estética. El producto ya sirve las fotos de menores por API protegida
(`/api/archivos/foto/[jugadorId]`), validadas por magic bytes, con EXIF stripped,
recomprimidas, nombre UUID y `no-store`. Todo ese trabajo se anula con un solo posteo.
Y en Colombia la Ley 1581 (habeas data) no distingue entre un descuido y una intención.
Marco completo en [`HABEAS-DATA.md`](HABEAS-DATA.md).

Fuera del personaje de marca (abajo), todo asset visual sale de una de estas tres fuentes:

1. **Cartas del seed demo** — los jugadores son ficticios. Ver
   [`ACADEMIA-ELITE-DEMO.md`](ACADEMIA-ELITE-DEMO.md).
2. **Avatares DiceBear** — se generan en proceso, sin API externa.
3. **Fotos sin rostro identificable** — botines, pelota, cancha, siluetas a contraluz.
   Bien usadas son más cinematográficas que una cara.

Esta regla se le repite a cualquiera que colabore con contenido, sea diseñador,
community manager o agencia. Va en el brief, no en la charla.

### La única excepción: el personaje de marca

Academia Élite tiene **una cara**: el niño de `public/nino_carta.png`. **No es un menor
real**: es una imagen generada por IA. Es el jugador de la carta de la landing y el
protagonista del reveal de la campaña.

Por eso no rompe la regla — y para que siga sin romperla:

- **Es el único.** Ningún otro niño, real o generado, aparece jamás en la comunicación.
- **Sale siempre de su archivo.** Se usa la imagen original o una carta capturada con
  ella. Nunca se le pide a una IA que "genere un niño parecido": cada generación nueva
  es otra cara, y otra cara es otra persona.
- **Su identidad no se negocia.** Si un video o una edición le cambia la cara, se
  descarta, aunque todo lo demás esté perfecto.
- **Se etiqueta como contenido generado con IA** en cada red que lo pida (en Instagram,
  la etiqueta "Información de IA"). Es una cara fotorrealista: la audiencia tiene
  derecho a saber que no es un niño real.
- **Nunca es un testimonio.** Puede aparecer como jugador de la **escuela de
  demostración** en los videos de funcionamiento (`marketing/kit-funcionamiento/`),
  porque ahí se dice que es una demo. Nunca se lo presenta como alumno de una escuela
  real, ni se le inventa una historia que pueda leerse como un caso real.

---

## 2. Identidad verbal

### Nombre

Siempre **"Academia Élite"**, con tilde en la E. Sin excepciones, en ningún soporte.

### Taglines

Ya existen en el producto. No se inventan nuevas.

| Tagline | Dónde vive | Para qué sirve |
|---|---|---|
| *Donde nacen las estrellas* | `src/components/landing/LeadForm.tsx` | Cierre emocional |
| *Convierte el esfuerzo en una carta* | `src/components/landing/Hero.tsx` | Explica el producto en seis palabras |

### Idioma

**Español neutro / colombiano. Nunca rioplatense.**

El mercado es Colombia — el indicativo por defecto del formulario es `+57` — y la landing
ya está escrita en neutro ("Convierte", "Déjanos", "Inténtalo"). Se usa **tú**, no *vos*.

Esto aplica a todo lo que lee un cliente: redes, emails, propuestas, UI. La comunicación
interna del equipo es otra cosa.

### El riesgo de marca y su mitigación obligatoria

Hay que tenerlo presente cada vez que se escribe un perfil.

"Academia Élite" **suena a escuela de fútbol, no a plataforma**. Un director que nos ve
por primera vez procesa "otra academia" — competencia, no proveedor. Además choca de
frente con el white-label por escuela (`--brand`): el producto está diseñado para
*desaparecer* detrás de la marca del cliente, y el nombre compite con ella.

La decisión de conservar el nombre está tomada. La mitigación es innegociable:

> **El primer renglón de cualquier bio, perfil, propuesta o presentación dice
> "Plataforma para academias de fútbol".** Nunca se arranca hablando de fútbol.

El copy hace el trabajo que el nombre no hace.

---

## 3. Identidad visual

Fuente única de la paleta. Los valores salen de `src/app/globals.css` (`@theme`): si
cambia el tema del producto, se actualiza acá y todo lo demás lo referencia.

| Token | Hex | Uso |
|---|---|---|
| `base` | `#070b14` | Fondo de todo. Navy casi negro. Es la firma visual |
| `pitch` | `#4ade80` | Acento único. Se usa poco y pega fuerte |
| `bronce` | `#b08d57` | Nivel 1 |
| `plata` | `#c7d1dd` | Nivel 2 |
| `oro` | `#f5c542` | Nivel 3 |
| `heroe` | `#a78bfa` → `#f0abfc` | Nivel 4 |

**Tipografía**: negra, itálica, mayúsculas — el mismo tratamiento del H1 de
`src/components/landing/Hero.tsx`. Lo público y la landing tienen que parecer el mismo
producto, no dos empresas.

**Los cuatro niveles son un recurso narrativo, no solo colores.** Bronce → Plata → Oro →
Héroe es una escalada que el producto ya trae incorporada: sirve para estructurar
campañas, presentaciones y demos sin inventar un arco nuevo.

**Contraste**: la paleta es oscura. Todo asset se verifica en pantalla de celular a plena
luz antes de publicarse.

---

## 4. Perfiles públicos

### Handle

Preferencia en orden: `@academiaelite.app` → `@academiaelite.pro` → `@academiaelite.io`.

El sufijo hace parte del trabajo de desambiguación: se lee ".app" y se entiende software.

### Bio base

```
Plataforma para academias de fútbol ⚽
Evaluaciones reales → carta con stats 1–99
Bronce · Plata · Oro · Héroe
Donde nacen las estrellas
👇 Conoce la plataforma
```

El orden no es decorativo: qué somos, qué hacemos, cómo se ve, por qué importa, qué hacer.

---

## 5. A dónde va el tráfico

**Siempre a la landing. Nunca al DM.**

El embudo comercial ya está construido y es el que hay que usar:

```
LeadForm  →  /api/leads  →  lead.service  →  panel admin (estados + conversión)
```

Archivos: `src/components/landing/LeadForm.tsx`, `src/app/api/leads/route.ts`,
`src/services/lead.service.ts`, `src/components/admin/ConvertirLeadDialog.tsx`.

Un DM no se mide, no se filtra, no se le asigna responsable y se pierde. Un lead entra al
mini-CRM con estado, próxima acción y notas.

**El formulario pide 5 campos con teléfono obligatorio, y así se queda.** Para tráfico
frío es fricción alta, sí — pero para una solicitud de demo B2B es correcto: filtra
curiosos y deja leads con los que se puede hacer seguimiento comercial real.

**Atribución**: el modelo `Lead` tiene `origen` (`"LANDING"`, `"REFERIDO"`, …). Toda
campaña que mande tráfico debe llegar con su `utm_source` para poder medirse.
