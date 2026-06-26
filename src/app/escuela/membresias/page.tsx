import { requireAuthContext } from "@/lib/auth/session";
import { listarMembresiasEscuela } from "@/services/membresia.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { MembresiasPanel } from "@/components/escuela/MembresiasPanel";

export default async function MembresiasPage() {
  const ctx = await requireAuthContext();
  const [membresias, jugadoresRes] = await Promise.all([
    listarMembresiasEscuela(ctx),
    listarJugadoresGestion(ctx, { limit: 10000 }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Membresías</h1>
      <p className="max-w-2xl text-sm text-muted">
        Gestión de cuotas por jugador y período. Marca cada cuota como pagada,
        pendiente o vencida. El acceso por mora se gestiona desde la ficha del
        jugador (bloqueo por pago).
      </p>
      <MembresiasPanel
        membresias={membresias}
        jugadores={jugadoresRes.items.map((j) => ({
          id: j.id,
          nombre: `${j.apellido}, ${j.nombre}`,
        }))}
      />
    </div>
  );
}
