import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TextoPolitica, NotaVersionPolitica } from "@/components/legal/TextoPolitica";

export const metadata = {
  title: "Tratamiento de Datos y Habeas Data — Academia Élite",
  description:
    "Política de Tratamiento de Datos Personales y Habeas Data de Academia Élite.",
};

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver
      </Link>

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-pitch">
          Academia Élite
        </p>
        <h1 className="mt-1 text-3xl font-display italic uppercase">
          Política de Tratamiento de Datos y Habeas Data
        </h1>
        <NotaVersionPolitica className="mt-2" />
      </header>

      <TextoPolitica />
    </main>
  );
}
