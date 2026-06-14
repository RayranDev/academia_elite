import { requireAuthContext } from "@/lib/auth/session";
import {
  obtenerConfigSimulador,
  obtenerConfigSimuladorEscuela,
} from "@/services/parametro.service";
import { listarCatalogoFondos } from "@/services/fondo.service";
import { listarEscuelas } from "@/services/escuela.service";
import { SimuladorCarta } from "@/components/admin/SimuladorCarta";
import { SelectorSimulador } from "@/components/admin/SelectorSimulador";

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ escuela?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { escuela } = await searchParams;
  const escuelas = await listarEscuelas(ctx);
  const escuelaSel = escuela ? escuelas.find((e) => e.id === escuela) ?? null : null;

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
