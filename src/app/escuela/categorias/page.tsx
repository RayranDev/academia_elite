import { requireAuthContext } from "@/lib/auth/session";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarRangosCategoriasEscuela } from "@/services/categoria-rango.service";
import { Card } from "@/components/ui/Card";
import { CategoriasPanel } from "@/components/escuela/CategoriasPanel";
import { CrearCategoriaForm } from "@/components/escuela/CrearCategoriaForm";

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
          <CrearCategoriaForm />
        </Card>
      </div>
    </div>
  );
}
