import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarAuditoria } from "@/services/audit.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/** Valor de un query param que puede venir repetido; toma el primero no vacío. */
function primerValor(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : undefined;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  // Next 16: searchParams es asíncrono.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;

  const accion = primerValor(sp.accion);
  const entidad = primerValor(sp.entidad);
  const actor = primerValor(sp.actor);
  const desde = primerValor(sp.desde);
  const hasta = primerValor(sp.hasta);
  const pagina = Math.max(1, Number(primerValor(sp.pagina) ?? "1") || 1);

  const {
    registros,
    total,
    totalPaginas,
    pagina: paginaActual,
    facetas,
  } = await listarAuditoria(ctx, {
    accion,
    entidad,
    actorRol: actor,
    desde,
    hasta,
    pagina,
  });

  // Construye el href de una página conservando los filtros activos.
  function hrefPagina(p: number): string {
    const params = new URLSearchParams();
    if (accion) params.set("accion", accion);
    if (entidad) params.set("entidad", entidad);
    if (actor) params.set("actor", actor);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    params.set("pagina", String(p));
    return `/admin/auditoria?${params.toString()}`;
  }

  const hayFiltros = Boolean(accion || entidad || actor || desde || hasta);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Auditoría</h1>
        <a
          href="/api/auditoria-export"
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Descargar Excel
        </a>
      </div>
      <p className="text-sm text-muted">
        Registro append-only de acciones sensibles ({total} en total
        {hayFiltros ? " con los filtros aplicados" : ""}).
      </p>

      {/* Filtros: form GET (funciona sin JS). Al enviar vuelve a la página 1. */}
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <FiltroSelect
            nombre="entidad"
            etiqueta="Entidad"
            valor={entidad}
            opciones={facetas.entidades}
          />
          <FiltroSelect
            nombre="accion"
            etiqueta="Acción"
            valor={accion}
            opciones={facetas.acciones}
          />
          <FiltroSelect
            nombre="actor"
            etiqueta="Actor (rol)"
            valor={actor}
            opciones={facetas.roles}
          />
          <FiltroFecha nombre="desde" etiqueta="Desde" valor={desde} />
          <FiltroFecha nombre="hasta" etiqueta="Hasta" valor={hasta} />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href="/admin/auditoria"
                className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        {registros.length === 0 ? (
          <p className="p-6 text-muted">
            {hayFiltros
              ? "No hay registros para esos filtros."
              : "Sin registros todavía."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-subtle/50">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    {new Date(r.createdAt).toLocaleString("es")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono="info">{r.accion}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {r.entidad}
                    <span className="block font-mono text-[10px]">
                      {r.entidadId}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted">{r.actorRol}</td>
                  <td className="px-4 py-2 text-foreground/80">{r.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <PaginaLink
            href={hrefPagina(paginaActual - 1)}
            habilitado={paginaActual > 1}
          >
            ← Anterior
          </PaginaLink>
          <span className="text-xs text-muted">
            Página {paginaActual} de {totalPaginas}
          </span>
          <PaginaLink
            href={hrefPagina(paginaActual + 1)}
            habilitado={paginaActual < totalPaginas}
          >
            Siguiente →
          </PaginaLink>
        </div>
      )}
    </div>
  );
}

function FiltroSelect({
  nombre,
  etiqueta,
  valor,
  opciones,
}: {
  nombre: string;
  etiqueta: string;
  valor?: string;
  opciones: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {etiqueta}
      <select
        name={nombre}
        defaultValue={valor ?? ""}
        className="min-w-40 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      >
        <option value="">Todas</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function FiltroFecha({
  nombre,
  etiqueta,
  valor,
}: {
  nombre: string;
  etiqueta: string;
  valor?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {etiqueta}
      <input
        type="date"
        name={nombre}
        defaultValue={valor ?? ""}
        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />
    </label>
  );
}

function PaginaLink({
  href,
  habilitado,
  children,
}: {
  href: string;
  habilitado: boolean;
  children: React.ReactNode;
}) {
  if (!habilitado) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold hover:border-brand"
    >
      {children}
    </Link>
  );
}
