# PLAN MEJORAS PRE-PRODUCCIÓN — Documento vivo de seguimiento

> Este archivo se actualiza a medida que se completa cada ítem.
> Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecho.

## Contexto

Fase 1 funcional y en verde (38 unit, 7 E2E). Antes de producción se ejecutan
dos sprints: **Sprint V** (visual + bugs + quick wins) → checkpoint →
**Sprint G** (gestión/CRUD/bloqueos/logros/simulador) → checkpoint → Sprint 8
(producción).

Decisiones del usuario:
- Áreas: PlayerCard · Paneles · Hub del jugador · filtro por categoría (DT) ·
  + todo el bloque de gestión (Sprint G).
- Iconos: instalar **lucide-react** (reemplaza emojis).
- Tipografía: **añadir fuente display** (Archivo Black) para titulares.
- Profundidad: **pulido equilibrado** (sin flip de revelación FC26 completo).
- Landing: **fuera de alcance**.
- Avatar **propio en SVG** (sin dependencias externas).
- Bloqueo de jugadores: **Escuela + Súper Admin** (el DT solo lo ve).
- Eliminar jugador: **lógico** (estado ELIMINADO, reversible, solo Súper Admin).
- WhatsApp/email: solo **arquitectura escalable** (Fase 2 implementa).
- Ya existe (no se rehace): DT asignado a categorías específicas
  (`EntrenadorCategoria`, checkboxes en `/escuela/dts`).

Restricciones: mantener `--brand` (white-label) y `prefers-reduced-motion`;
**no romper** los selectores de la suite E2E (se conservan textos de
enlaces/botones y `name=` de inputs; si la nav cambia de estructura, se
ajustan los tests).

## Principios transversales (OBLIGATORIOS en cada ítem)

1. **Seguridad**: toda mutación nueva pasa el checklist 6.8 — `AuthContext`
   desde sesión (`requireAuthContext`), `requireRole`/`assertTenant`/scoping
   por categorías del DT, Zod en la frontera, errores genéricos, DTOs (nunca
   modelos Prisma), acción sensible → `AuditLog`, rate limit si aplica.
   `SEGURIDAD.md` se actualiza con cada endpoint nuevo.
2. **Dependencias claras**: regla de imports `app|components → actions →
   services → repositories → prisma` (prohibido saltar capas). Única
   dependencia nueva permitida: `lucide-react`; todo lo demás con lo instalado.
3. **Componetizado**: un componente = un archivo = una responsabilidad (~150
   líneas máx). Presentación pura en `components/ui/`, dominio en
   `components/<dominio>/`. Reutilizar antes de crear (Button, Card, Badge,
   Modal, PlayerCard, EmptyState…).

## Dependencias nuevas

- `lucide-react` (iconos SVG). Única dependencia nueva.
- Fuente display vía `next/font/google` (sin dependencia): **Archivo Black**,
  expuesta como `--font-display`.

---

# SPRINT V — Visual + quick wins

## V1. Tipografía display
- [ ] `src/app/layout.tsx`: cargar `Archivo_Black` (weight 400) como
      `--font-display` junto a Inter.
- [ ] `src/app/globals.css`: token `--font-display` en `@theme` + utilidad
      `.font-display`. Aplicar a titulares de paneles y al nombre de la carta.

## V2. Iconos (lucide-react)
- [ ] Instalar `lucide-react`.
- [ ] Reemplazar emojis: campana (`Bell`) en `PanelShell`; logros
      (`Medal`, `Lock`) en `LogrosVitrina`; noticias (`Megaphone`) en el hub.
- [ ] Iconos en la navegación lateral y en KPIs (V3).

## V3. Paneles: navegación lateral + pulido (DT/Escuela/Admin/Jugador)
- [ ] **Nuevo** `src/components/shell/Sidebar.tsx` (client, `usePathname`):
      recibe `items: { href, label, icon, badge? }[]`; barra lateral con
      iconos en desktop, colapsa a barra superior/inferior en móvil; ítem
      activo tintado con `--brand`.
