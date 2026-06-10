import { requireAuthContext } from "@/lib/auth/session";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { crearCategoriaAction } from "@/actions/escuela.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function CategoriasPage() {
  const ctx = await requireAuthContext();
  const categorias = await listarCategoriasEscuela(ctx);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-3xl font-black italic uppercase">Categorías</h1>
        {categorias.length === 0 ? (
          <Card>
            <p className="text-muted">
              Aún no hay categorías. Crea la primera con el formulario.
            </p>
          </Card>
        ) : (
          categorias.map((c) => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{c.nombre}</p>
                <p className="text-xs text-muted">
                  Años {c.anioDesde}–{c.anioHasta}
                </p>
              </div>
              <Badge>{c.jugadores} jugadores</Badge>
            </Card>
          ))
        )}
      </div>

      <div>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Nueva categoría</h2>
          <form action={crearCategoriaAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Nombre</label>
              <input name="nombre" placeholder="Sub-14" required className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Año desde</label>
                <input name="anioDesde" type="number" defaultValue={2014} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Año hasta</label>
                <input name="anioHasta" type="number" defaultValue={2015} className={input} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Crear categoría
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
