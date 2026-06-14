import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { listarParametros, type ParametroDTO } from "@/services/parametro.service";
import { listarMetricasEscuelaAdmin } from "@/services/parametro-escuela.service";
import { listarEscuelas } from "@/services/escuela.service";
import { actualizarParametroAction } from "@/actions/admin.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MetricaCampoAdmin } from "@/components/admin/MetricaCampoAdmin";
import { SelectorEscuelaParametros } from "@/components/admin/SelectorEscuelaParametros";
import {
  PRUEBAS_FISICAS,
  CLAVE_PRUEBA,
  ETIQUETA_PRUEBA,
  RANGOS_POR_GRUPO,
  CLAVE_UMBRAL,
  UMBRALES_DEFECTO,
  type GrupoEdad,
  type PruebaFisica,
} from "@/lib/stats-engine";

const UMBRALES_UI: { clave: string; etiqueta: string; ayuda: string }[] = [
  { clave: CLAVE_UMBRAL.plata, etiqueta: "Plata", ayuda: `OVR mínimo para Plata (def. ${UMBRALES_DEFECTO.plata}).` },
  { clave: CLAVE_UMBRAL.oro, etiqueta: "Oro", ayuda: `OVR mínimo para Oro (def. ${UMBRALES_DEFECTO.oro}).` },
  { clave: CLAVE_UMBRAL.heroe, etiqueta: "Héroe", ayuda: `OVR mínimo para Héroe (def. ${UMBRALES_DEFECTO.heroe}).` },
];

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

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ escuela?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { escuela } = await searchParams;
  const escuelas = await listarEscuelas(ctx);
  // Solo entramos en modo escuela si el id es válido; si no, caemos a global.
  const escuelaSel = escuela ? escuelas.find((e) => e.id === escuela) ?? null : null;

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

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">Editar para:</label>
          <SelectorEscuelaParametros
            escuelas={escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))}
            actual={escuelaSel?.id ?? "GLOBAL"}
          />
          <p className="text-xs text-muted">
            {escuelaSel
              ? `Cambias solo los valores de "${escuelaSel.nombre}". Las demás escuelas no se ven afectadas.`
              : "Cambias los valores predeterminados (los heredan las escuelas sin ajuste propio)."}
          </p>
        </div>
      </Card>

      <p className="max-w-2xl text-sm text-muted">
        Estos valores definen cómo las marcas físicas se convierten en stats de
        carta. Cada cambio queda auditado y solo afecta a evaluaciones futuras
        (el histórico es inmutable).
      </p>

      {escuelaSel ? (
        <ParametrosEscuela ctx={ctx} escuelaId={escuelaSel.id} />
      ) : (
        <ParametrosGlobales ctx={ctx} />
      )}

      <p className="text-xs text-muted">
        Las ponderaciones por posición (cuánto pesa cada stat en el OVR de un
        POR/DEF/MED/DEL) son parte de la fórmula v1.1 y no se editan aquí.
      </p>
    </div>
  );
}

/** Modo global: edita ParametroFormula (incluye PESO_MEN_EN_OVR). */
async function ParametrosGlobales({ ctx }: { ctx: Awaited<ReturnType<typeof requireAuthContext>> }) {
  const parametros = await listarParametros(ctx);
  const porClave = new Map(parametros.map((p) => [p.clave, p]));
  const pesoMen = porClave.get("PESO_MEN_EN_OVR");

  const umbralParametro = (clave: string, valor: number, descripcion: string): ParametroDTO =>
    porClave.get(clave) ?? { clave, valor, descripcion, updatedAt: "" };

  return (
    <>
      {pesoMen && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Peso de la mentalidad (MEN) en el OVR</h2>
              <p className="text-xs text-muted">
                0.10 = la mentalidad aporta el 10% del OVR. El 90% restante son
                los stats ponderados por posición. Es global: mantiene el OVR
                comparable entre escuelas.
              </p>
            </div>
            <CampoParametro parametro={pesoMen} />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-bold">Umbrales de nivel</h2>
        <p className="mb-3 text-xs text-muted">
          OVR a partir del cual la carta sube de nivel. Subir a Plata debería ser
          más fácil que llegar a Héroe. Deben cumplir Plata &lt; Oro &lt; Héroe;
          de lo contrario el motor cae a los valores por defecto.
        </p>
        <div className="space-y-3">
          {UMBRALES_UI.map((u) => (
            <div
              key={u.clave}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
            >
              <div className="min-w-48">
                <p className="text-sm font-semibold">{u.etiqueta}</p>
                <p className="text-xs text-muted">{u.ayuda}</p>
              </div>
              <CampoParametro
                parametro={umbralParametro(
                  u.clave,
                  UMBRALES_DEFECTO[
                    u.etiqueta === "Plata" ? "plata" : u.etiqueta === "Oro" ? "oro" : "heroe"
                  ],
                  u.ayuda,
                )}
              />
            </div>
          ))}
        </div>
      </Card>

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
    </>
  );
}

/** Modo escuela: edita overrides ParametroEscuela (RANGO_* y UMBRAL_*). */
async function ParametrosEscuela({
  ctx,
  escuelaId,
}: {
  ctx: Awaited<ReturnType<typeof requireAuthContext>>;
  escuelaId: string;
}) {
  const { grupos, umbrales } = await listarMetricasEscuelaAdmin(ctx, escuelaId);

  return (
    <>
      <Card>
        <p className="text-xs text-muted">
          El peso de MEN en el OVR no se ajusta por escuela: es global para que el
          OVR siga siendo comparable entre escuelas.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-bold">Umbrales de nivel</h2>
        <p className="mb-3 text-xs text-muted">
          OVR a partir del cual la carta sube de nivel (Plata &lt; Oro &lt; Héroe).
          Lo que no ajustes usa el valor global.
        </p>
        <div className="space-y-3">
          {umbrales.map((u) => (
            <div
              key={u.clave}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
            >
              <p className="text-sm font-semibold">{u.etiqueta}</p>
              <MetricaCampoAdmin escuelaId={escuelaId} clave={u.clave} fila={u.fila} />
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
                    <MetricaCampoAdmin escuelaId={escuelaId} clave={p.min.clave} fila={p.min} />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[11px] text-muted">Máximo</p>
                    <MetricaCampoAdmin escuelaId={escuelaId} clave={p.max.clave} fila={p.max} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
