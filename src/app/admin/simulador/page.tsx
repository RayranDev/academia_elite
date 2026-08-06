import { requireAuthContext } from "@/lib/auth/session";
import {
  obtenerConfigSimulador,
  obtenerConfigSimuladorEscuela,
} from "@/services/parametro.service";
import { listarCatalogoFondos } from "@/services/fondo.service";
import { listarEscuelas } from "@/services/escuela.service";
import { SimuladorCarta } from "@/components/admin/SimuladorCarta";
import { SelectorSimulador } from "@/components/admin/SelectorSimulador";
import { EntrarSoporteDialog } from "@/components/admin/EntrarSoporteDialog";
import { Card } from "@/components/ui/Card";

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ escuela?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { escuela } = await searchParams;
  const escuelas = await listarEscuelas(ctx);
  const escuelaSel = escuela ? escuelas.find((e) => e.id === escuela) ?? null : null;
  // Ver los parámetros efectivos de UNA escuela puntual es acceso a datos de ese
  // tenant (mismo criterio que /admin/parametros): exige sesión de soporte
  // activa para esa escuela, si no `assertTenant` lanza ForbiddenError.
  const enSoporte = escuelaSel ? ctx.soporte?.escuelaId === escuelaSel.id : false;

  if (escuelaSel && !enSoporte) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-display italic uppercase">Simulador de carta</h1>
        <SelectorSimulador
          escuelas={escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))}
          actual={escuelaSel.id}
        />
        <Card>
          <h2 className="text-xl font-bold">Sesión de soporte requerida</h2>
          <p className="mt-2 text-sm text-muted">
            Para simular con los parámetros propios de &quot;{escuelaSel.nombre}
            &quot; abrí primero una <b>sesión de soporte</b> sobre esta escuela.
            El acceso queda auditado.
          </p>
          <div className="mt-3">
            <EntrarSoporteDialog
              escuelaId={escuelaSel.id}
              escuelaNombre={escuelaSel.nombre}
            />
          </div>
        </Card>
      </div>
    );
  }

  const [config, fondos] = await Promise.all([
    escuelaSel
      ? obtenerConfigSimuladorEscuela(ctx, escuelaSel.id)
      : obtenerConfigSimulador(ctx),
    listarCatalogoFondos(ctx),
  ]);
  const { rangosPorGrupo, pesoMen, umbrales } = config;
  const exportHref = escuelaSel
    ? `/api/plantilla-simulador?escuela=${escuelaSel.id}`
    : "/api/plantilla-simulador";

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Simulador de carta</h1>
      <p className="max-w-2xl text-sm text-muted">
        Mueve las medidas y mira la carta en vivo con el mismo motor que usan
        las evaluaciones reales. Sirve para saber qué marcas necesita un
        jugador para alcanzar cada nivel.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorSimulador
          escuelas={escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))}
          actual={escuelaSel?.id ?? "GLOBAL"}
        />
        <a
          href={exportHref}
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Descargar planilla con fórmulas
        </a>
      </div>
      {escuelaSel && (
        <p className="text-xs text-muted">
          Usando los parámetros efectivos de <b>{escuelaSel.nombre}</b> (sus
          ajustes propios sobre el global). El peso de MEN se mantiene global.
        </p>
      )}

      <SimuladorCarta rangosPorGrupo={rangosPorGrupo} pesoMen={pesoMen} umbrales={umbrales} fondos={fondos} />
    </div>
  );
}
