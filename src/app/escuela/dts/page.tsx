import { requireAuthContext } from "@/lib/auth/session";
import { listarDts } from "@/services/entrenador.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { CrearDtDialog } from "@/components/escuela/CrearDtDialog";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function DtsPage() {
  const ctx = await requireAuthContext();
  const [dts, categorias] = await Promise.all([
    listarDts(ctx),
    listarCategoriasEscuela(ctx),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase">Directores técnicos</h1>
        <CrearDtDialog categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))} />
      </div>

      {categorias.length === 0 && (
        <Card>
          <p className="text-sm text-alerta">
            Primero crea al menos una categoría para poder asignar DTs.
          </p>
        </Card>
      )}

      {dts.length === 0 ? (
        <Card>
          <p className="text-muted">Aún no hay DTs registrados.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dts.map((d) => (
            <Card key={d.id}>
              <p className="text-lg font-bold">{d.nombre}</p>
              <p className="break-all text-xs text-muted">{d.email}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {d.categorias.length === 0 ? (
                  <span className="text-xs text-muted">Sin categorías</span>
                ) : (
                  d.categorias.map((c) => (
                    <Badge key={c.id} tono="pitch">
                      {c.nombre}
                    </Badge>
                  ))
                )}
              </div>
              {!d.activo && (
                <div className="mt-2">
                  <Badge tono="alerta">Inactivo</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
