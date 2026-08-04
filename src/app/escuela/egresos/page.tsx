import { requireAuthContext } from "@/lib/auth/session";
import {
  listarEgresosEscuela,
  resumenCaja,
  primerDiaMesSiguiente,
} from "@/services/egreso.service";
import { periodoDe } from "@/lib/cobranza";
import { EgresosPanel } from "@/components/escuela/EgresosPanel";

/** Egresos / caja de la escuela: gastos operativos y el neto contra la cobranza. */
export default async function EgresosPage({
  searchParams,
}: {
  // Next 16: las APIs de request son asíncronas (AGENTS.md §2).
  searchParams: Promise<{ mes?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { mes } = await searchParams;
  const periodo = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : periodoDe(new Date());

  const desde = new Date(`${periodo}-01T00:00:00.000Z`);
  const hasta = primerDiaMesSiguiente(desde);

  const [egresos, resumen] = await Promise.all([
    listarEgresosEscuela(ctx, { desde, hasta }),
    resumenCaja(ctx, periodo),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Egresos</h1>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Gastos operativos de la escuela (cancha, árbitro, sueldos, ...) del mes en
        curso. La caja neta compara estos egresos contra la cobranza pagada del
        mismo período.
      </p>

      <EgresosPanel egresos={egresos} resumen={resumen} />
    </div>
  );
}
