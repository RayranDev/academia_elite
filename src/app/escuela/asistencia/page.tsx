import { requireAuthContext } from "@/lib/auth/session";
import { asistenciaEscuela } from "@/services/gestion-deportiva.service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Asistencia" };

export default async function AsistenciaPage() {
  const ctx = await requireAuthContext();
  const datos = await asistenciaEscuela(ctx);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-display italic uppercase">Asistencia</h1>
        {/* Export en matriz jugador×fecha, una hoja por categoría (PR-5 §5.1). */}
        <a
          href="/api/asistencia-export"
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Descargar asistencia
        </a>
      </div>

      {/* ── Por categoría ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Por categoría</h2>

        {datos.porCategoria.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            titulo="Sin registros de asistencia"
            texto="Aún no hay asistencias registradas en ninguna categoría."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 text-right font-medium">Presentes</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">% Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {datos.porCategoria.map((fila) => (
                  <tr
                    key={fila.categoriaNombre}
                    className="border-b border-subtle last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 font-medium">{fila.categoriaNombre}</td>
                    <td className="tabular px-4 py-3 text-right">{fila.presentes}</td>
                    <td className="tabular px-4 py-3 text-right text-muted">{fila.total}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      <span
                        className={
                          fila.porcentaje >= 80
                            ? "text-pitch"
                            : fila.porcentaje >= 50
                              ? "text-oro"
                              : "text-alerta"
                        }
                      >
                        {fila.porcentaje}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── Por jugador ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Por jugador</h2>

        {datos.porJugador.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            titulo="Sin registros individuales"
            texto="Aún no hay asistencias individuales registradas."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="px-4 py-3 font-medium">Jugador</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 text-right font-medium">Presentes</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">% Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {datos.porJugador.map((fila) => (
                  <tr
                    key={fila.jugadorId}
                    className="border-b border-subtle last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 font-medium">
                      {fila.apellido}, {fila.nombre}
                    </td>
                    <td className="px-4 py-3 text-muted">{fila.categoriaNombre}</td>
                    <td className="tabular px-4 py-3 text-right">{fila.presentes}</td>
                    <td className="tabular px-4 py-3 text-right text-muted">{fila.total}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      <span
                        className={
                          fila.porcentaje >= 80
                            ? "text-pitch"
                            : fila.porcentaje >= 50
                              ? "text-oro"
                              : "text-alerta"
                        }
                      >
                        {fila.porcentaje}%
                      </span>
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
