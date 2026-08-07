import { GENEROS, type Genero } from "@/types";

/**
 * El género se guarda como texto (Postgres no tiene el enum: mismo criterio que
 * `posicion` o `estado`), así que al salir hacia un DTO hay que validarlo en vez
 * de castearlo. Un valor desconocido —o el NULL de "sin declarar"— se normaliza
 * a `null`: el avatar cae en la variación por seed, que es el comportamiento
 * correcto para "no sabemos", no una rama de error.
 */
export function aGenero(valor: string | null | undefined): Genero | null {
  return typeof valor === "string" && (GENEROS as readonly string[]).includes(valor)
    ? (valor as Genero)
    : null;
}