- [ ] **Refactor** `src/components/PanelShell.tsx`: layout de dos columnas
      (sidebar + contenido) con topbar (escudo/marca, campana de
      notificaciones, "Hola, nombre", Salir). Acepta `navItems`. Mantiene el
      conteo de no leídas.
- [ ] **Layouts** `src/app/{admin,escuela,dt,jugador}/layout.tsx`: pasan sus
      `navItems` con iconos a `PanelShell` (sustituyen a `*Nav`). Se conservan
      **exactamente** los mismos `href` y `label` para no romper E2E ni rutas.
- [ ] `src/components/ui/Card.tsx`: hover sutil + acento opcional (API actual).
- [ ] **Nuevo** `src/components/ui/EmptyState.tsx`: icono + título + texto,
      donde hoy hay `<p>Sin …</p>`.
- [ ] KPIs con icono + número `.tabular`; tablas/listas con hover/zebra suaves.
- [ ] Fix copy resumen escuela: quitar "(Sprint 4)" en `src/app/escuela/page.tsx`.

## V4. Carta (PlayerCard) — bugs + materiales + foto integrada
Archivos: `src/components/cards/PlayerCard.tsx` + keyframes en `globals.css`.
- [ ] **Bug**: el sello MEN tapa REG/FIS → reservar espacio (padding en la
      columna derecha del grid de stats) y reposicionar/reducir el sello.
- [ ] **Bug**: carta alargada en perfil/hub → ancho máximo responsive
      (aspect 3:4 estable; revisar a 375px).
- [ ] **Foto integrada (no sobrepuesta)**: la foto pasa a capa de retrato con
      `mask-image` (degradado fundido al material por abajo/lados) + leve
      `mix-blend`; deja de verse como rectángulo pegado.
- [ ] **ORO**: capa de *sheen* especular animado.
- [ ] **HÉROE**: gradiente animado + partículas/sparkle sutiles.
- [ ] **Holográfico**: mejorar el overlay que sigue el cursor.
- [ ] Filo de luz en la esquina recortada; nombre con `.font-display`.
- [ ] Escudo de escuela en la carta: conectar `escudoEscuelaUrl` (ya existe en
      `PlayerCardData`) desde `src/lib/mappers/player-card.ts`.
- [ ] Todo condicionado a `interactive`/`!reduced-motion`; `sm` se mantiene
      plano. Sin flip de revelación (descartado).

## V5. Avatar SVG editable (jugador)
- [ ] **Nuevo** `src/components/avatar/PlayerAvatar.tsx`: SVG por capas estilo
      futbolista — género, tono de piel (~6), peinado (~6), color de cabello
      (~5). Determinista desde una config.
- [ ] Schema: `Jugador.avatarConfig String?` (JSON) → migración `avatar`.
- [ ] Editor en `/jugador/perfil` (client): selectores visuales + preview +
      Server Action `actualizarAvatarAction` (Zod; solo el responsable —
      reutiliza el guard de `foto.service`).
- [ ] Carta, plantilla DT y hub usan `PlayerAvatar` cuando no hay
      foto/consentimiento (sustituye al círculo de iniciales).

## V6. Escudo de la escuela (PNG, mobile-first)
- [ ] Upload en `/escuela/branding`: **solo PNG** (validación por magic
      bytes), máx 1 MB, sharp → 256×256 `fit:inside` **conservando
      transparencia** (`.png()`), nombre UUID en `storage/uploads`.
- [ ] **Nuevo** `GET /api/archivos/escudo/[escuelaId]` (requiere sesión; el
      escudo no es dato de menores). Referencia en `Escuela.logoUrl` (existe).
- [ ] Mostrar en: topbar del shell, branding y la carta (V4).

## V7. Calendario con iconos por tipo
- [ ] `src/components/calendar/tipos.ts`: icono lucide minimalista por tipo,
      del color del evento — ENTRENAMIENTO `Dumbbell` verde · PARTIDO `Trophy`
      dorado · EVALUACION `ClipboardCheck` violeta · OTRO `CalendarDays` azul.
