import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarMembresiasEscuela } from "@/services/membresia.service";
import { listarArancelesEscuela } from "@/services/arancel.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { ESTADOS_MEMBRESIA, etiquetaEstado } from "@/lib/validators/membresia";
import { MembresiasPanel } from "@/components/escuela/MembresiasPanel";
import { GenerarCuotasCard } from "@/components/escuela/GenerarCuotasCard";

const FILTRO_BASE =
  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors";

/**
 * Cobranza de la escuela. El filtro por estado hace vivos los enlaces del
 * dashboard (`?estado=VENCIDA`), que hasta ahora caían al listado completo: el
 * dueño hacía clic en "12 cuotas vencidas" y tenía que buscarlas a ojo.
 */
export default async function MembresiasPage({
  searchParams,
}: {
  // Next 16: las APIs de request son asíncronas (AGENTS.md §2).
  searchParams: Promise<{ estado?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { estado } = await searchParams;
  // Solo se acepta un estado conocido: el resto se ignora en vez de devolver
  // una lista vacía y hacer creer que no hay cuotas.
  const filtro = ESTADOS_MEMBRESIA.find((e) => e === estado);

  const [membresias, jugadoresRes, aranceles] = await Promise.all([
    listarMembresiasEscuela(ctx),
    listarJugadoresGestion(ctx, { limit: 10000 }),
    listarArancelesEscuela(ctx),
  ]);

  // El filtro corre sobre el estado YA derivado, que es el que ve el usuario:
  // filtrar por el guardado dejaría fuera las vencidas que nadie marcó.
  const visibles = filtro ? membresias.filter((m) => m.estado === filtro) : membresias;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Membresías</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/escuela/aranceles"
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Precios
          </Link>
          {/* Export de cobranza (PR-5 §5.1): el listado para llamar a cobrar. */}
          <a
            href="/api/membresias-export"
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Descargar cobranza
          </a>
        </div>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Gestión de cuotas por jugador y período. Marca cada cuota como pagada o
        pendiente; <strong>vencida se calcula sola</strong> cuando el mes cierra
        sin pago. El acceso por mora se gestiona desde la ficha del jugador
        (bloqueo por pago).
      </p>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        <Link
          href="/escuela/membresias"
          aria-current={filtro ? undefined : "page"}
          className={`${FILTRO_BASE} ${
            filtro
              ? "border-subtle bg-surface-2 hover:border-brand"
              : "border-brand bg-brand/10 text-brand"
          }`}
        >
          Todas ({membresias.length})
        </Link>
        {ESTADOS_MEMBRESIA.map((e) => {
          const cuantas = membresias.filter((m) => m.estado === e).length;
          const activo = filtro === e;
          return (
            <Link
              key={e}
              href={`/escuela/membresias?estado=${e}`}
              aria-current={activo ? "page" : undefined}
              className={`${FILTRO_BASE} ${
                activo
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-subtle bg-surface-2 hover:border-brand"
              }`}
            >
              {etiquetaEstado(e)} ({cuantas})
            </Link>
          );
        })}
      </nav>

      <GenerarCuotasCard hayAranceles={aranceles.some((a) => a.activo)} />
      <MembresiasPanel
        membresias={visibles}
        jugadores={jugadoresRes.items.map((j) => ({
          id: j.id,
          nombre: `${j.apellido}, ${j.nombre}`,
        }))}
      />
    </div>
  );
}
