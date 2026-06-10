// Une clases condicionales. Mínimo, sin dependencias extra.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
