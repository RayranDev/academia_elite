# Endurecimiento de aislamiento multi-tenant (`escuelaId`)

> **Para la IA que ejecuta este plan:** este documento es una orden de trabajo
> precisa. Sigue las tareas en orden. No cambies comportamiento de negocio, solo
> blinda el aislamiento por escuela. Al terminar, ejecuta `npm run typecheck` y
> `npm test` y deja todo en verde. Si algo del repo no coincide con lo descrito
> aquí, **detente y reporta la diferencia** en vez de improvisar.

---

## 1. Objetivo

Hoy el aislamiento entre escuelas (multi-tenant de una sola base de datos,
opción "BD compartida + columna `escuelaId`") se garantiza **solo** en la capa
de servicios, llamando a `assertTenant(ctx, recursoEscuelaId)` después de leer el
recurso por `id`. Varias funciones de repositorio leen/escriben **por `id` sin
`escuelaId`**, confiando en que el servicio que las llama no se olvide de
verificar el tenant.

Queremos **defensa en profundidad**: que el propio repositorio quede imposible
de usar sin pasar el tenant. Así, si una ruta futura olvida `assertTenant`, la
consulta igual no devuelve ni modifica datos de otra escuela.

**Importante:** NO eliminamos los `assertTenant` actuales. Los mantenemos. Esto
es un cinturón **además** del existente, no en su lugar.

---

## 2. Estado verificado del código (no asumir, ya fue revisado)

- Cliente Prisma: singleton en `src/lib/db.ts`, exportado como `db`.
- Arquitectura por capas: `actions → services → repositories → prisma`.
- `AuthContext` (`src/lib/auth/context.ts`) tiene `escuelaId: string | null`
  (es `null` **solo** para `SUPER_ADMIN`).
- `assertTenant` (`src/lib/auth/guards.ts`) hace `return` temprano si el rol es
  `SUPER_ADMIN` (cruza tenants). Eso se gobierna en otro documento
  (`ROL-SUPER-ADMIN.md`); **aquí no lo tocamos**.
- Errores disponibles en `src/lib/errors.ts`: `NotFoundError`, `ForbiddenError`,
  `UnauthorizedError`, `ValidationError`, `TenantMismatchError`.
- Convención de tests: Vitest, archivos en `tests/unit/**/*.test.ts`, alias `@`
  apunta a `src/`. Los tests actuales son de lógica pura (no tocan la BD).

### Funciones a corregir (leen/escriben por `id` sin `escuelaId`)

En `src/repositories/jugador.repository.ts`:

| Función | Tipo | Riesgo |
|---|---|---|
| `obtenerJugadorGestion(id)` | lectura | devuelve datos de cualquier escuela |
| `obtenerJugadorHub(id)` | lectura | idem |
| `obtenerJugadorParaFoto(id)` | lectura | idem |
| `actualizarJugadorDatos(id, data)` | escritura | escribe en cualquier escuela |
| `actualizarFotoJugador(id, fotoUrl)` | escritura | idem |
| `actualizarAvatarJugador(id, avatarConfig)` | escritura | idem |
| `actualizarConsentimientoJugador(id, consiente)` | escritura | idem |

En `src/repositories/fondo.repository.ts`:

| Función | Tipo | Riesgo |
|---|---|---|
| `equiparFondoJugador(jugadorId, fondoEquipadoId)` | escritura sobre `Jugador` | escribe en cualquier escuela |

> `fondosDesbloqueadosDe(jugadorId)` y `registrarDesbloqueos(jugadorId, ...)`
> operan sobre `FondoDesbloqueado` (que NO tiene `escuelaId`). Quedan protegidas
> por la verificación de propiedad del jugador en `fondo.service.ts`. **No las
> cambies en esta tarea**, solo déjalas documentadas como excepción (ver Tarea D).

---

## 3. Patrón a aplicar (regla general)

Toda función de repositorio que lea o escriba un modelo con columna `escuelaId`
debe recibir `escuelaId: string | null` como **primer parámetro** y construir el
`where` así:

```ts
// scope = { escuelaId } si hay tenant; {} si es SUPER_ADMIN (escuelaId === null)
const scope = escuelaId === null ? {} : { escuelaId };
```

- **Lecturas por id:** usar `findFirst({ where: { id, ...scope } })`
  (NO `findUnique`, que solo admite campos únicos en el `where`).
- **Escrituras por id:** usar `updateMany({ where: { id, ...scope }, data })` y
  devolver `{ count }`. El servicio que llama debe tratar `count === 0` como
  `NotFoundError` (ver Tarea C). Esto evita escribir en otra escuela aunque el
  `assertTenant` se olvide.

`escuelaId === null` significa "sin filtro de tenant" y **solo** lo usará el
`SUPER_ADMIN`. Cualquier otro rol siempre pasa su `ctx.escuelaId` real.

---

## 4. Tareas

### Tarea A — Refactor de `src/repositories/jugador.repository.ts`

Reemplaza cada función exactamente así (mantén los `include`/`select` actuales,
solo cambia firma y `where`):