- [ ] Aplicar en `MonthGrid` (junto al punto de color), `UpcomingList`,
      detalle de evento y leyenda.

## V8. Login + transición de entrada
- [ ] `src/components/LoginForm.tsx`: toggle mostrar/ocultar contraseña
      (`Eye`/`EyeOff`).
- [ ] Enlace "← Volver al inicio" (a `/`).
- [ ] Transición al ingresar: overlay a pantalla completa (logo/carta animada,
      ~1.2s, skip con reduced-motion) mientras se hace `router.push` al panel.

## V9. Filtros por categoría (DT)
- [ ] **Nuevo** `src/components/dt/PlantillaGrid.tsx` (client): chips de
      filtro "Todas | <categorías> | Vencidas" con `useState`; filtra
      mini-cartas en cliente. Conserva los `<Link>` a `/dt/jugadores/[id]`
      con el mismo texto.
- [ ] `src/app/dt/page.tsx`: pasar plantilla + categorías a `PlantillaGrid`.
- [ ] `src/services/jugador.service.ts`: añadir `categoriaId` a
      `PlantillaItemDTO` (mapeo mínimo; el dato ya viene en la consulta).
- [ ] Mensajes DT: chips por categoría en la lista de hilos (añadir
      `categoriaNombre` + nombre del jugador a `ConversacionResumenDTO` en
      `mensaje.service`) y `<optgroup>` por categoría en el diálogo de nueva
      conversación.

## V10. Hub del jugador — tiles estilo Modo Carrera
- [ ] `src/app/jugador/page.tsx`: tile **"Próximo partido"** destacado (rival,
      fecha, local/visita, botón confirmar) desde el primer PARTIDO de
      `hub.proximos`.
- [ ] **Agenda** (resto de próximos) y **Noticias del club** estilo bandeja de
      correo (icono, fecha, asunto); pulir `UpcomingList` y noticias.
- [ ] Marcador grande en último partido; iconos lucide en encabezados. Se
      mantienen `EvolutionChart`, `ObjetivosList`, `HubHero`.

### Checkpoint V
- [ ] `npm run lint && npm run typecheck` limpios.
- [ ] `npm test` → 38 unit en verde (no se toca lógica de negocio).
- [ ] `npm run test:e2e` → 7 E2E en verde (ajustar selectores de nav si cambia).
- [ ] Revisión visual por rol (desktop y 375px): DT con sidebar + chips de
      filtro + mini-cartas mejoradas; Jugador con tile de próximo partido,
      noticias bandeja, carta con brillo/partículas, avatar editable; 
      Admin/Escuela con sidebar, KPIs y EmptyState; escudo PNG en
      carta/topbar; transición de login.
- [ ] Reduced-motion → sin animaciones nuevas (carta plana, sin sheen).
- [ ] `--brand` sigue tiñendo acentos/sidebar (cambiar color en Branding).
- [ ] Commit + push.

---

# SPRINT G — Gestión y administración

## G1. Schema (una migración)
- [ ] `User`: `bloqueado Boolean @default(false)`, `bloqueoTipo String?`
      (PAGO | COMPORTAMIENTO | CONTACTA_DT | PERSONALIZADO),
      `bloqueoMensaje String?`, `bloqueadoEn DateTime?`.
- [ ] `Jugador.estado`: valor nuevo documentado `ELIMINADO` (string, sin
      migración extra).
- [ ] `Logro`: `posicion String?` (POR/DEF/MED/DEL, null = general),
      `activo Boolean`, `escuelaId String?` (null = catálogo global).
- [ ] **Nueva tabla** `LogroEscuela` (escuelaId, logroId, activo, desde?,
      hasta?) — disponibilidad/activación programada por escuela.

## G2. Bloqueo de acceso de jugadores
- [ ] Servicio bloquear/desbloquear el `User` del padre/cuenta: solo
      `ESCUELA_ADMIN` (su tenant) y `SUPER_ADMIN`. Motivos predeterminados +
      personalizado. **Auditado**.
