import { requireAuthContext } from "@/lib/auth/session";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarRangosCategoriasEscuela } from "@/services/categoria-rango.service";
import { crearCategoriaAction } from "@/actions/escuela.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CategoriasPanel } from "@/components/escuela/CategoriasPanel";
import { SelectorAnioCategoria } from "@/components/escuela/SelectorAnioCategoria";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function CategoriasPage() {
  const ctx = await requireAuthContext();
  const [categorias, rangos] = await Promise.all([
    listarCategoriasEscuela(ctx),
    listarRangosCategoriasEscuela(ctx),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-3xl font-black italic uppercase">Categorías</h1>
        <CategoriasPanel categorias={categorias} rangos={rangos} />
      </div>

      <div>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Nueva categoría</h2>
          <form action={crearCategoriaAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Nombre</label>
              <input name="nombre" placeholder="Sub-14" required className={input} />
            </div>
            <SelectorAnioCategoria />
            <Button type="submit" className="w-full">
              Crear categoría
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
