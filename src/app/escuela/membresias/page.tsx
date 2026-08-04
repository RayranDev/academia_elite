import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import {
  listarMembresiasEscuela,
  contarMembresiasPorPestana,
} from "@/services/membresia.service";
import { listarArancelesEscuela } from "@/services/arancel.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { ESTADOS_MEMBRESIA, etiquetaEstado } from "@/lib/validators/membresia";
import { MembresiasPanel } from "@/components/escuela/MembresiasPanel";
import { GenerarCuotasCard } from "@/components/escuela/GenerarCuotasCard";
import { FiltroJugadorMembresias } from "@/components/escuela/FiltroJugadorMembresias";
import { Paginacion } from "@/components/ui/Paginacion";

const FILTRO_BASE =
  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors";

const PERIODO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Arma el querystring de las pestañas de estado: preserva período/jugador, resetea page. */
function hrefPestana(
  estado: string | undefined,
  periodo: string | undefined,
  jugadorId: string | undefined,
): string {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (periodo) params.set("periodo", periodo);
  if (jugadorId) params.set("jugadorId", jugadorId);
  const qs = params.toString();
  return qs ? `/escuela/membresias?${qs}` : "/escuela/membresias";
}

/**
 * Cobranza de la escuela. El filtro por estado hace vivos los enlaces del
 * dashboard (`?estado=VENCIDA`), que hasta ahora caían al listado completo: el
 * dueño hacía clic en "12 cuotas vencidas" y tenía que buscarlas a ojo.
 */
export default async function MembresiasPage({
  searchParams,
}: {
  // Next 16: las APIs de request son asíncronas (AGENTS.md §2).
  searchParams: Promise<{
    estado?: string;
    periodo?: string;
    jugadorId?: string;
    page?: string;
  }>;
}) {
  const ctx = await requireAuthContext();
  const { estado, periodo: periodoParam, jugadorId, page: pageStr } = await searchParams;
  // Solo se acepta un estado conocido: el resto se ignora en vez de devolver
  // una lista vacía y hacer creer que no hay cuotas.
  const filtro = ESTADOS_MEMBRESIA.find((e) => e === estado);
  // Mismo criterio defensivo que `periodoSchema`: si no matchea AAAA-MM, se
  // ignora en vez de mandarlo crudo a la base.
  const periodo = periodoParam && PERIODO_REGEX.test(periodoParam) ? periodoParam : undefined;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const [res, contadores, jugadoresRes, aranceles] = await Promise.all([
    listarMembresiasEscuela(ctx, { periodo, jugadorId, estado: filtro, page, limit: 20 }),
    contarMembresiasPorPestana(ctx, { periodo, jugadorId }),
    listarJugadoresGestion(ctx, { limit: 10000 }),
    listarArancelesEscuela(ctx),
  ]);

  const jugadoresParaFiltro = jugadoresRes.items.map((j) => ({
    id: j.id,
    nombre: `${j.apellido}, ${j.nombre}`,
  }));

  // Filtros activos, para el link de descarga y el form de período.
  const exportParams = new URLSearchParams();
  if (filtro) exportParams.set("estado", filtro);
  if (periodo) exportParams.set("periodo", periodo);
  const exportHref = `/api/membresias-export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

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
          {/* Export de cobranza (PR-5 §5.1): el listado para llamar a cobrar,
              con el mismo filtro de estado/período que está activo en la lista. */}
          <a
            href={exportHref}
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
          href={hrefPestana(undefined, periodo, jugadorId)}
          aria-current={filtro ? undefined : "page"}
          className={`${FILTRO_BASE} ${
            filtro
              ? "border-subtle bg-surface-2 hover:border-brand"
              : "border-brand bg-brand/10 text-brand"
          }`}
        >
          Todas ({contadores.todas})
        </Link>
        {ESTADOS_MEMBRESIA.map((e) => {
          const activo = filtro === e;
          return (
            <Link
              key={e}
              href={hrefPestana(e, periodo, jugadorId)}
              aria-current={activo ? "page" : undefined}
              className={`${FILTRO_BASE} ${
                activo
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-subtle bg-surface-2 hover:border-brand"
              }`}
            >
              {etiquetaEstado(e)} ({contadores[e]})
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-end gap-3">
        {/* Filtro de período: form GET nativo, sin JS — navega a la misma ruta
            con `?periodo=`. Preserva estado/jugador vía inputs ocultos. */}
        <form
          action="/escuela/membresias"
          method="get"
          className="flex items-end gap-2"
        >
          {filtro && <input type="hidden" name="estado" value={filtro} />}
          {jugadorId && <input type="hidden" name="jugadorId" value={jugadorId} />}
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="periodo-filtro">
              Período
            </label>
            <input
              id="periodo-filtro"
              name="periodo"
              type="month"
              defaultValue={periodo}
              className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Filtrar
          </button>
          {periodo && (
            <Link
              href={hrefPestana(filtro, undefined, jugadorId)}
              className="px-2 py-2 text-xs text-muted hover:text-foreground"
            >
              Quitar período
            </Link>
          )}
        </form>

        <div>
          <label className="mb-1 block text-xs text-muted">Jugador</label>
          <FiltroJugadorMembresias
            jugadores={jugadoresParaFiltro}
            jugadorIdActual={jugadorId}
          />
        </div>
      </div>

      <GenerarCuotasCard hayAranceles={aranceles.some((a) => a.activo)} />
      <MembresiasPanel membresias={res.items} jugadores={jugadoresParaFiltro} />
      <Paginacion page={res.page} totalPages={res.totalPages} totalItems={res.total} />
    </div>
  );
}