```ts
export function obtenerJugadorGestion(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, bloqueado: true } },
    },
  });
}

export async function actualizarJugadorDatos(
  escuelaId: string | null,
  id: string,
  data: {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    posicion: string;
    dorsal: number | null;
    categoriaId: string;
  },
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data });
}

export function obtenerJugadorHub(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    include: {
      categoria: { select: { nombre: true } },
      stats: statsLatest,
      logros: { include: { logro: true }, orderBy: { otorgadoEn: "desc" } },
      objetivos: { orderBy: { fechaLimite: "asc" } },
    },
  });
}

export function obtenerJugadorParaFoto(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    select: {
      id: true,
      escuelaId: true,
      categoriaId: true,
      padreUserId: true,
      cuentaUserId: true,
      fotoUrl: true,
      consentimientoFoto: true,
    },
  });
}

export async function actualizarFotoJugador(
  escuelaId: string | null,
  id: string,
  fotoUrl: string,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data: { fotoUrl } });
}

export async function actualizarAvatarJugador(
  escuelaId: string | null,
  id: string,
  avatarConfig: string,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data: { avatarConfig } });
}

export async function actualizarConsentimientoJugador(
  escuelaId: string | null,
  id: string,
  consiente: boolean,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({
    where: { id, ...scope },
    data: {
      consentimientoFoto: consiente,
      consentimientoFotoFecha: consiente ? new Date() : null,
    },
  });
}
```

### Tarea B — Refactor de `src/repositories/fondo.repository.ts`

```ts
export async function equiparFondoJugador(
  escuelaId: string | null,
  jugadorId: string,
  fondoEquipadoId: string | null,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({
    where: { id: jugadorId, ...scope },
    data: { fondoEquipadoId },
  });
}
```

### Tarea C — Actualizar TODOS los call sites

1. Ejecuta una búsqueda para encontrar cada llamada a las funciones modificadas:

   ```bash
   grep -rn "obtenerJugadorGestion\|obtenerJugadorHub\|obtenerJugadorParaFoto\|actualizarJugadorDatos\|actualizarFotoJugador\|actualizarAvatarJugador\|actualizarConsentimientoJugador\|equiparFondoJugador" src/
   ```

2. **Regla para saber qué `escuelaId` pasar** (primer argumento nuevo):
   - Si la función de servicio recibe un `AuthContext ctx`: pasa **`ctx.escuelaId`**.
     (Es `null` solo para `SUPER_ADMIN`, lo cual mantiene su acceso cruzado
     actual; eso se gobierna en `ROL-SUPER-ADMIN.md`.)
   - Si el contexto disponible es el del propio jugador/familia (hub, foto): pasa
     el `escuelaId` que ya se resolvió para el control de acceso. Si no hay ninguno
     a mano, pasa el `ctx.escuelaId` del llamador.
   - **Nunca** inventes un `escuelaId` ni pases `undefined`. Si no hay forma de
     obtener el tenant en ese punto, **detente y reporta** ese call site.

3. **Lecturas:** solo cambia el orden de argumentos (añade el `escuelaId` delante).
   Mantén el `assertTenant` o la verificación manual que ya exista justo después.
   Ejemplo en `gestion-jugadores.service.ts` → `cargarJugador`:

   ```ts
   // Antes:
   const jugador = await obtenerJugadorGestion(jugadorId);
   // Después:
   const jugador = await obtenerJugadorGestion(ctx.escuelaId, jugadorId);
   ```

4. **Escrituras (ahora devuelven `{ count }`):** trata `count === 0` como recurso
   inexistente o de otra escuela. Ejemplo:

   ```ts
   const res = await actualizarJugadorDatos(ctx.escuelaId, jugador.id, { ... });
   if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
   ```

   Aplica el mismo patrón a `actualizarFotoJugador`, `actualizarAvatarJugador`,
   `actualizarConsentimientoJugador` y `equiparFondoJugador`.

5. Verifica con `npm run typecheck` que no quede ninguna llamada con la firma
   vieja. Los errores de TypeScript son tu checklist: corrige hasta cero errores.

### Tarea D — Test guardián de aislamiento (permanente)

Crea `tests/unit/aislamiento-tenant.test.ts`. Es un test **estructural**: lee el
código fuente de los repositorios y falla si alguna consulta Prisma sobre un
modelo con `escuelaId` no incluye `escuelaId` en su llamada. Sirve como red para
el futuro (cualquier query nueva sin tenant rompe el build).

**Algoritmo:**

1. Lee `prisma/schema.prisma`. Extrae los nombres de modelo cuyo bloque contiene
   un campo `escuelaId`. Convierte cada nombre a su accesor Prisma
   (primera letra en minúscula): `Jugador → jugador`, `StatsCalculados →
   statsCalculados`, etc. Llama a este conjunto `MODELOS_TENANT`.
