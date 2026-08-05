import { requireAuthContext } from "@/lib/auth/session";
import {
  listarDescuentoReglasEscuela,
  listarJugadoresAsignadosRegla,
} from "@/services/descuento.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { DescuentosPanel } from "@/components/escuela/DescuentosPanel";

export default async function DescuentosPage() {
  const ctx = await requireAuthContext();
  const [reglas, categorias, jugadoresRes] = await Promise.all([
    listarDescuentoReglasEscuela(ctx),
    listarCategoriasEscuela(ctx),
    // Límite alto: asume que ninguna escuela supera 5000 jugadores activos
    // (mismo criterio que `listarMorosos` en gestion-jugadores.service.ts).
    listarJugadoresGestion(ctx, { estado: "ACTIVO", limit: 5000 }),
  ]);

  // Jugadores ya asignados por regla, para precargar el checklist del modal
  // de asignación sin un fetch on-demand al abrirlo.
  const asignacionesPorRegla: Record<string, string[]> = {};
  await Promise.all(
    reglas.map(async (r) => {
      asignacionesPorRegla[r.id] = await listarJugadoresAsignadosRegla(ctx, r.id);
    }),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Descuentos</h1>
      <p className="max-w-2xl text-sm text-muted">
        Reglas de descuento reusables por categoría (Hermano, Beca…) que se
        aplican solas al generar la cobranza del mes. Si un jugador califica
        para más de una regla, se aplica la de mayor descuento — no se
        combinan.
      </p>
      <DescuentosPanel
        reglas={reglas}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        jugadores={jugadoresRes.items.map((j) => ({
          id: j.id,
          nombre: j.nombre,
          apellido: j.apellido,
          categoriaId: j.categoriaId,
        }))}
        asignacionesPorRegla={asignacionesPorRegla}
      />
    </div>
  );
}
