import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import {
  listarPlantillaDt,
  listarSolicitudesDt,
  listarCategoriasDelDt,
} from "@/services/jugador.service";
import { CrearJugadorDialog } from "@/components/dt/CrearJugadorDialog";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function DtDashboardPage() {
  const ctx = await requireAuthContext();
  const [plantilla, solicitudes, categorias] = await Promise.all([
    listarPlantillaDt(ctx),
    listarSolicitudesDt(ctx),
    listarCategoriasDelDt(ctx),
  ]);

  const vencidas = plantilla.filter((p) => p.vencida).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase">Plantilla</h1>
        <CrearJugadorDialog categorias={categorias} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi titulo="Jugadores activos" valor={plantilla.length} />
        <Kpi titulo="Evaluaciones vencidas" valor={vencidas} alerta={vencidas > 0} />
        <Kpi titulo="Solicitudes" valor={solicitudes.length} href="/dt/solicitudes" />
        <Kpi titulo="Categorías" valor={categorias.length} />
      </div>

      {plantilla.length === 0 ? (
        <Card>
          <p className="text-muted">
            Aún no hay jugadores activos. Crea uno con “+ Nuevo jugador” o aprueba
            solicitudes pendientes.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {plantilla.map((j) => (
            <Link
              key={j.id}
              href={`/dt/jugadores/${j.id}`}
              className="group flex flex-col items-center gap-2"
            >
              {j.card ? (
                <PlayerCard data={j.card} size="sm" />
              ) : (
                <div className="flex aspect-3/4 w-32 flex-col items-center justify-center rounded-[14px] border border-dashed border-subtle bg-surface-2 text-center text-xs text-muted">
                  <span className="px-2">{j.nombre} {j.apellido}</span>
                  <span className="mt-1 text-pitch">Sin evaluar</span>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold group-hover:text-brand">
                  {j.nombre} {j.apellido}
                </p>
                {j.vencida ? (
                  <Badge tono="alerta">Vencida</Badge>
                ) : (
                  <span className="text-[10px] text-muted">{j.categoriaNombre}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  alerta,
  href,
}: {
  titulo: string;
  valor: number;
  alerta?: boolean;
  href?: string;
}) {
  const body = (
    <Card className={alerta ? "border-alerta/50" : undefined}>
      <div className={`text-3xl font-black tabular ${alerta ? "text-alerta" : ""}`}>
        {valor}
      </div>
      <div className="mt-1 text-sm text-muted">{titulo}</div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
