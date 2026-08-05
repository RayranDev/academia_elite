import { requireAuthContext } from "@/lib/auth/session";
import { obtenerPerfilDt, type PeriodoPerfilDt } from "@/services/dt-perfil.service";
import { PerfilDt } from "@/components/dt/PerfilDt";

export default async function PerfilDtPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { periodo: periodoParam } = await searchParams;
  const periodo: PeriodoPerfilDt = periodoParam === "todo" ? "todo" : "mes";
  const perfil = await obtenerPerfilDt(ctx, periodo);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display italic uppercase">Mi perfil</h1>
      <PerfilDt perfil={perfil} periodo={periodo} />
    </div>
  );
}
