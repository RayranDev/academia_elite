// Formateo de nombres propios a Title Case (punto único de verdad).
// Se usa como `.transform()` de Zod en la frontera y en importaciones/seed, para
// que los nombres se guarden consistentes (`JUAN carlos` -> `Juan Carlos`) sin
// romper la estética de cartas y tablas. NO duplicar esta lógica en otro lado.

// Artículos y partículas que van en minúscula cuando NO son la primera palabra
// ("de la Cruz", pero "De la Cruz" si encabezan). Contexto hispano/latino.
const PARTICULAS = new Set([
  "de", "del", "la", "las", "los", "y", "e",
  "da", "das", "do", "dos", "van", "von",
]);

/**
 * Capitaliza un segmento simple (sin separadores). Aplica la regla "Mc" (McDonald)
 * pero NO "Mac": en nombres hispanos "Mac…" suele ser Maciel/Machado/Maceo, no escocés.
 */
function capitalizarSegmento(seg: string): string {
  if (!seg) return seg;
  if (seg.startsWith("mc") && seg.length > 2) {
    return "Mc" + seg[2].toUpperCase() + seg.slice(3);
  }
  return seg[0].toUpperCase() + seg.slice(1);
}

/** Capitaliza una palabra respetando apóstrofes y guiones (O'Connor, Jean-Pierre). */
function capitalizarPalabra(palabra: string): string {
  return palabra
    .split(/([-'])/) // conserva los separadores en el array
    .map((seg) => (seg === "-" || seg === "'" ? seg : capitalizarSegmento(seg)))
    .join("");
}

/** Convierte un nombre a Title Case respetando partículas, apóstrofes y guiones. */
export function formatearNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  return limpio
    .split(" ")
    .map((palabra, i) => {
      const lower = palabra.toLowerCase();
      if (i > 0 && PARTICULAS.has(lower)) return lower;
      return capitalizarPalabra(lower);
    })
    .join(" ");
}
