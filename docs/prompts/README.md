# Biblioteca de prompts

> **Qué es esto.** El lugar único donde viven los prompts para pedirle trabajo a un
> agente (Gemini, Claude u otro) sobre este proyecto. Cada uno es un archivo
> autocontenido; este índice dice **cuál usar y cómo lanzarlo**.
>
> **Regla:** un prompt vive en un solo lugar. Si cambia una política, se cambia la
> política y el prompt solo apunta a ella.

---

## Cómo se usa

1. Abre el agente con la raíz del repositorio como carpeta de trabajo.
2. Si el prompt lo pide, levanta la app **en local contra la base de pruebas**
   (`npm run dev`) **después de comprobar que `.env` apunta a una base exclusiva de pruebas** (`POLITICA-QA.md` §2, "Antes de resetear o sembrar"). **No** corras `db:reset` ni `db:seed` sin esa comprobación: borran toda la base. Nunca producción.
3. Copia el **lanzador** de la tabla, completa lo que está entre `<…>` y pégalo.
4. Cuando el agente termine, lee el resultado **antes** de aceptarlo: pásalo por
   **P06** si trae hallazgos.

Los prompts a ciegas (P01 y P07) piden al agente **no leer** código ni documentos. El
agente sí abre su propio archivo de prompt y la política que cita; nada más.

---

## Índice

| ID | Prompt | Úsalo cuando… | Salida |
|---|---|---|---|
| **P01** | [QA a ciegas](P01-qa-a-ciegas.md) | Antes de una salida o tras una funcionalidad grande: probar la app como un usuario nuevo | `docs/auditoria/REPORTE-QA-CIEGO-<fecha>.md` |
| **P02** | [Triage del QA a ciegas](P02-triage-qa-a-ciegas.md) | P01 terminó y su informe está guardado | `…-TRIAGE.md` (aparte) |
| **P03** | [QA por lectura de código](P03-qa-por-lectura-de-codigo.md) | Auditoría técnica: capas, tenant, fechas, rendimiento | `REPORTE-QA-<fecha>.md` |
| **P04** | [Manual de un módulo](P04-manual-por-modulo.md) | Escribir o reverificar la ficha de UN módulo suelto (p. ej. tras un cambio de pantalla) | `docs/manuales/fuentes/…` |
| **P05** | [Documentación técnica](P05-documentacion-tecnica.md) | Documentar arquitectura/datos/endpoints y detectar docs desactualizados | `docs/auditoria/documentacion-<fecha>/` |
| **P06** | [Verificar un reporte](P06-verificar-hallazgos.md) | Otro agente entregó hallazgos y hay que separar lo real de lo inflado | `VERIFICACION-<fecha>.md` |
| **P07** | [Seguridad a ciegas](P07-seguridad-multitenant-caja-negra.md) | Antes de sumar una escuela real o tras tocar auth, roles o archivos | `REPORTE-SEGURIDAD-<fecha>.md` |
| **P08** | [Cerrar un pendiente](P08-cerrar-un-pendiente.md) | Ejecutar un paquete de `PENDIENTES.md` de punta a punta | código + tests + docs |
| **P09** | [Preparar una salida](P09-preparar-release.md) | Antes de desplegar: veredicto LISTO / NO LISTO | `RELEASE-<fecha>.md` |
| **P10** | [Manual completo de un rol](P10-manual-completo-de-un-rol.md) | Producir el manual de usuario COMPLETO de un rol (todas sus pantallas) en Word y PDF | fichas + `docs/manuales/salida/<rol>/` |
| **P11** | [Construir y revisar manuales](P11-construir-y-revisar-manuales.md) | Regenerar los Word/PDF y dar veredicto ENTREGABLE / NO ENTREGABLE por rol | `salida/` + veredicto |

---

## Lanzadores (copiar y pegar)

**P01 — QA a ciegas**
```
Ejecuta el prompt docs/prompts/P01-qa-a-ciegas.md.
URL: http://localhost:<PUERTO>. Alcance: <todos los roles | solo <rol>>.
Credenciales — Súper Admin: <correo>/<clave> · Escuela: <correo>/<clave> · Entrenador: <correo>/<clave> · Familia: <correo>/<clave>.
```

**P02 — Triage**
```
Ejecuta el prompt docs/prompts/P02-triage-qa-a-ciegas.md sobre el informe docs/auditoria/REPORTE-QA-CIEGO-<fecha>.md.
```

**P03 — QA por código**
```
Ejecuta el prompt docs/prompts/P03-qa-por-lectura-de-codigo.md. Fecha para los archivos de salida: <AAAA-MM-DD>.
```

