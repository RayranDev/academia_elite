import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarEscuelas } from "@/services/escuela.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NuevaEscuelaDialog } from "@/components/admin/NuevaEscuelaDialog";

export default async function EscuelasPage() {
  const ctx = await requireAuthContext();
  const escuelas = await listarEscuelas(ctx);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Escuelas</h1>
        <NuevaEscuelaDialog />
      </div>
      {escuelas.length === 0 ? (
        <Card>
          <p className="text-muted">
            Aún no hay escuelas. Creá la primera con “+ Nueva escuela”, o convertí
            un lead desde el pipeline.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {escuelas.map((e) => (
            <Card key={e.id}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{e.nombre}</h2>
                <span
                  className="h-4 w-4 rounded-full border border-subtle"
                  style={{ background: e.colorPrimario }}
                  title={e.colorPrimario}
                />
              </div>
              <p className="text-xs text-muted">/{e.slug}</p>
              <div className="mt-3 flex gap-2 text-xs">
                <Badge>{e.categorias} categorías</Badge>
                <Badge>{e.jugadores} jugadores</Badge>
                <Badge>{e.usuarios} usuarios</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {e.activa ? (
                  <Badge tono="pitch">Activa</Badge>
                ) : (
                  <Badge tono="alerta">Inactiva</Badge>
                )}
                <Link
                  href={`/admin/escuelas/${e.id}`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Gestionar →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
