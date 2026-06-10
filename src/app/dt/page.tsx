import { requirePanelUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/PanelShell";
import { Card } from "@/components/ui/Card";

export default async function DtPage() {
  const user = await requirePanelUser("DT");
  return (
    <PanelShell rol="DT" nombre={user.nombre}>
      <h1 className="mb-4 text-3xl font-black italic uppercase">Panel DT</h1>
      <Card>
        <p className="text-muted">
          Aquí vivirán la plantilla con mini-cartas, solicitudes, el formulario
          de evaluación (4+4+4) y el calendario (Sprint 4 y 6).
        </p>
      </Card>
    </PanelShell>
  );
}
