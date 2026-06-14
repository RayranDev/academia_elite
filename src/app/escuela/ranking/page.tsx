import { requireAuthContext } from "@/lib/auth/session";
import { rankingEscuela } from "@/services/gestion-deportiva.service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy, Star } from "lucide-react";

export const metadata = { title: "Ranking" };

/** Mapea nivel a clase de color Tailwind. */
function colorNivel(nivel: string): string {
  switch (nivel) {
    case "HEROE":
      return "text-heroe font-bold";
    case "ORO":
      return "text-oro font-semibold";
    case "PLATA":
      return "text-plata font-semibold";
    default:
      return "text-bronce";
  }
}

export default async function RankingPage() {
  const ctx = await requireAuthContext();
  const datos = await rankingEscuela(ctx);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display italic uppercase">Ranking</h1>

      {/* ── Top OVR ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Star className="h-5 w-5 text-oro" aria-hidden />
          Top 20 — OVR
        </h2>

        {datos.topOvr.length === 0 ? (
          <EmptyState
            icon={Star}
            titulo="Sin datos de OVR"
            texto="Ningún jugador tiene estadísticas calculadas todavía."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="px-4 py-3 w-10 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Jugador</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 text-center font-medium">Nivel</th>
                  <th className="px-4 py-3 text-right font-medium">OVR</th>
                </tr>
              </thead>
              <tbody>
                {datos.topOvr.map((j, idx) => (
                  <tr
                    key={j.jugadorId}
                    className="border-b border-subtle last:border-0 hover:bg-surface-2"
                  >
                    <td className="tabular px-4 py-3 text-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {j.apellido}, {j.nombre}
                    </td>
                    <td className="px-4 py-3 text-muted">{j.categoriaNombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={colorNivel(j.nivel)}>
                        {j.nivel.charAt(0) + j.nivel.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      <span className={colorNivel(j.nivel)}>{j.ovr}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── Goleadores ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-oro" aria-hidden />
          Top 10 — Goleadores
        </h2>

        {datos.goleadores.length === 0 ? (
          <EmptyState
            icon={Trophy}
            titulo="Sin estadísticas de partidos"
            texto="Aún no se han cargado estadísticas de partidos para esta escuela."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="px-4 py-3 w-10 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Jugador</th>
                  <th className="px-4 py-3 text-right font-medium">Goles</th>
                  <th className="px-4 py-3 text-right font-medium">Asistencias</th>
                </tr>
              </thead>
              <tbody>
                {datos.goleadores.map((g, idx) => (
                  <tr
                    key={g.jugadorId}
                    className="border-b border-subtle last:border-0 hover:bg-surface-2"
                  >
                    <td className="tabular px-4 py-3 text-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {g.apellido}, {g.nombre}
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold text-pitch">
                      {g.goles}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted">
                      {g.asistencias}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
