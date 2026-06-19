# Correcciones y mejoras — Sprint M.2

Fecha: 2026-06-12 · Estado: ✅ completado · typecheck + lint limpios · 91 unit ·
8 E2E · build de producción OK.

5 puntos solicitados + 1 extra. Respeta arquitectura por capas, seguridad
(rol + tenant + Zod + auditoría) y componetización. Dónde integrar cada cosa
queda indicado en cada bloque.

---

## 1. Encuadre de la foto (cabezas cortadas)

El recorte interactivo 3:4 ya existía (Sprint M.1, `react-easy-crop`). El bug
residual era de encuadre en la carta.

- `src/components/cards/PlayerCard.tsx` — la foto usa `object-cover object-top`
  (ancla la cabeza arriba) y la máscara `FOTO_MASK` se centró más arriba
  (`at 50% 36%`) para no recortar/desvanecer la parte superior de la cabeza.
  Aplica tanto a la carta interna como a la de la landing (mismo componente).

## 2. Reactividad al cambiar la foto

- `src/services/player.service.ts` — la URL pública lleva `?v=<archivo>` (el
  nombre UUID del archivo cambia en cada subida → cache-buster real).
- `src/components/jugador/FotoConsentimiento.tsx` — tras subir, una versión local
  (`?v=Date.now()`) refresca la previsualización al instante (+ `router.refresh()`).

## 3. Transparencia + fondos por nivel vs especiales

- El contenedor del retrato es **transparente**; el color lo pone el material de
  la **carta**, no la foto (un PNG sin fondo ya no recibe fondo artificial).
- `src/types/index.ts` + `PlayerCard.tsx` — el marco se asigna automáticamente
  por OVR, pero el **morado de Héroe** es un fondo ESPECIAL: la carta de un OVR
  de Héroe se muestra con marco **Oro** salvo que `heroeEquipado` sea cierto. Se
  activa equipando el fondo especial "LEYENDA" (desbloqueable por méritos, M.1).
- `src/services/player.service.ts` rellena `heroeEquipado` y `fondoEstilo` desde
  el fondo equipado. La demo de la landing fuerza `heroeEquipado` como escaparate.

## 4. Registro del padre y vinculación por códigos (aditivo)

- **Schema** (+migración `codigo_jugador`): `Jugador.codigoJugador` (único,
  generado al crear el jugador en todos los flujos: DT, importación, registro,
  seed).
- **Nueva página pública** `src/app/(auth)/registro/page.tsx` con dos caminos:
  - **Vincular a mi hijo** (`VincularHijoForm`): el padre crea cuenta con
    **código de escuela** (slug) + **código de jugador**; queda vinculado al
    perfil existente y ve sus stats.
  - **Registrar hijo nuevo** (`IrARegistroCodigo`): con código de invitación →
    flujo actual (`/registro/[codigo]`), jugador PENDIENTE con carta estándar.
- **Servicio** `registrarPadreYVincular` (en `registro.service.ts`): valida y
  vincula en **transacción**. Si el jugador no existe, ya tiene padre o el email
  está duplicado → **error con aviso y NINGUNA cuenta creada** (no hay borrado
  lógico que limpiar). Acción pública `vincularHijoAction` (rate limit 5/h).
- **Gestión DT/Escuela/SA**: el `codigoJugador` se muestra en la lista de gestión
  (`JugadoresGestion`) cuando el jugador no tiene familia, para entregárselo.
- **Entrada visible**: enlace "Regístrate" en el login.

## 5. Descargar la carta con marca de agua

- `src/components/jugador/HubHero.tsx` — botón "Descargar carta": exporta la carta
  a PNG con **html-to-image** (mejor que html2canvas con Tailwind v4 oklch +
  gradientes). Inyecta la marca de agua **"Academia Elite — Donde nacen las
  estrellas · academia-elite.app"** que solo aparece en el archivo (en pantalla
  va con `opacity-0`). Texto/dominio en constantes editables al inicio del archivo.

## Extra — Simulador del Súper Admin con apariencia

- `src/components/admin/SimuladorCarta.tsx` — además de los stats, ahora prueba:
  **fondo** (del catálogo), **avatar aleatorio** y **foto** (con el mismo recorte
  3:4). Todo es previsualización: no guarda nada. Catálogo vía
  `listarCatalogoFondos` (SA).

---

## Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 91 unit (nuevo: `codes`) |
| `npm run build` | ✅ (incluye `/registro`) |
| `npm run test:e2e` | ✅ 8/8 |

### Notas
- Dependencia nueva: `html-to-image`. (`react-easy-crop` ya estaba de M.1; cubre
  el requisito de recorte sin añadir `react-image-crop`.)
- Migración nueva: `codigo_jugador`. Tras `git pull`: `npm install` +
  `npx prisma migrate deploy` (o `db:seed` en dev).
- El seed ahora limpia `FondoDesbloqueado` y `ParametroEscuela` antes de borrar
  jugadores/escuelas (evita violaciones de FK al re-sembrar).
- Marca de agua editable en `HubHero.tsx` (`MARCA_AGUA`, `WEB`).
- Demo: el jugador "Lucas García" tiene `codigoJugador = LUCAS25` para probar.