2. Aplica un `EXCLUDE` de modelos que tienen rutas globales legítimas (lookups por
   identidad o catálogos), para no generar falsos positivos:
   ```
   EXCLUDE = { user, auditLog, logro, lead }
   ```
   (`User` se busca por su propio id desde la sesión; `AuditLog` es append-only y
   global para SUPER_ADMIN; `Logro` es catálogo global con `escuelaId` nullable;
   `Lead` existe antes de que haya escuela.)
3. Lee todos los `src/repositories/*.repository.ts`. Busca llamadas con forma
   `db.<accesor>.<metodo>(...)` donde `<accesor>` ∈ (`MODELOS_TENANT` − `EXCLUDE`)
   y `<metodo>` ∈ `{ findUnique, findFirst, findMany, update, updateMany, delete,
   deleteMany, count, aggregate, groupBy, upsert }`.
4. Para cada llamada, extrae el objeto de argumentos (con conteo de llaves
   balanceadas) y comprueba que el texto contiene `escuelaId`.
5. Mantén un `ALLOWLIST` explícito de excepciones justificadas. Para esta primera
   versión incluye exactamente:
   ```
   ALLOWLIST = [
     // FondoDesbloqueado no tiene escuelaId; protegido por propiedad del jugador
     "fondo.repository.ts: fondoDesbloqueado",
   ]
   ```
   (Si en el futuro algo legítimo cae aquí, agrégalo SOLO con un comentario que
   justifique por qué es seguro.)
6. Si queda alguna llamada sin `escuelaId` y fuera del `ALLOWLIST`, el test
   **falla** listando archivo + accesor + método para que sea obvio qué arreglar.

**Esqueleto sugerido** (ajústalo hasta que pase, respetando el estilo Vitest del
repo):

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA = readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");

// 1. Modelos con escuelaId -> accesor Prisma
const modelosTenant = new Set<string>();
for (const m of SCHEMA.matchAll(/model\s+(\w+)\s*\{([^}]*)\}/g)) {
  const [, nombre, cuerpo] = m;
  if (/\bescuelaId\b/.test(cuerpo)) {
    modelosTenant.add(nombre[0].toLowerCase() + nombre.slice(1));
  }
}

const EXCLUDE = new Set(["user", "auditLog", "logro", "lead"]);
const METODOS =
  "findUnique|findFirst|findMany|update|updateMany|delete|deleteMany|count|aggregate|groupBy|upsert";
const ALLOWLIST = new Set<string>([
  // archivo: accesor  (excepciones justificadas)
]);

const REPO_DIR = path.join(ROOT, "src", "repositories");

describe("aislamiento multi-tenant", () => {
  it("toda query sobre un modelo con escuelaId filtra por escuelaId", () => {
    const fallos: string[] = [];
    for (const file of readdirSync(REPO_DIR).filter((f) => f.endsWith(".repository.ts"))) {
      const src = readFileSync(path.join(REPO_DIR, file), "utf8");
      const re = new RegExp(`db\\.(\\w+)\\.(${METODOS})\\s*\\(`, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(src))) {
        const accesor = match[1];
        if (!modelosTenant.has(accesor) || EXCLUDE.has(accesor)) continue;
        if (ALLOWLIST.has(`${file}: ${accesor}`)) continue;
        // Extraer el bloque de argumentos balanceando llaves desde "("
        const start = re.lastIndex - 1;
        let depth = 0;
        let i = start;
        for (; i < src.length; i++) {
          if (src[i] === "(") depth++;
          else if (src[i] === ")") { depth--; if (depth === 0) break; }
        }
        const args = src.slice(start, i + 1);
        if (!/\bescuelaId\b/.test(args)) {
          fallos.push(`${file}: db.${accesor}.${match[2]}() sin escuelaId`);
        }
      }
    }
    expect(fallos, fallos.join("\n")).toEqual([]);
  });
});
```

---

## 5. Reglas que NO debes romper (guardrails)

- No cambies la lógica de negocio ni los `select`/`include` existentes.
- No elimines ningún `assertTenant` ni verificación manual de tenant existente.
- No cambies `assertTenant` en `guards.ts` (se gobierna en `ROL-SUPER-ADMIN.md`).
- No conviertas `findUnique` por campos únicos legítimos (p. ej. `where: { email }`,
  `where: { codigo }`, `where: { slug }`) en `findFirst`: esos están bien.
- `escuelaId === null` solo lo produce `SUPER_ADMIN`. No lo uses como "default".

---

## 6. Criterios de aceptación

- [ ] Las 8 funciones de las Tareas A y B reciben `escuelaId` y filtran por él.
- [ ] Todas las escrituras afectadas devuelven `{ count }` y sus llamadores
      tratan `count === 0` como `NotFoundError`.
- [ ] `grep` ya no encuentra ninguna llamada con la firma vieja.
- [ ] `npm run typecheck` → 0 errores.
- [ ] Existe `tests/unit/aislamiento-tenant.test.ts` y pasa.
- [ ] `npm test` → todo verde.
- [ ] `npm run test:e2e` sigue verde (no se rompió ningún flujo).
