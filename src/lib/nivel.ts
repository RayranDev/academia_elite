/**
 * Token de color Tailwind por nivel de carta (BRONCE/PLATA/ORO/HÉROE). Punto
 * único de la convención de color por nivel, reusado por landing, ranking y
 * cualquier vista que muestre el nivel.
 */
export function colorNivel(nivel: string): string {
  switch (nivel?.toUpperCase()) {
    case "HEROE":
      return "text-heroe";
    case "ORO":
      return "text-oro";
    case "PLATA":
      return "text-plata";
    case "BRONCE":
      return "text-bronce";
    default:
      return "text-muted";
  }
}