- [ ] `requireAuthContext`/`requirePanelUser`: JUGADOR bloqueado →
      **`/bloqueado`** (página que muestra el mensaje según tipo: pago,
      comportamiento, "comunícate con tu DT" o personalizado).
- [ ] UI: botón "Bloquear acceso" con modal de motivo en gestión de jugadores
      (G3); el DT lo ve indicado en su plantilla.

## G3. CRUD de jugadores y DTs (Escuela + Súper Admin)
- [ ] **Escuela** `/escuela/jugadores` (+ `/escuela/dts` ampliado): listar con
      búsqueda y filtros (categoría/estado); **editar** datos (nombre,
      apellido, nacimiento, posición, dorsal, categoría);
      **inactivar/reactivar** con modal de confirmación + motivo (auditado);
      **bloquear/desbloquear** (G2); **reset de contraseña** de padres y DTs
      (temporal de un solo uso, auditado — reutiliza
      `generarPasswordTemporal`).
- [ ] **Súper Admin**: lo mismo sobre cualquier escuela + **eliminar lógico**
      (estado ELIMINADO; modal que exige escribir el nombre del jugador +
      motivo obligatorio; auditado; reversible).
- [ ] Filtrar ELIMINADO en todos los repos/listas/consultas.

## G4. Súper Admin: usuarios y escuelas (perfil profesional)
- [ ] `/admin/usuarios`: tabla con búsqueda y filtros (rol, escuela, estado);
      editar nombre/email; activar/desactivar; reset de contraseña; ver
      bloqueos. Todo auditado.
- [ ] `/admin/escuelas`: ampliar con editar (nombre, slug, color) y
      activar/desactivar escuela (auditado).
- [ ] Estilo profesional: tablas limpias con lucide, confirmaciones en
      acciones destructivas.

## G5. DT: credenciales de jugadores
- [ ] En la ficha del jugador: ver el email de la cuenta de la familia y botón
      **"Resetear contraseña"** (temporal de un solo uso, modal, auditado).
      Solo jugadores de sus categorías.

## G6. Logros por posición (catálogo grande) + gestión
- [ ] **Seed**: ampliar catálogo a ~50 logros enfocados por posición (10–12
      por POR/DEF/MED/DEL + generales/MEN/asistencia), mezcla INSIGNIA/BONUS
      con stat acorde a la posición.
- [ ] **Súper Admin** `/admin/logros`: CRUD del catálogo global con filtros
      por posición y tipo; activar/desactivar.
- [ ] **DT** `/dt/logros`: ver catálogo aplicable; activar/desactivar para su
      escuela; **programar ventanas** (desde/hasta) vía `LogroEscuela`;
      **crear logros propios** (con `escuelaId`); **otorgar manualmente** a un
      jugador de sus categorías (respeta la posición del logro).
- [ ] `evaluacion.service`: al consumir bonus, considerar solo logros activos
      y dentro de ventana para la escuela.

## G7. Simulador de carta (Súper Admin)
- [ ] `/admin/simulador`: página client con las 12 medidas (sliders/inputs),
      posición y grupo de edad → `computeStats` **en cliente** (el motor es TS
      puro) → `PlayerCard` en vivo + umbrales de nivel visibles (Bronce <65 ·
      Plata 65–74 · Oro 75–84 · Héroe ≥85). Permite saber qué evaluar para
      cada rango.

## G8. Parámetros de evaluación (Súper Admin, con explicación)
- [ ] Mover los **rangos físicos por edad** de `ranges.ts` a
      `ParametroFormula` (claves `RANGO_<PRUEBA>_<GRUPO>_MIN/MAX`; el motor ya
      acepta `opts.rangos` — `evaluacion.service` los lee de BD con fallback
      al embebido).
- [ ] `/admin/parametros` rediseñado: agrupado por grupo de edad, con textos
      en lenguaje simple ("mejor marca ↔ peor marca"), peso de MEN, y enlace
      al simulador (G7). Cambios auditados (ya existe).
