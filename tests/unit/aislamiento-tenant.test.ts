import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Test guardián de aislamiento multi-tenant (estructural, permanente).
 *
 * Lee el código fuente de `src/repositories/*.repository.ts` y
 * `src/services/*.service.ts`, y falla si alguna consulta Prisma sobre un
 * modelo con columna `escuelaId` no está acotada por tenant. Es la red que
 * evita que una query nueva olvide el filtro de escuela y filtre datos de
 * otra escuela. Cubre tanto `db.modelo.metodo()` como `tx.modelo.metodo()`
 * dentro de `db.$transaction(async (tx) => ...)` — en cualquiera de los dos
 * directorios: algunos services (`entrenador.service.ts`, `arancel.service.ts`)
 * abren su propia transacción sin pasar por un repositorio.
 *
 * Una consulta de LECTURA/ACTUALIZACIÓN (`find*`, `update*`, `delete*`, `count`,
 * `aggregate`, `groupBy`, `upsert`) sobre un modelo-tenant se considera SEGURA
 * si:
 *   1. su bloque `where` contiene `escuelaId` (filtro inline), o
 *   2. su bloque `where` contiene `...scope` (patrón scope del repo:
 *      `const scope = escuelaId === null ? {} : { escuelaId }`), o
 *   3. tiene encima una anotación `// tenant-global: <razón>` que justifica una
 *      consulta legítimamente cross-tenant (crons, lookups por clave única,
 *      acceso por propiedad ya verificado aguas arriba).
 *
 * Un `create`/`createMany` (sin `where`) se considera SEGURO si su bloque
 * `data` contiene `escuelaId` o `...scope` — no importa si es un objeto
 * literal, un array o el resultado de un `.map()`. Si `data` es una variable
 * opaca (`{ data }`, `data: input`) sin el literal `escuelaId` visible en la
 * llamada, rompe el test: la solución es desestructurar `escuelaId` en la
 * firma de la función repo (patrón ya usado en la mayoría de los `create`),
 * no silenciarlo con una anotación — la escritura SÍ es tenant-scoped, solo
 * hay que hacerlo visible para este chequeo estático.
 *
 * Cualquier otra consulta sobre un modelo-tenant rompe este test.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");

// 1. Modelos con `escuelaId` -> su accesor Prisma (primera letra en minúscula).
const modelosTenant = new Set<string>();
for (const m of SCHEMA.matchAll(/model\s+(\w+)\s*\{([^}]*)\}/g)) {
  const [, nombre, cuerpo] = m;
  if (/\bescuelaId\b/.test(cuerpo)) {
    modelosTenant.add(nombre[0].toLowerCase() + nombre.slice(1));
  }
}

// Modelos con rutas globales legítimas por identidad/catálogo (no son fugas):
//   user          -> se busca por su propio id desde la sesión
//   auditLog      -> append-only, global para SUPER_ADMIN
//   logro         -> catálogo global (escuelaId nullable)
//   lead          -> existe antes de que haya escuela
//   soporteSesion -> sesión del SUPER_ADMIN; se consulta por superAdminId/id, no por tenant
const EXCLUDE = new Set(["user", "auditLog", "logro", "lead", "soporteSesion"]);

const METODOS =
  "findUnique|findFirst|findMany|update|updateMany|delete|deleteMany|count|aggregate|groupBy|upsert|create|createMany";

/** Métodos de escritura sin `where` (Prisma no lo acepta): se verifican por `data`, no por `where`. */
const METODOS_DATA = new Set(["create", "createMany"]);

// Excepciones explícitas adicionales (formato `archivo: accesor`). Las anotaciones
// `// tenant-global:` son el mecanismo preferido; este allowlist queda para casos
// que no admitan anotación inline. Vacío por ahora.
const ALLOWLIST = new Set<string>([]);

