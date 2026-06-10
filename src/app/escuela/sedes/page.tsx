import { requireAuthContext } from "@/lib/auth/session";
import { listarSedesEscuela } from "@/services/sede.service";
import { crearSedeAction, crearCanchaAction } from "@/actions/escuela.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function SedesPage() {
  const ctx = await requireAuthContext();
  const sedes = await listarSedesEscuela(ctx);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-3xl font-black italic uppercase">Sedes y canchas</h1>
        {sedes.length === 0 ? (
          <Card>
            <p className="text-muted">Aún no hay sedes. Crea la primera.</p>
          </Card>
        ) : (
          sedes.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{s.nombre}</p>
                  {s.direccion && (
                    <p className="text-xs text-muted">{s.direccion}</p>
                  )}
                </div>
                <Badge>{s.canchas.length} canchas</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {s.canchas.map((c) => (
                  <Badge key={c.id} tono="pitch">
                    {c.nombre}
                  </Badge>
                ))}
              </div>

              <form
                action={crearCanchaAction}
                className="mt-3 flex gap-2 border-t border-subtle pt-3"
              >
                <input type="hidden" name="sedeId" value={s.id} />
                <input
                  name="nombre"
                  placeholder="Nombre de cancha"
                  required
                  className={input}
                />
                <Button type="submit" variant="secondary" size="sm">
                  + Cancha
                </Button>
              </form>
            </Card>
          ))
        )}
      </div>

      <div>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Nueva sede</h2>
          <form action={crearSedeAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Nombre</label>
              <input name="nombre" placeholder="Sede Central" required className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">
                Dirección (opcional)
              </label>
              <input name="direccion" className={input} />
            </div>
            <Button type="submit" className="w-full">
              Crear sede
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