**P04 — Manual de un módulo**
```
Ejecuta el prompt docs/prompts/P04-manual-por-modulo.md.
Rol: <rol>. Módulo: <módulo>. URL: http://localhost:<PUERTO>.
Credenciales — <rol>: <correo>/<clave> · otros roles que necesites: <correo>/<clave>.
```

**P10 — Manual completo de un rol (Word y PDF)**
```
Ejecuta el prompt docs/prompts/P10-manual-completo-de-un-rol.md.
Rol: <super-admin | escuela | entrenador | jugador>. URL: http://localhost:<PUERTO>.
Credenciales — <rol>: <correo>/<clave> · otros roles que necesites: <correo>/<clave>.
```

**P11 — Construir y revisar los manuales**
```
Ejecuta el prompt docs/prompts/P11-construir-y-revisar-manuales.md.
```

**P05 — Documentación técnica**
```
Ejecuta el prompt docs/prompts/P05-documentacion-tecnica.md. Fecha para la carpeta de salida: <AAAA-MM-DD>.
```

**P06 — Verificar un reporte**
```
Ejecuta el prompt docs/prompts/P06-verificar-hallazgos.md sobre este reporte: <ruta o texto pegado>.
Modo: solo-verificar.
```

**P07 — Seguridad a ciegas**
```
Ejecuta el prompt docs/prompts/P07-seguridad-multitenant-caja-negra.md.
URL: http://localhost:<PUERTO>.
Escuela A — admin: <correo>/<clave>, entrenador: <correo>/<clave>, familia: <correo>/<clave>.
Escuela B — admin: <correo>/<clave>, entrenador: <correo>/<clave>, familia: <correo>/<clave>.
Súper Admin: <correo>/<clave>.
```

**P08 — Cerrar un pendiente**
```
Ejecuta el prompt docs/prompts/P08-cerrar-un-pendiente.md.
Paquete: <nombre exacto en docs/PENDIENTES.md>. COMMIT: no.
```

**P09 — Preparar una salida**
```
Ejecuta el prompt docs/prompts/P09-preparar-release.md sobre la rama/commit <referencia>.
```

---

## Flujos típicos (qué prompts encadenar)

| Objetivo | Secuencia |
|---|---|
| Auditoría completa antes de una salida | P01 → P02 → P06 (sobre el triage) → P08 por cada pendiente → P09 |
| Revisar un reporte externo | P06 → decidir → P08 |
| Manual completo de un rol | **P10** (un rol por corrida) → P11 → prueba de lectura con una persona nueva → P01 sobre ese rol para contrastar |
| Un módulo cambió de pantalla | P04 sobre ese módulo → P11 |
| Entregar manuales a una escuela o capacitación | P11 (veredicto) → enviar los .docx/.pdf de `docs/manuales/salida/` |
| Sumar una escuela real | P07 → P09 |
| Entender qué hace la app y qué docs mienten | P05 → P06 |

---

## Cómo agregar un prompt nuevo

1. Copia la plantilla de abajo en `docs/prompts/P<NN>-<nombre-en-kebab-case>.md`
   (siguiente número libre; los IDs no se reutilizan).
2. Debe ser **autocontenido** para el agente: rol, reglas, entradas, procedimiento y
   formato de entrega. Si hay una política, cítala en vez de copiarla.
3. Agrégalo al **Índice**, a **Lanzadores** y, si encadena con otros, a **Flujos**.
4. Si el prompt cambia una regla del proyecto, la regla va a `AGENTS.md` o a una
   política (`docs/politicas/`), nunca solo al prompt.

```markdown
# P<NN> — <Nombre>

> **Cuándo usarlo:** …
> **Entrada:** …
> **Salida:** …
> **Después:** …   (qué prompt sigue, si aplica)
> **Política:** …   (si aplica)

---

## Prompt

<Rol. Qué leer y qué NO leer. Datos de la prueba. Procedimiento numerado.
Reglas (solo local, datos ficticios, sin commits salvo que se pida).
Formato de entrega y qué responder al terminar.>
```

## Reglas comunes (están repetidas dentro de cada prompt a propósito)

- **Solo entorno local y datos ficticios.** Nunca producción ni datos reales de menores.
- **Sin commits ni push** salvo que el prompt lo pida de forma explícita (P08 con
  `COMMIT: sí`), y entonces **sin atribución de IA**.
- **Evidencia o no existe:** todo hallazgo lleva `archivo:línea` o pasos
  reproducibles; lo no verificado se marca como tal.
- **Orden en el repositorio:** lo descartable (scripts de uso único, volcados, borradores)
  va a `scratch/`, que está ignorada por git; `scripts/` guarda solo herramientas que
  se mantienen. Nunca claves ni correos reales dentro de un script.
- **Next.js 16:** antes de dar por error una convención, `node_modules/next/dist/docs/`.
