import { requireAuthContext } from "@/lib/auth/session";
import { listarSedesEscuela } from "@/services/sede.service";
import { NuevaSedeForm } from "@/components/escuela/NuevaSedeForm";
import { NuevaCanchaForm } from "@/components/escuela/NuevaCanchaForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

              <NuevaCanchaForm sedeId={s.id} />
            </Card>
          ))
        )}
      </div>

      <div>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Nueva sede</h2>
          <NuevaSedeForm />
        </Card>
      </div>
    </div>
  );
}
