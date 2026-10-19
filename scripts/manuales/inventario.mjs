// Uso: node scripts/manuales/inventario.mjs
// Lista las pantallas (page.tsx) de cada rol, convertidas a patrón de URL.

import { DIR_APP, esPrincipal, leerRoles } from "./lib/comun.mjs";
import { inventariarPantallas } from "./lib/rutas.mjs";

export function imprimirInventario() {
  const roles = leerRoles();
  const inventario = inventariarPantallas(DIR_APP, roles);
  let total = 0;
  for (const rol of roles) {
    const rutas = inventario[rol.id];
    total += rutas.length;
    console.log(`\n${rol.titulo} (${rol.id}, ${rol.prefijoRuta}): ${rutas.length} pantallas`);
    for (const ruta of rutas) console.log(`  ${ruta}`);
  }
  console.log(`\nTotal: ${total} pantallas en ${roles.length} roles.`);
}

if (esPrincipal(import.meta.url)) imprimirInventario();
