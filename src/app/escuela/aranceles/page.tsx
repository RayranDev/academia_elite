import { requireAuthContext } from "@/lib/auth/session";
import { listarArancelesEscuela } from "@/services/arancel.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { ArancelesPanel } from "@/components/escuela/ArancelesPanel";

export default async function ArancelesPage() {
  const ctx = await requireAuthContext();
  const [aranceles, categorias] = await Promise.all([
    listarArancelesEscuela(ctx),
    listarCategoriasEscuela(ctx),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Precios</h1>
      <p className="max-w-2xl text-sm text-muted">
        La lista de precios de la escuela. Es lo que usa la generación de la
        cobranza del mes para saber cuánto cobrarle a cada jugador según su
        categoría.
      </p>
      <ArancelesPanel
        aranceles={aranceles}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
