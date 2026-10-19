// Uso: node scripts/manuales/cobertura.mjs [--estricto]
// Cruza las pantallas existentes con las rutas que declaran las fichas.
// Con --estricto termina con código 1 si queda algo sin documentar, una ruta
// declarada que no existe, una exclusión sin razón o una ficha mal formada.

import { cargarFichas, esPrincipal, leerRoles, obtenerCobertura } from "./lib/comun.mjs";
import { hayProblemasDeCobertura } from "./lib/cobertura.mjs";

export function imprimirCobertura({ estricto = false } = {}) {
  const roles = leerRoles();
  const fichas = cargarFichas(roles);
  const { cobertura } = obtenerCobertura(roles, fichas);

  console.log("Cobertura de pantallas por manual\n");
  for (const c of cobertura) {
    const rol = roles.find((r) => r.id === c.rol);
    console.log(`${rol?.titulo ?? c.rol}: ${c.cubiertas.length}/${c.total} cubiertas (${c.porcentaje} %)`);
    if (c.sinDocumentar.length) {
      console.log("  SIN DOCUMENTAR:");
      for (const ruta of c.sinDocumentar) console.log(`    - ${ruta}`);
    }
    if (c.inexistentes.length) {
      console.log("  DECLARADAS QUE NO EXISTEN:");
      for (const x of c.inexistentes) console.log(`    - ${x.ruta}  (ficha: ${x.modulo})`);
    }
    if (c.exclusionesSinRazon.length) {
      console.log("  EXCLUSIONES SIN RAZÓN (no se aceptan):");
      for (const ruta of c.exclusionesSinRazon) console.log(`    - ${ruta}`);
    }
    if (c.excluidas.length) {
      console.log("  Excluidas (justificadas):");
      for (const x of c.excluidas) console.log(`    - ${x.ruta}: ${x.razon}`);
    }
    console.log("");
  }

  const fichasConErrores = fichas.filter((f) => f.errores.length > 0);
  if (fichasConErrores.length) {
    console.log("FICHAS MAL FORMADAS:");
    for (const f of fichasConErrores) console.log(`  - ${f.archivoRelativo}: ${f.errores.join("; ")}`);
    console.log("");
  }

  const hayProblemas = hayProblemasDeCobertura(cobertura) || fichasConErrores.length > 0;
  if (estricto && hayProblemas) {
    console.error("Cobertura incompleta (modo estricto): hay pantallas sin documentar o fichas con problemas.");
    process.exitCode = 1;
  }
  return { cobertura, hayProblemas };
}

if (esPrincipal(import.meta.url)) {
  imprimirCobertura({ estricto: process.argv.includes("--estricto") });
}
