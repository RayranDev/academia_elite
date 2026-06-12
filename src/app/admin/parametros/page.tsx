import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { listarParametros, type ParametroDTO } from "@/services/parametro.service";
import { actualizarParametroAction } from "@/actions/admin.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PRUEBAS_FISICAS,
  CLAVE_PRUEBA,
  ETIQUETA_PRUEBA,
  RANGOS_POR_GRUPO,
  type GrupoEdad,
  type PruebaFisica,
} from "@/lib/stats-engine";

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

const input =
  "w-24 rounded-lg border border-subtle bg-surface-2 px-2 py-1.5 text-sm tabular outline-none focus:border-brand";

function CampoParametro({ parametro }: { parametro: ParametroDTO }) {
  return (
    <form action={actualizarParametroAction} className="flex items-center gap-1.5">
      <input type="hidden" name="clave" value={parametro.clave} />
      <input
        name="valor"
        type="number"
        step="any"
        defaultValue={parametro.valor}
        aria-label={parametro.clave}
        className={input}
      />
      <Button type="submit" size="sm" variant="secondary">
        Guardar
      </Button>
    </form>
  );
}

export default async function ParametrosPage() {
  const ctx = await requireAuthContext();
  const parametros = await listarParametros(ctx);
  const porClave = new Map(parametros.map((p) => [p.clave, p]));
  const pesoMen = porClave.get("PESO_MEN_EN_OVR");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-display italic uppercase">
          Parámetros de evaluación
        </h1>
        <Link
          href="/admin/simulador"
          className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <FlaskConical className="h-4 w-4" aria-hidden />
          Probar en el simulador →
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Estos valores definen cómo las marcas físicas se convierten en stats de
        carta. Cada cambio queda auditado y solo afecta a evaluaciones futuras
        (el histórico es inmutable).
      </p>

      {pesoMen && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Peso de la mentalidad (MEN) en el OVR</h2>
              <p className="text-xs text-muted">
                0.10 = la mentalidad aporta el 10% del OVR. El 90% restante son
                los stats ponderados por posición.
              </p>
            </div>
            <CampoParametro parametro={pesoMen} />
          </div>
        </Card>
      )}

      {GRUPOS.map((grupo) => (
        <Card key={grupo}>
          <h2 className="mb-1 font-bold">{grupo.replace("SUB", "Sub-")}</h2>
          <p className="mb-3 text-xs text-muted">
            Para cada prueba se define la peor y la mejor marca esperada a esta
            edad: la peor normaliza a 40 y la mejor a 99.
          </p>
          <div className="space-y-3">
            {PRUEBAS_FISICAS.map((prueba: PruebaFisica) => {
              const inverso = RANGOS_POR_GRUPO[grupo][prueba].inverso;
              const min = porClave.get(`RANGO_${CLAVE_PRUEBA[prueba]}_${grupo}_MIN`);
              const max = porClave.get(`RANGO_${CLAVE_PRUEBA[prueba]}_${grupo}_MAX`);
              if (!min || !max) return null;
              return (
                <div
                  key={prueba}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-48">
                    <p className="text-sm font-semibold">{ETIQUETA_PRUEBA[prueba]}</p>
                    <p className="text-xs text-muted">
                      {inverso
                        ? "Menos es mejor: el mínimo es la MEJOR marca y el máximo la peor."
                        : "Más es mejor: el mínimo es la peor marca y el máximo la MEJOR."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <p className="mb-0.5 text-[11px] text-muted">Mínimo</p>
                      <CampoParametro parametro={min} />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[11px] text-muted">Máximo</p>
                      <CampoParametro parametro={max} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <p className="text-xs text-muted">
        Las ponderaciones por posición (cuánto pesa cada stat en el OVR de un
        POR/DEF/MED/DEL) son parte de la fórmula v1.1 y no se editan aquí.
      </p>
    </div>
  );
}
