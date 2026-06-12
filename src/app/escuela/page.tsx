import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarSedesEscuela } from "@/services/sede.service";
import { listarDts } from "@/services/entrenador.service";
import { listarCodigosEscuela } from "@/services/codigo.service";
import { Card } from "@/components/ui/Card";

export default async function EscuelaResumenPage() {
  const ctx = await requireAuthContext();
  const [categorias, sedes, dts, codigos] = await Promise.all([
    listarCategoriasEscuela(ctx),
    listarSedesEscuela(ctx),
    listarDts(ctx),
    listarCodigosEscuela(ctx),
  ]);

  const codigosVigentes = codigos.filter((c) => c.vigente).length;
  const canchas = sedes.reduce((n, s) => n + s.canchas.length, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black italic uppercase">Resumen</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile titulo="Categorías" valor={categorias.length} href="/escuela/categorias" />
        <Tile titulo="DTs" valor={dts.length} href="/escuela/dts" />
        <Tile titulo="Sedes / canchas" valor={`${sedes.length} / ${canchas}`} href="/escuela/sedes" />
        <Tile titulo="Códigos vigentes" valor={codigosVigentes} href="/escuela/codigos" />
      </div>

      <Card>
        <p className="text-muted">
          Bienvenido. Configura tu escuela: crea <b>categorías</b>, registra a
          tus <b>DTs</b>, genera <b>códigos de invitación</b> para las familias y
          personaliza tu <b>branding</b>. Cuando tengas categorías y DTs, ellos
          podrán dar de alta jugadores y evaluarlos.
        </p>
      </Card>
    </div>
  );
}

function Tile({
  titulo,
  valor,
  href,
}: {
  titulo: string;
  valor: number | string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-brand/50">
        <div className="text-3xl font-black tabular">{valor}</div>
        <div className="mt-1 text-sm text-muted">{titulo}</div>
      </Card>
    </Link>
  );
}
