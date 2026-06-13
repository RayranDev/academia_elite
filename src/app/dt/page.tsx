import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import {
  listarPlantillaDt,
  listarSolicitudesDt,
  listarCategoriasDelDt,
} from "@/services/jugador.service";
import { CrearJugadorDialog } from "@/components/dt/CrearJugadorDialog";
import { ImportarEvaluacionesDialog } from "@/components/dt/ImportarEvaluacionesDialog";
import { PlantillaGrid } from "@/components/dt/PlantillaGrid";
import { Card } from "@/components/ui/Card";

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
        <h1 className="text-3xl font-display italic uppercase">Plantilla</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/jugadores-export"
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Descargar jugadores
          </a>
          <ImportarEvaluacionesDialog />
          <CrearJugadorDialog categorias={categorias} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi titulo="Jugadores activos" valor={plantilla.length} />
        <Kpi titulo="Evaluaciones vencidas" valor={vencidas} alerta={vencidas > 0} />
        <Kpi titulo="Solicitudes" valor={solicitudes.length} href="/dt/solicitudes" />
        <Kpi titulo="Categorías" valor={categorias.length} />
      </div>

      <PlantillaGrid jugadores={plantilla} categorias={categorias} />
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
