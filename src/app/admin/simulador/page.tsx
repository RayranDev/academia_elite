import { requireAuthContext } from "@/lib/auth/session";
import { obtenerConfigSimulador } from "@/services/parametro.service";
import { SimuladorCarta } from "@/components/admin/SimuladorCarta";

export default async function SimuladorPage() {
  const ctx = await requireAuthContext();
  const { rangosPorGrupo, pesoMen } = await obtenerConfigSimulador(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Simulador de carta</h1>
      <p className="max-w-2xl text-sm text-muted">
        Mueve las medidas y mira la carta en vivo con el mismo motor que usan
        las evaluaciones reales. Sirve para saber qué marcas necesita un
        jugador para alcanzar cada nivel.
      </p>
      <SimuladorCarta rangosPorGrupo={rangosPorGrupo} pesoMen={pesoMen} />
    </div>
  );
}
