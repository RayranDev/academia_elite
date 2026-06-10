import { requirePanelUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/PanelShell";
import { Card } from "@/components/ui/Card";

export default async function AdminPage() {
  const user = await requirePanelUser("SUPER_ADMIN");
  return (
    <PanelShell rol="SUPER_ADMIN" nombre={user.nombre}>
      <h1 className="mb-4 text-3xl font-black italic uppercase">
        Panel Súper Admin
      </h1>
      <Card>
        <p className="text-muted">
          Aquí vivirán el pipeline de leads, escuelas, parámetros de fórmula y
          el explorador de auditoría (Sprint 2).
        </p>
      </Card>
    </PanelShell>
  );
}
