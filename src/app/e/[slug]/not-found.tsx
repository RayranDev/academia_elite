import type { Metadata } from "next";
import { PaginaNoEncontrada } from "@/components/ui/PaginaNoEncontrada";

export const metadata: Metadata = {
  title: "Escuela no encontrada",
  robots: { index: false },
};

// Mismo mensaje para una escuela inexistente y para una inactiva: no
// confirmamos cuál de los dos casos es (DECISIONES.md #88).
export default function EscuelaNoEncontrada() {
  return (
    <PaginaNoEncontrada
      titulo="No encontramos esta escuela"
      mensaje="Revisa que el enlace esté completo, o pídele a la escuela que te lo comparta de nuevo."
    />
  );
}
