import { requireAuthContext } from "@/lib/auth/session";
import { listarCodigosEscuela } from "@/services/codigo.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { desactivarCodigoAction } from "@/actions/escuela.actions";
import { CrearCodigoDialog } from "@/components/escuela/CrearCodigoDialog";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function CodigosPage() {
  const ctx = await requireAuthContext();
  const [codigos, categorias] = await Promise.all([
    listarCodigosEscuela(ctx),
    listarCategoriasEscuela(ctx),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase">
          Códigos de invitación
        </h1>
        <CrearCodigoDialog
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        />
      </div>

      <p className="text-sm text-muted">
        Las familias usan estos códigos para auto-registrarse en una categoría.
        El alta queda pendiente hasta que el DT la apruebe (Sprint 4).
      </p>

      {codigos.length === 0 ? (
        <Card>
          <p className="text-muted">Aún no hay códigos generados.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {codigos.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xl font-black tracking-widest">
                  {c.codigo}
                </p>
                {c.vigente ? (
                  <Badge tono="pitch">Vigente</Badge>
                ) : (
                  <Badge tono="alerta">Inactivo</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">{c.categoriaNombre}</p>
              <p className="text-xs text-muted">
                Usos {c.usos}/{c.usosMaximos} · Expira{" "}
                {new Date(c.expiraEn).toLocaleDateString("es")}
              </p>
              {c.activo && (
                <form action={desactivarCodigoAction} className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-xs text-alerta hover:underline"
                  >
                    Desactivar
                  </button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
