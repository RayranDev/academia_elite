// Uso: node scripts/manuales/indice.mjs
// Regenera docs/manuales/INDICE.md a partir de las fichas y de la cobertura de rutas.
// INDICE.md es un archivo GENERADO: no se edita a mano.

import fs from "node:fs";
import path from "node:path";
import { DIR_MANUALES, cargarFichas, esPrincipal, leerRoles, obtenerCobertura } from "./lib/comun.mjs";

/**
 * @param {import("./lib/comun.mjs").Rol[]} roles
 * @param {import("./lib/comun.mjs").Ficha[]} fichas
 * @param {import("./lib/cobertura.mjs").CoberturaRol[]} cobertura
 * @returns {string}
 */
export function generarIndice(roles, fichas, cobertura) {
  const lineas = [];
  lineas.push("# Índice y tabla de frescura de manuales de usuario");
  lineas.push("");
  lineas.push(
    "> **Archivo generado** con `npm run manuales:indice`. No se edita a mano: cambia las fichas (`fuentes/<rol>/<modulo>.md`) y vuelve a generarlo.",
  );
  lineas.push(
    "> Un módulo solo es **vigente** si fue probado control por control en una instancia real (ver la [Política de manuales de usuario](../politicas/POLITICA-MANUALES.md)).",
  );
  lineas.push("");
  lineas.push("---");
  lineas.push("");
  lineas.push("## Cobertura de pantallas por rol");
  lineas.push("");
  lineas.push("| Rol | Pantallas | Documentadas | Sin documentar | Cobertura |");
  lineas.push("|---|---:|---:|---:|---:|");
  for (const c of cobertura) {
    const rol = roles.find((r) => r.id === c.rol);
    lineas.push(
      `| ${rol?.etiqueta ?? c.rol} | ${c.total} | ${c.cubiertas.length} | ${c.sinDocumentar.length} | ${c.porcentaje} % |`,
    );
  }
  const totalPantallas = cobertura.reduce((a, c) => a + c.total, 0);
  const totalCubiertas = cobertura.reduce((a, c) => a + c.cubiertas.length, 0);
  const porcentajeGlobal = totalPantallas === 0 ? 100 : Math.round((totalCubiertas / totalPantallas) * 1000) / 10;
  lineas.push(
    `| **Total** | **${totalPantallas}** | **${totalCubiertas}** | **${totalPantallas - totalCubiertas}** | **${porcentajeGlobal} %** |`,
  );
  lineas.push("");
  lineas.push("---");
  lineas.push("");
  lineas.push("## Tabla de frescura de módulos");
  lineas.push("");
  lineas.push("| Rol | Orden | Módulo | Ficha | Versión verificada | Fecha | Pantallas | Estado |");
  lineas.push("|---|---:|---|---|---|---|---|:---:|");

  for (const rol of roles) {
    const delRol = fichas.filter((f) => f.rol === rol.id).sort((a, b) => a.orden - b.orden || a.modulo.localeCompare(b.modulo));
    for (const f of delRol) {
      const enlace = `[${path.posix.relative("docs/manuales", f.archivoRelativo)}](${path.posix.relative("docs/manuales", f.archivoRelativo)})`;
      const version = f.verificacion ? `\`${f.verificacion.version}\` (\`${f.verificacion.sha}\`)` : "—";
      const fecha = f.verificacion?.fecha ?? "—";
      const pantallas = f.rutas.map((r) => `\`${r}\``).join("<br>") || "—";
      lineas.push(`| ${rol.etiqueta} | ${f.orden} | **${f.modulo}** | ${enlace} | ${version} | ${fecha} | ${pantallas} | \`${f.estado}\` |`);
    }
    if (delRol.length === 0) {
      lineas.push(`| ${rol.etiqueta} | — | _(sin fichas todavía)_ | — | — | — | — | \`sin hacer\` |`);
    }
  }

  lineas.push("");
  lineas.push("---");
  lineas.push("");
  lineas.push("## Pantallas sin documentar (`sin hacer`)");
  lineas.push("");
  lineas.push(
    "Lista calculada cruzando `src/app/<rol>/**/page.tsx` con el campo `rutas` de cada ficha. Cuando una pantalla se documenta, se agrega su ruta al front-matter de la ficha y esta lista se acorta.",
  );
  for (const c of cobertura) {
    const rol = roles.find((r) => r.id === c.rol);
    lineas.push("");
    lineas.push(`### ${rol?.etiqueta ?? c.rol} (${c.cubiertas.length}/${c.total}, ${c.porcentaje} %)`);
    lineas.push("");
    if (c.sinDocumentar.length === 0) {
      lineas.push("Todas las pantallas del rol tienen ficha.");
    } else {
      for (const ruta of c.sinDocumentar) lineas.push(`- \`${ruta}\``);
    }
    if (c.excluidas.length) {
      lineas.push("");
      lineas.push("Excluidas (justificadas en `roles.json`):");
      for (const e of c.excluidas) lineas.push(`- \`${e.ruta}\`: ${e.razon}`);
    }
    if (c.inexistentes.length) {
      lineas.push("");
      lineas.push("**Rutas declaradas que ya no existen** (corregir la ficha):");
      for (const x of c.inexistentes) lineas.push(`- \`${x.ruta}\` (ficha **${x.modulo}**)`);
    }
  }

  const conErrores = fichas.filter((f) => f.errores.length > 0);
  if (conErrores.length) {
    lineas.push("");
    lineas.push("## Fichas con problemas de formato");
    lineas.push("");
    for (const f of conErrores) lineas.push(`- \`${f.archivoRelativo}\`: ${f.errores.join("; ")}`);
  }

  lineas.push("");
  lineas.push("---");
  lineas.push("");
  lineas.push("## Convenciones de estado");
  lineas.push("");
  lineas.push(
    "- `vigente`: probado en ejecución real, con todos sus controles inventariados, errores copiados literalmente, impacto comprobado en otros roles y capturas reales sin datos de menores ni credenciales.",
  );
  lineas.push(
    "- `por reverificar`: el módulo tenía manual, pero su interfaz cambió. Se declara en el front-matter de la ficha (`estado: por reverificar`) y **no se publica** en el manual hasta volver a verificarlo.",
  );
  lineas.push("- `sin hacer`: pantalla o módulo pendiente de documentar bajo el estándar de la política.");
  lineas.push("");
  return lineas.join("\n");
}

export function escribirIndice() {
  const roles = leerRoles();
  const fichas = cargarFichas(roles);
  const { cobertura } = obtenerCobertura(roles, fichas);
  const contenido = generarIndice(roles, fichas, cobertura);
  const destino = path.join(DIR_MANUALES, "INDICE.md");
  fs.writeFileSync(destino, contenido, "utf8");
  console.log(`INDICE.md regenerado (${fichas.length} fichas, ${cobertura.reduce((a, c) => a + c.total, 0)} pantallas).`);
}

if (esPrincipal(import.meta.url)) escribirIndice();
