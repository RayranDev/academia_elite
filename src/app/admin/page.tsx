import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { saludPlataforma } from "@/services/admin-metrics.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LABEL_ESTADO_LEAD } from "@/components/admin/EstadoLeadBadge";
import { ESTADOS_LEAD } from "@/types";

// Dashboard de salud de la plataforma (SUPER_ADMIN). Solo métricas agregadas y de
// lectura: para tocar el detalle de una escuela hay que abrir una sesión de soporte.
export default async function AdminOverviewPage() {
  const ctx = await requireAuthContext();
  const salud = await saludPlataforma(ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black italic uppercase">Salud de la plataforma</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          titulo="Escuelas activas"
          valor={salud.escuelas.activas}
          sub={`${salud.escuelas.inactivas} inactivas`}
          href="/admin/escuelas"
        />
        <Tile
          titulo="Altas de escuelas"
          valor={salud.altasEscuelas30d}
          sub="últimos 30 días"
          href="/admin/escuelas"
        />
        <Tile
          titulo="Jugadores activos"
          valor={salud.jugadores.activos}
          sub={`${salud.jugadores.total} en total`}
        />
        <Tile
          titulo="Evaluaciones"
          valor={salud.evaluaciones30d}
          sub="últimos 30 días"
        />
        <Tile
          titulo="Eventos próximos"
          valor={salud.eventosProximos7d}
          sub="próximos 7 días"
        />
        <Tile
          titulo="Morosidad"
          valor={salud.morosidad.jugadores}
          sub={`${salud.morosidad.escuelas} escuelas · período actual`}
        />
        <Tile
          titulo="Acciones de soporte"
          valor={salud.accionesSoporte7d}
          sub="últimos 7 días"
          href="/admin/auditoria"
        />
        <Tile
          titulo="Leads nuevos"
          valor={salud.leadsPorEstado.NUEVO ?? 0}
          sub={`${salud.leadsPorEstado.CONVERTIDO ?? 0} convertidos`}
          href="/admin/leads"
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pipeline de leads</h2>
          <Link href="/admin/leads" className="text-sm text-pitch">
            Ver pipeline →
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {ESTADOS_LEAD.map((e) => (
            <div
              key={e}
              className="rounded-lg border border-subtle bg-surface-2 px-4 py-3"
            >
              <div className="text-2xl font-black tabular">
                {salud.leadsPorEstado[e] ?? 0}
              </div>
              <Badge tono={e === "CONVERTIDO" ? "pitch" : "neutral"}>
                {LABEL_ESTADO_LEAD[e]}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimas acciones sensibles</h2>
          <Link href="/admin/auditoria" className="text-sm text-pitch">
            Ver auditoría →
          </Link>
        </div>
        {salud.ultimasAcciones.length === 0 ? (
          <p className="text-sm text-muted">Sin acciones registradas todavía.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {salud.ultimasAcciones.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex justify-between gap-3 border-b border-subtle pb-2"
              >
                <span className="min-w-0">
                  <span className="font-semibold text-pitch">{a.accion}</span>{" "}
                  <span className="text-muted">
                    {a.entidad}
                    {a.motivo ? ` · ${a.motivo}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-muted">
                  {new Date(a.createdAt).toLocaleString("es")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tile({
  titulo,
  valor,
  sub,
  href,
}: {
  titulo: string;
  valor: string | number;
  sub?: string;
  href?: string;
}) {
  const body = (
    <Card className={href ? "transition-colors hover:border-pitch/50" : ""}>
      <div className="text-3xl font-black tabular">{valor}</div>
      <div className="mt-1 text-sm text-muted">{titulo}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
