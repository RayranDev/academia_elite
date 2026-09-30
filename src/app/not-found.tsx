import type { Metadata } from "next";
import { PaginaNoEncontrada } from "@/components/ui/PaginaNoEncontrada";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

export default function NoEncontrada() {
  return (
    <PaginaNoEncontrada
      titulo="Esta jugada no existe"
      mensaje="La página que buscas no está disponible o cambió de lugar. Revisa el enlace e inténtalo de nuevo."
    />
  );
}
