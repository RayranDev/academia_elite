import Link from "next/link";
import { ClipboardList, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { cn } from "@/lib/cn";
import type { PerfilDtDTO, PeriodoPerfilDt } from "@/services/dt-perfil.service";

/** Perfil del DT: resumen del período elegido + partidos + evaluaciones + plantilla pendiente. */
export function PerfilDt({
  perfil,
  periodo,
}: {
  perfil: PerfilDtDTO;
  periodo: PeriodoPerfilDt;
}) {
  return (
    <div className="space-y-8">
      <SelectorPeriodo periodo={periodo} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={ClipboardList}
          etiqueta="Evaluaciones hechas"
          valor={perfil.evaluaciones.length}
        />
        <StatTile
          icon={Trophy}
          etiqueta="Partidos jugados"
          valor={perfil.partidos.length}
        />
        <StatTile
          icon={Users}
          etiqueta="Plantilla evaluada"
          valor={`${perfil.evaluadosCount}/${perfil.totalPlantilla}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Resultados de partidos</h2>
        {perfil.partidos.length === 0 ? (
          <EmptyState
            icon={Trophy}
            titulo="Sin partidos en este período"
            texto="Los partidos finalizados de tus categorías van a aparecer acá."
          />
        ) : (
          <div className="space-y-3">
            {perfil.partidos.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">
                      <FechaLocal iso={p.inicio} /> · {p.categoriaNombre}
                    </p>
                    <h3 className="mt-0.5 text-lg font-display italic uppercase">
                      vs. {p.rival ?? "Rival"}
                    </h3>
                  </div>
                  {p.resultadoLocal !== null && p.resultadoVisitante !== null && (
                    <Badge tono="pitch">
                      {p.esLocal === false
                        ? `${p.resultadoVisitante} - ${p.resultadoLocal}`
                        : `${p.resultadoLocal} - ${p.resultadoVisitante}`}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Evaluaciones del período</h2>
        {perfil.evaluaciones.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            titulo="Sin evaluaciones en este período"
            texto="Las evaluaciones que hagas van a aparecer acá."
          />
        ) : (
          <Card className="divide-y divide-subtle p-0">
            {perfil.evaluaciones.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.jugadorNombre}</p>
                  <p className="text-xs text-muted">{e.categoriaNombre}</p>
                </div>
                <p className="shrink-0 text-xs text-muted">
                  <FechaLocal iso={e.fecha} />
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Plantilla pendiente</h2>
          {perfil.pendientes.length > 0 && (
            <Badge tono="alerta">{perfil.pendientes.length}</Badge>
          )}
        </div>
        {perfil.pendientes.length === 0 ? (
          <Card>
            <p className="text-muted">Toda la plantilla está evaluada. 👏</p>
          </Card>
        ) : (
          <Card className="divide-y divide-subtle p-0">
            {perfil.pendientes.slice(0, 5).map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {j.nombre} {j.apellido}
                  </p>
                  <p className="text-xs text-muted">{j.categoriaNombre}</p>
                </div>
                <Badge tono="alerta">Sin evaluar</Badge>
              </div>
            ))}
          </Card>
        )}
        <Link
          href="/dt/plantilla"
          className="inline-block text-xs font-semibold text-brand hover:underline"
        >
          Ver plantilla completa →
        </Link>
      </section>
    </div>
  );
}

function SelectorPeriodo({ periodo }: { periodo: PeriodoPerfilDt }) {
  return (
    <div className="inline-flex rounded-lg border border-subtle bg-surface-2 p-1">
      <OpcionPeriodo href="/dt/perfil?periodo=mes" activo={periodo === "mes"}>
        Este mes
      </OpcionPeriodo>
      <OpcionPeriodo href="/dt/perfil?periodo=todo" activo={periodo === "todo"}>
        Toda la temporada
      </OpcionPeriodo>
    </div>
  );
}

function OpcionPeriodo({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        activo ? "bg-pitch text-base" : "text-muted hover:text-foreground",
      )}
      aria-current={activo ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function StatTile({
  icon: Icon,
  etiqueta,
  valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pitch/15 text-pitch">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display italic">{valor}</p>
        <p className="text-xs text-muted">{etiqueta}</p>
      </div>
    </Card>
  );
}
