# Correcciones — Sprint M.3 (transparencia, carta unificada, tema en landing)

Fecha: 2026-06-12 · ✅ typecheck + lint limpios · 91 unit · 8 E2E · build OK.

---

## 1. Transparencia de la foto y fondos de la carta

**Causa raíz del fondo negro:** no estaba en la carta (su contenedor ya era
transparente y el material va en el contenedor exterior), sino en el
**pre-recorte en cliente**: el canvas se exportaba a **JPEG**, que no soporta
canal alfa y rellena las zonas transparentes de **negro** antes de subir.

- `src/lib/foto/cliente.ts` — `prepararParaRecorte` ahora exporta a **WebP**
  (`toDataURL("image/webp")`), que conserva la transparencia. El recorte
  (`recortarABlob`) ya devolvía WebP con alfa y el servidor (`procesarFoto`,
  sharp → webp) también la conserva.
- `src/components/cards/PlayerCard.tsx` — el contenedor del retrato (`div`
  alrededor del `img`) y el `img` son `bg-transparent` explícitos; el material
  (Bronce/Plata/Oro/Héroe) se aplica en el contenedor **exterior** de la carta,
  así la transparencia deja ver el fondo de la carta.
- `src/components/jugador/FotoCropper.tsx` — el recortador muestra un **tablero
  de transparencia** (no negro), para que se vea que un PNG/SVG sin fondo no
  recibe fondo sólido.

## 2. Carta del dashboard idéntica a la de la landing

Ambas ya usaban el **mismo componente** `PlayerCard` con `size="hero" interactive`.
Se unificó el **wrapper**:

- `src/components/jugador/HubHero.tsx` — el contenedor de la carta pasa a
  `flex justify-center perspective-[1000px]` (igual que `Hero.tsx` y
  `LiveDemo.tsx`), conservando `relative` solo para la marca de agua. Misma
  configuración, tamaño, clases y presentación de la foto en ambos sitios.

## 3. Modo claro/oscuro en la Landing Page

Se reutiliza el sistema de tema ya existente en la app (clase `light` en `<html>`
+ `localStorage` `fcm-tema` + script anti-FOUC del layout raíz), en lugar de
introducir un sistema paralelo de clases `dark:`.

- **Nuevo** `src/components/landing/LandingHeader.tsx` — cabecera fija con marca,
  enlace a login y el **ThemeToggle** (icono sol/luna).
- `src/app/page.tsx` — monta `LandingHeader` arriba de la landing.
- La preferencia **persiste** en `localStorage` y se aplica antes del primer
  pintado. La landing usa tokens (sin colores hardcodeados), así que ambos modos
  son legibles automáticamente.

---

## Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 91 unit |
| `npm run build` | ✅ |
| `npm run test:e2e` | ✅ 8/8 |

Sin dependencias ni migraciones nuevas.
