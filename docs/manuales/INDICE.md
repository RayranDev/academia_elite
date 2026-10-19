# Índice y tabla de frescura de manuales de usuario

> **Archivo generado** con `npm run manuales:indice`. No se edita a mano: cambia las fichas (`fuentes/<rol>/<modulo>.md`) y vuelve a generarlo.
> Un módulo solo es **vigente** si fue probado control por control en una instancia real (ver la [Política de manuales de usuario](../politicas/POLITICA-MANUALES.md)).

---

## Cobertura de pantallas por rol

| Rol | Pantallas | Documentadas | Sin documentar | Cobertura |
|---|---:|---:|---:|---:|
| Súper Admin | 12 | 2 | 10 | 16.7 % |
| Administrador de escuela | 19 | 0 | 19 | 0 % |
| Entrenador | 16 | 2 | 14 | 12.5 % |
| Familia / jugador | 12 | 1 | 11 | 8.3 % |
| **Total** | **59** | **5** | **54** | **8.5 %** |

---

## Tabla de frescura de módulos

| Rol | Orden | Módulo | Ficha | Versión verificada | Fecha | Pantallas | Estado |
|---|---:|---|---|---|---|---|:---:|
| Súper Admin | 4 | **Fondos** | [fuentes/super-admin/fondos.md](fuentes/super-admin/fondos.md) | `0.1.0` (`6f9ea7e`) | 2026-10-19 | `/admin/fondos` | `vigente` |
| Súper Admin | 5 | **Logros** | [fuentes/super-admin/logros.md](fuentes/super-admin/logros.md) | `0.1.0` (`6882787`) | 2026-10-19 | `/admin/logros` | `vigente` |
| Administrador de escuela | — | _(sin fichas todavía)_ | — | — | — | — | `sin hacer` |
| Entrenador | 4 | **Mediciones y evaluación** | [fuentes/entrenador/mediciones-y-evaluacion.md](fuentes/entrenador/mediciones-y-evaluacion.md) | `0.1.0` (`6f9ea7e`) | 2026-10-19 | `/dt/jugadores/[id]/evaluar` | `vigente` |
| Entrenador | 8 | **Logros** | [fuentes/entrenador/logros.md](fuentes/entrenador/logros.md) | `0.1.0` (`6882787`) | 2026-10-19 | `/dt/logros` | `vigente` |
| Familia / jugador | 6 | **Logros** | [fuentes/jugador/logros.md](fuentes/jugador/logros.md) | `0.1.0` (`6882787`) | 2026-10-19 | `/jugador/logros` | `vigente` |

---

## Pantallas sin documentar (`sin hacer`)

Lista calculada cruzando `src/app/<rol>/**/page.tsx` con el campo `rutas` de cada ficha. Cuando una pantalla se documenta, se agrega su ruta al front-matter de la ficha y esta lista se acorta.

### Súper Admin (2/12, 16.7 %)

- `/admin`
- `/admin/auditoria`
- `/admin/cuenta`
- `/admin/escuelas`
- `/admin/escuelas/[id]`
- `/admin/leads`
- `/admin/leads/[id]`
- `/admin/parametros`
- `/admin/simulador`
- `/admin/usuarios`

### Administrador de escuela (0/19, 0 %)

- `/escuela`
- `/escuela/anuncios`
- `/escuela/aranceles`
- `/escuela/asistencia`
- `/escuela/branding`
- `/escuela/categorias`
- `/escuela/codigos`
- `/escuela/conceptos`
- `/escuela/cuenta`
- `/escuela/descuentos`
- `/escuela/dts`
- `/escuela/egresos`
- `/escuela/jugadores`
- `/escuela/membresias`
- `/escuela/morosos`
- `/escuela/pagos`
- `/escuela/ranking`
- `/escuela/sedes`
- `/escuela/staff`

### Entrenador (2/16, 12.5 %)

- `/dt`
- `/dt/anuncios`
- `/dt/calendario`
- `/dt/cuenta`
- `/dt/eventos`
- `/dt/eventos/[id]`
- `/dt/eventos/[id]/sesion`
- `/dt/jugadores/[id]`
- `/dt/mensajes`
- `/dt/mensajes/[id]`
- `/dt/perfil`
- `/dt/plantilla`
- `/dt/progreso`
- `/dt/solicitudes`

### Familia / jugador (1/12, 8.3 %)

- `/jugador`
- `/jugador/calendario`
- `/jugador/cuenta`
- `/jugador/eventos`
- `/jugador/eventos/[id]`
- `/jugador/fondos`
- `/jugador/mensajes`
- `/jugador/mensajes/[id]`
- `/jugador/pagos`
- `/jugador/perfil`
- `/jugador/progreso`

---

## Convenciones de estado

- `vigente`: probado en ejecución real, con todos sus controles inventariados, errores copiados literalmente, impacto comprobado en otros roles y capturas reales sin datos de menores ni credenciales.
- `por reverificar`: el módulo tenía manual, pero su interfaz cambió. Se declara en el front-matter de la ficha (`estado: por reverificar`) y **no se publica** en el manual hasta volver a verificarlo.
- `sin hacer`: pantalla o módulo pendiente de documentar bajo el estándar de la política.
