import { requirePanelUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/PanelShell";
import { Card } from "@/components/ui/Card";

export default async function EscuelaPage() {
  const user = await requirePanelUser("ESCUELA_ADMIN");
  return (
    <PanelShell rol="ESCUELA_ADMIN" nombre={user.nombre}>
      <h1 className="mb-4 text-3xl font-black italic uppercase">
        Panel de Escuela
      </h1>
      <Card>
        <p className="text-muted">
          Aquí vivirán categorías, sedes/canchas, DTs, códigos de invitación,
          branding y anuncios (Sprint 3).
        </p>
      </Card>
    </PanelShell>
  );
}
