import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { requireAuthContext } from "@/lib/auth/session";
import {
  obtenerAsistenciaEscuela,
  obtenerAsistenciaMensualEscuela,
} from "@/services/gestion-deportiva.service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Asistencia" };

/** Semáforo de asistencia según el %: verde ≥80, ámbar ≥50, rojo el resto. */
function tonoPorcentaje(p: number): string {
  return p >= 80 ? "text-pitch" : p >= 50 ? "text-oro" : "text-alerta";
}

/** "yyyy-MM" → etiqueta corta "feb" (mes en español). */
function etiquetaMes(mes: string): string {
  return format(parse(mes, "yyyy-MM", new Date()), "LLL", { locale: es });
}

export default async function AsistenciaPage() {
  const ctx = await requireAuthContext();
  const [datos, mensual] = await Promise.all([
    obtenerAsistenciaEscuela(ctx),
    obtenerAsistenciaMensualEscuela(ctx),
  ]);

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

      {/* ── Evolución mensual (matriz mes × categoría, C2.5) ─────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Evolución mensual</h2>
        {mensual.filas.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            titulo="Sin categorías"
            texto="Todavía no hay categorías para mostrar la evolución."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  {mensual.meses.map((m) => (
                    <th key={m} className="px-3 py-3 text-right font-medium capitalize">
                      {etiquetaMes(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mensual.filas.map((fila) => (
                  <tr
                    key={fila.categoriaNombre}
                    className="border-b border-subtle last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 font-medium">{fila.categoriaNombre}</td>
                    {fila.celdas.map((c) => (
                      <td
                        key={c.mes}
                        className="tabular px-3 py-3 text-right font-semibold"
                      >
                        {c.porcentaje === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className={tonoPorcentaje(c.porcentaje)}>
                            {c.porcentaje}%
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

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
                      <span className={tonoPorcentaje(fila.porcentaje)}>
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
                      <span className={tonoPorcentaje(fila.porcentaje)}>
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
