import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarArancelesEscuela } from "@/services/arancel.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarConceptosEscuela } from "@/services/concepto-cobro.service";
import { ArancelesPanel } from "@/components/escuela/ArancelesPanel";

export default async function ArancelesPage() {
  const ctx = await requireAuthContext();
  const [aranceles, categorias, conceptos] = await Promise.all([
    listarArancelesEscuela(ctx),
    listarCategoriasEscuela(ctx),
    // Solo los activos: no tiene sentido poner precio a un concepto archivado.
    listarConceptosEscuela(ctx, true),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Precios</h1>
        <Link
          href="/escuela/conceptos"
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Conceptos
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        La lista de precios de la escuela. Es lo que usa la generación de la
        cobranza del mes para saber cuánto cobrarle a cada jugador según su
        categoría.
      </p>
      <ArancelesPanel
        aranceles={aranceles}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        conceptos={conceptos}
      />
    </div>
  );
}
