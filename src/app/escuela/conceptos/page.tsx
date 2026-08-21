import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarConceptosConUso } from "@/services/concepto-cobro.service";
import { ConceptosPanel } from "@/components/escuela/ConceptosPanel";

export default async function ConceptosPage() {
  const ctx = await requireAuthContext();
  const conceptos = await listarConceptosConUso(ctx);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Conceptos de cobro</h1>
        <Link
          href="/escuela/aranceles"
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Precios
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Qué cobra tu escuela. Los que trae la plataforma se pueden renombrar (si
        a la mensualidad le dices <strong>pensión</strong>, ponle pensión), pero
        no se archivan. Los que crees tú se archivan cuando dejas de usarlos;
        borrarlos solo es posible mientras no tengan cuotas ni precios cargados,
        porque si no queda historial de cobranza sin dueño.
      </p>
      <ConceptosPanel conceptos={conceptos} />
    </div>
  );
}