- [ ] Ponderaciones por posición permanecen en código v1.1 (documentar en
      `DECISIONES.md`).

## G9. Notificaciones escalables (WhatsApp/email futuro)
- [ ] **Nuevo** `src/lib/notify/dispatcher.ts`: interfaz `CanalNotificacion`
      (`enviar(destino, plantilla, datos)`) con canal `INAPP` implementado
      (delegando en `notificacion.service`) y stubs documentados
      `EMAIL`/`WHATSAPP` para Fase 2. `notificar()` pasa por el dispatcher.
- [ ] Anotar la decisión en `DECISIONES.md`.

## G10. Mejoras adicionales (propuestas del asistente, aceptadas)
- [ ] **"Mi cuenta"**: cambio de contraseña propio para todos los roles.
- [ ] Favicon + manifest básico (PWA-lite; los niños lo usan en cel/tablet).
- [ ] Búsqueda por nombre en plantilla DT y listas largas.

### Checkpoint G
- [ ] `npm run lint && npm run typecheck` limpios.
- [ ] Unit existentes + nuevos (bloqueo, eliminación lógica, ventana de
      logros) en verde.
- [ ] 7 E2E + 1 spec nuevo (jugador bloqueado ve su mensaje) en verde.
- [ ] `SEGURIDAD.md` actualizado con todos los endpoints nuevos.
- [ ] Revisión manual: CRUDs con confirmaciones y auditoría; reset de
      contraseñas; el simulador reproduce exactamente el OVR del motor;
      cambiar un rango por edad afecta la siguiente evaluación; un logro
      programado solo aplica dentro de su ventana.
- [ ] Commit + push. → Sprint 8 (producción).

---

## Archivos críticos

- **Crear**: `src/components/shell/Sidebar.tsx`,
  `src/components/ui/EmptyState.tsx`, `src/components/dt/PlantillaGrid.tsx`,
  `src/components/avatar/PlayerAvatar.tsx` (+ editor),
  `src/app/api/archivos/escudo/[escuelaId]/route.ts`,
  `src/app/bloqueado/page.tsx`, `src/app/admin/{usuarios,logros,simulador}/`,
  `src/app/escuela/jugadores/`, `src/app/dt/logros/`,
  `src/lib/notify/dispatcher.ts`.
- **Modificar**: `src/app/layout.tsx`, `src/app/globals.css`,
  `src/components/PanelShell.tsx`, `src/components/cards/PlayerCard.tsx`,
  `src/app/{admin,escuela,dt,jugador}/layout.tsx`, `src/app/jugador/page.tsx`,
  `src/app/dt/page.tsx`, `src/components/jugador/LogrosVitrina.tsx`,
  `src/components/calendar/{tipos,MonthGrid,UpcomingList}.tsx`,
  `src/components/LoginForm.tsx`, `src/lib/mappers/player-card.ts`,
  `src/services/{jugador,mensaje,evaluacion}.service.ts`,
  `src/lib/auth/session.ts` (bloqueado), `prisma/schema.prisma` + `seed.ts`
  (logros ~50, rangos a BD, avatar).
- **Retiro/reducción**: `src/components/{admin,escuela,dt,jugador}/*Nav.tsx`
  (se sustituyen por items para el `Sidebar`).

## Registro de avance

| Fecha | Bloque | Estado |
|---|---|---|
| 2026-06-12 | **Sprint V completo** (V1–V10): fuente display, lucide, sidebar+shell, EmptyState, PlayerCard (bugs MEN/proporción, foto fundida, materiales, escudo, font), avatar SVG editable (migración `avatarConfig`), escudo de escuela PNG, iconos de calendario, login (ver/ocultar + volver + transición), filtros por categoría (plantilla y mensajes DT), hub estilo Modo Carrera | ✅ lint/typecheck/38 unit/7 E2E en verde |
| — | Sprint G (gestión/CRUD/bloqueos/logros/simulador) | pendiente |
