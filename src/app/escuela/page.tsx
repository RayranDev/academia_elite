import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { resumenEscuela } from "@/services/dashboard-escuela.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarSedesEscuela } from "@/services/sede.service";
import { listarDts } from "@/services/entrenador.service";
import { listarCodigosEscuela } from "@/services/codigo.service";
import { resumenMembresias } from "@/services/membresia.service";
import { Card } from "@/components/ui/Card";

export default async function EscuelaDashboardPage() {
  const ctx = await requireAuthContext();

  const [resumen, categorias, sedes, dts, codigos, membresias] =
    await Promise.all([
      resumenEscuela(ctx),
      listarCategoriasEscuela(ctx),
      listarSedesEscuela(ctx),
      listarDts(ctx),
      listarCodigosEscuela(ctx),
      resumenMembresias(ctx),
    ]);

  const codigosVigentes = codigos.filter((c) => c.vigente).length;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black italic uppercase">Dashboard</h1>

      {/* Código de la escuela: el que las familias usan para registrarse/vincularse. */}
      {resumen.codigoRef && (
        <Card className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">
              Código de tu escuela
            </p>
            <p className="mt-1 text-xs text-muted">
              Dáselo a las familias para que registren o vinculen a su jugador.
            </p>
          </div>
          <span className="select-all rounded-lg border border-subtle bg-surface-2 px-4 py-2 font-mono text-2xl font-black tracking-widest text-brand">
            {resumen.codigoRef}
          </span>
        </Card>
      )}

      {/* KPIs deportivos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          Resumen deportivo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi
            titulo="Jugadores activos"
            valor={resumen.jugadoresActivos}
            subtitulo={`de ${resumen.totalJugadores} totales`}
          />
          <Kpi
            titulo="OVR promedio"
            valor={resumen.ovrPromedio === 0 ? "—" : resumen.ovrPromedio}
          />
          <Kpi
            titulo="Evals vencidas"
            valor={resumen.evaluacionesVencidas}
            alerta={resumen.evaluacionesVencidas > 0}
            href="/escuela/jugadores?evaluacion=VENCIDA"
          />
          <Kpi
            titulo="Sin evaluar"
            valor={resumen.sinEvaluacion}
            alerta={resumen.sinEvaluacion > 0}
            href="/escuela/jugadores?evaluacion=SIN_EVALUAR"
          />
          <Kpi
            titulo="Asistencia (30 días)"
            valor={
              resumen.asistenciaMesPorcentaje === 0
                ? "—"
                : `${resumen.asistenciaMesPorcentaje}%`
            }
            href="/escuela/asistencia"
          />
        </div>
      </section>

      {/* Administración: la cobranza, que es lo que sostiene la escuela. */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          Administración
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            titulo="Cuotas al día"
            valor={membresias.alDia}
            href="/escuela/membresias?estado=PAGADA"
          />
          <Kpi
            titulo="Cuotas pendientes"
            valor={membresias.pendientes}
            href="/escuela/membresias?estado=PENDIENTE"
          />
          <Kpi
            titulo="Cuotas vencidas"
            valor={membresias.vencidas}
            alerta={membresias.vencidas > 0}
            href="/escuela/membresias?estado=VENCIDA"
          />
          <Kpi
            titulo="Familias bloqueadas"
            valor={membresias.bloqueados}
            alerta={membresias.bloqueados > 0}
            href="/escuela/jugadores?bloqueado=1"
          />
        </div>
      </section>

      {/* Distribución por nivel */}
      <section>
        <Card>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Distribución por nivel
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Tokens del tema (--color-bronce/plata/oro/heroe), no paleta cruda. */}
            <NivelBadge
              label="Bronce"
              count={resumen.distribucionNivel.bronce}
              color="text-bronce"
            />
            <NivelBadge
              label="Plata"
              count={resumen.distribucionNivel.plata}
              color="text-plata"
            />
            <NivelBadge
              label="Oro"
              count={resumen.distribucionNivel.oro}
              color="text-oro"
            />
            <NivelBadge
              label="Héroe"
              count={resumen.distribucionNivel.heroe}
              color="text-heroe"
            />
          </div>
        </Card>
      </section>

      {/* Evaluaciones pendientes */}
      {resumen.pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
            Evaluaciones pendientes ({resumen.pendientes.length})
          </h2>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    <th className="px-4 py-3 text-left font-semibold text-muted">
                      Jugador
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">
                      Última evaluación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.pendientes.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-subtle last:border-0 transition-colors hover:bg-surface-2"
                    >
                      <td className="px-4 py-3 font-medium">
                        {p.apellido}, {p.nombre}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {p.categoriaNombre}
                      </td>
                      <td className="px-4 py-3">
                        {p.vencida ? (
                          <span className="rounded-full bg-alerta/10 px-2.5 py-0.5 text-xs font-semibold text-alerta">
                            Vencida
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                            Sin evaluar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {p.ultimaEvaluacion
                          ? new Date(p.ultimaEvaluacion).toLocaleDateString(
                              "es-AR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Accesos rápidos a la configuración */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          Configuración
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            titulo="Categorías"
            valor={categorias.length}
            href="/escuela/categorias"
          />
          <Tile titulo="DTs" valor={dts.length} href="/escuela/dts" />
          <Tile titulo="Sedes" valor={sedes.length} href="/escuela/sedes" />
          <Tile
            titulo="Códigos vigentes"
            valor={codigosVigentes}
            href="/escuela/codigos"
          />
        </div>
      </section>
    </div>
  );
}

// ─── Componentes locales ──────────────────────────────────────────────────────

/**
 * KPI del dashboard. Si recibe `href` y el valor es > 0, se vuelve navegable:
 * antes informaban ("Evals vencidas: 12") sin decir cuáles (PR-2 · C2.1).
 */
function Kpi({
  titulo,
  valor,
  alerta,
  subtitulo,
  href,
}: {
  titulo: string;
  valor: number | string;
  alerta?: boolean;
  subtitulo?: string;
  href?: string;
}) {
  const navegable = href && typeof valor === "number" && valor > 0;
  const cuerpo = (
    <Card
      className={[
        alerta ? "border-alerta/50" : "",
        navegable ? "transition-colors hover:border-brand/50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={`text-3xl font-black tabular-nums ${alerta ? "text-alerta" : ""}`}
      >
        {valor}
      </div>
      <div className="mt-1 text-sm text-muted">
        {titulo}
        {navegable && <span className="ml-1 text-brand">→</span>}
      </div>
      {subtitulo && (
        <div className="mt-0.5 text-xs text-muted opacity-70">{subtitulo}</div>
      )}
    </Card>
  );

  return navegable ? <Link href={href}>{cuerpo}</Link> : cuerpo;
}

function NivelBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-subtle bg-surface-2 px-3 py-1.5 text-sm font-semibold">
      <span className={color}>{label}</span>
      <span className="text-muted">{count}</span>
    </span>
  );
}

function Tile({
  titulo,
  valor,
  href,
}: {
  titulo: string;
  valor: number | string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-brand/50">
        <div className="text-3xl font-black tabular-nums">{valor}</div>
        <div className="mt-1 text-sm text-muted">{titulo}</div>
      </Card>
    </Link>
  );
}
