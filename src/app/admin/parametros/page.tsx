import { requireAuthContext } from "@/lib/auth/session";
import { listarParametros } from "@/services/parametro.service";
import { actualizarParametroAction } from "@/actions/admin.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function ParametrosPage() {
  const ctx = await requireAuthContext();
  const parametros = await listarParametros(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">
        Parámetros de fórmula
      </h1>
      <p className="text-sm text-muted">
        Cada cambio queda auditado y solo afecta a evaluaciones futuras
        (el histórico es inmutable).
      </p>

      {parametros.length === 0 ? (
        <Card>
          <p className="text-muted">No hay parámetros configurados.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {parametros.map((p) => (
            <Card key={p.clave}>
              <form
                action={actualizarParametroAction}
                className="flex flex-wrap items-end gap-4"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm font-bold text-pitch">
                    {p.clave}
                  </p>
                  {p.descripcion && (
                    <p className="text-xs text-muted">{p.descripcion}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    Última edición:{" "}
                    {new Date(p.updatedAt).toLocaleString("es")}
                  </p>
                </div>
                <input type="hidden" name="clave" value={p.clave} />
                <div>
                  <label
                    htmlFor={`v-${p.clave}`}
                    className="mb-1 block text-xs text-muted"
                  >
                    Valor
                  </label>
                  <input
                    id={`v-${p.clave}`}
                    name="valor"
                    type="number"
                    step="any"
                    defaultValue={p.valor}
                    className="w-32 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-pitch"
                  />
                </div>
                <Button type="submit" size="md">
                  Guardar
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
