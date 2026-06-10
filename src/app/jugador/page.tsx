import { requirePanelUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/PanelShell";
import { Card } from "@/components/ui/Card";

export default async function JugadorPage() {
  const user = await requirePanelUser("JUGADOR");
  return (
    <PanelShell rol="JUGADOR" nombre={user.nombre}>
      <h1 className="mb-4 text-3xl font-black italic uppercase">Mi carrera</h1>
      <Card>
        <p className="text-muted">
          Aquí vivirá el hub estilo Modo Carrera FC26: carta hero, próximos
          partidos, noticias del club, objetivos y evolución (Sprint 5 y 6).
        </p>
      </Card>
    </PanelShell>
  );
}
