import { requireAuthContext } from "@/lib/auth/session";
import { listarMetricasEscuela } from "@/services/parametro-escuela.service";
import { Card } from "@/components/ui/Card";
import { MetricaCampo } from "@/components/escuela/MetricaCampo";

export default async function MetricasEscuelaPage() {
  const ctx = await requireAuthContext();
  const { grupos, umbrales } = await listarMetricasEscuela(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Métricas de evaluación</h1>
      <p className="max-w-2xl text-sm text-muted">
        Ajusta los rangos físicos y los umbrales de nivel para tu escuela. Lo que
        no configures usa el valor global. Cada cambio queda auditado y solo
        afecta a evaluaciones futuras.
      </p>

      <Card>
        <h2 className="mb-1 font-bold">Umbrales de nivel</h2>
        <p className="mb-3 text-xs text-muted">
          OVR a partir del cual la carta sube de nivel (Plata &lt; Oro &lt; Héroe).
        </p>
        <div className="space-y-3">
          {umbrales.map((u) => (
            <div
              key={u.clave}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
            >
              <p className="text-sm font-semibold">{u.etiqueta}</p>
              <MetricaCampo clave={u.clave} fila={u.fila} />
            </div>
          ))}
        </div>
      </Card>

      {grupos.map((g) => (
        <Card key={g.grupo}>
          <h2 className="mb-1 font-bold">{g.grupo.replace("SUB", "Sub-")}</h2>
          <p className="mb-3 text-xs text-muted">
            Peor y mejor marca esperada a esta edad: la peor normaliza a 40 y la
            mejor a 99.
          </p>
          <div className="space-y-3">
            {g.pruebas.map((p) => (
              <div
                key={p.prueba}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
              >
                <div className="min-w-48">
                  <p className="text-sm font-semibold">{p.etiqueta}</p>
                  <p className="text-xs text-muted">
                    {p.inverso
                      ? "Menos es mejor: el mínimo es la MEJOR marca."
                      : "Más es mejor: el máximo es la MEJOR marca."}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-4">
                  <div>
                    <p className="mb-0.5 text-[11px] text-muted">Mínimo</p>
                    <MetricaCampo clave={p.min.clave} fila={p.min} />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[11px] text-muted">Máximo</p>
                    <MetricaCampo clave={p.max.clave} fila={p.max} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