// Repositorios: todas las queries Prisma viven ahí. Services: la mayoría no
// toca Prisma directo, pero algunos (`entrenador.service.ts`, `arancel.service.ts`)
// abren `db.$transaction(async (tx) => ...)` directo desde el service — un
// patrón ya existente en el código, no cubierto hasta ahora porque el barrido
// original solo miraba `src/repositories/`.
const DIRS = [
  { dir: path.join(ROOT, "src", "repositories"), suffix: ".repository.ts" },
  { dir: path.join(ROOT, "src", "services"), suffix: ".service.ts" },
];

/** Devuelve el bloque `{ ... }` balanceado que empieza en el índice `from`. */
function balancedBraces(src: string, from: number): string {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return src.slice(from);
}

/** ¿El `where` de esta llamada filtra por tenant (`escuelaId` o `...scope`)? */
function tenantFiltrado(args: string): boolean {
  const w = args.search(/\bwhere\s*:\s*\{/);
  if (w === -1) return false;
  const whereBlock = balancedBraces(args, args.indexOf("{", w));
  return /\bescuelaId\b/.test(whereBlock) || /\.\.\.scope\b/.test(whereBlock);
}

/**
 * ¿El `data` de un `create`/`createMany` incluye `escuelaId` (inline o vía
 * `...scope`)? A diferencia de `tenantFiltrado`, no balancea el bloque: basta
 * con que el token aparezca desde `data:` en adelante, sea un objeto literal
 * (`{ escuelaId, ... }`), un array (`filas.map(f => ({ escuelaId, ...f }))`) o
 * cualquier expresión que lo mencione. Si `data` es una variable opaca sin el
 * literal `escuelaId` en ningún lado (`{ data }`, `data: input`), no matchea a
 * propósito — esa opacidad es justo el caso que este chequeo tiene que atrapar.
 */
function tenantEnData(args: string): boolean {
  const d = args.search(/\bdata\s*:/);
  if (d === -1) return false;
  const resto = args.slice(d);
  return /\bescuelaId\b/.test(resto) || /\.\.\.scope\b/.test(resto);
}

describe("aislamiento multi-tenant", () => {
  it("toda query sobre un modelo con escuelaId filtra por escuelaId o está justificada", () => {
    const fallos: string[] = [];

    for (const { dir, suffix } of DIRS) {
      for (const file of readdirSync(dir).filter((f) => f.endsWith(suffix))) {
        const src = readFileSync(path.join(dir, file), "utf8");
        // `(?:db|tx)`: dentro de `db.$transaction(async (tx) => ...)` las llamadas
        // van por `tx.modelo.metodo()`, no por `db.`, y quedaban invisibles.
        const re = new RegExp(`(?:db|tx)\\.(\\w+)\\.(${METODOS})\\s*\\(`, "g");
        let match: RegExpExecArray | null;

        while ((match = re.exec(src))) {
          const accesor = match[1];
          const metodo = match[2];
          if (!modelosTenant.has(accesor) || EXCLUDE.has(accesor)) continue;
          if (ALLOWLIST.has(`${file}: ${accesor}`)) continue;

          // Extrae el bloque de argumentos balanceando paréntesis desde "(".
          const open = re.lastIndex - 1;
          let depth = 0;
          let i = open;
          for (; i < src.length; i++) {
            if (src[i] === "(") depth++;
            else if (src[i] === ")") {
              depth--;
              if (depth === 0) break;
            }
          }
          const args = src.slice(open, i + 1);
          const seguro = METODOS_DATA.has(metodo)
            ? tenantEnData(args)
            : tenantFiltrado(args);
          if (seguro) continue;

          // ¿Anotación `// tenant-global:` en las líneas inmediatamente previas?
          const before = src.slice(0, match.index);
          const prevLines = before.split("\n").slice(-3).join("\n");
          if (/\/\/\s*tenant-global:/.test(prevLines)) continue;

          const line = before.split("\n").length;
          fallos.push(`${file}:${line} db.${accesor}.${metodo}() sin escuelaId`);
        }
      }
    }

    expect(fallos, `\n${fallos.join("\n")}\n`).toEqual([]);
  });
});
