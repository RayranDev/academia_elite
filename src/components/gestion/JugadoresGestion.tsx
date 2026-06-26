"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { JugadorEditarModal } from "@/components/gestion/JugadorEditarModal";
import { JugadorEstadoModal } from "@/components/gestion/JugadorEstadoModal";
import { JugadorBloqueoModal } from "@/components/gestion/JugadorBloqueoModal";
import { JugadorEliminarModal } from "@/components/gestion/JugadorEliminarModal";
import { ResetPasswordButton } from "@/components/gestion/ResetPasswordButton";
import { Paginacion } from "@/components/ui/Paginacion";
import {
  resetPasswordFamiliaAction,
  restaurarJugadorAction,
} from "@/actions/gestion.actions";
import type { PaginatedJugadoresDTO, JugadorGestionDTO } from "@/services/gestion-jugadores.service";

type Accion = "editar" | "estado" | "bloqueo" | "eliminar";

const TONO_ESTADO: Record<string, "pitch" | "neutral" | "alerta" | "info"> = {
  ACTIVO: "pitch",
  PENDIENTE: "info",
  INACTIVO: "neutral",
  ELIMINADO: "alerta",
};

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function JugadoresGestion({
  res,
  categorias,
  esSuperAdmin,
}: {
  res: PaginatedJugadoresDTO;
  categorias: { id: string; nombre: string }[];
  esSuperAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [categoriaId, setCategoriaId] = useState(searchParams.get("categoriaId") ?? "");
  const [estado, setEstado] = useState(searchParams.get("estado") ?? "");
  const [modal, setModal] = useState<{ accion: Accion; jugador: JugadorGestionDTO } | null>(null);
  const [pending, startTransition] = useTransition();

  // Sincronizar estados locales si la URL cambia (por ejemplo al borrar filtros)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams.get("q") ?? "");
    setCategoriaId(searchParams.get("categoriaId") ?? "");
    setEstado(searchParams.get("estado") ?? "");
  }, [searchParams]);

  // Debounce para búsqueda por texto
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const query = q.trim();
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      params.set("page", "1"); // Volver a la página 1 cuando cambia la búsqueda
      router.push(`${pathname}?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
  }, [q, pathname, router, searchParams]);

  function cambiarFiltro(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Volver a la página 1 cuando cambian los filtros
    router.push(`${pathname}?${params.toString()}`);

    if (key === "categoriaId") setCategoriaId(value);
    if (key === "estado") setEstado(value);
  }

  function cerrarModal(cambio: boolean) {
    setModal(null);
    if (cambio) router.refresh();
  }

  function restaurar(jugadorId: string) {
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    startTransition(async () => {
      const result = await restaurarJugadorAction(undefined, fd);
      if (result.ok) router.refresh();
    });
  }

  const filtrados = res.items;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar jugador"
            className={`${input} pl-8`}
          />
        </div>
        <select
          value={categoriaId}
          onChange={(e) => cambiarFiltro("categoriaId", e.target.value)}
          className={input}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => cambiarFiltro("estado", e.target.value)}
          className={input}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="INACTIVO">Inactivo</option>
          {esSuperAdmin && <option value="ELIMINADO">Eliminado</option>}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Users} titulo="Sin jugadores" texto="Ningún jugador coincide con la búsqueda o filtros." />
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
            {filtrados.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-3 p-3 hover:bg-surface-2/50">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">
                    {j.nombre} {j.apellido}
                    {j.dorsal != null && <span className="text-muted"> · #{j.dorsal}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {j.categoriaNombre} · {j.posicion}
                    {j.codigoRef && (
                      <>
                        {" · "}
                        <span className="select-all font-mono text-foreground/80">
                          {j.codigoRef}
                        </span>
                      </>
                    )}
                    {j.familiaEmail ? (
                      <> · {j.familiaEmail}</>
                    ) : (
                      j.codigoJugador && (
                        <>
                          {" "}
                          · sin familia · código{" "}
                          <span className="select-all font-mono font-semibold text-foreground">
                            {j.codigoJugador}
                          </span>
                        </>
                      )
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tono={TONO_ESTADO[j.estado] ?? "neutral"}>{j.estado}</Badge>
                  {j.bloqueado && <Badge tono="alerta">Bloqueado</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {j.estado === "ELIMINADO" ? (
                    esSuperAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => restaurar(j.id)} disabled={pending}>
                        Restaurar
                      </Button>
                    )
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ accion: "editar", jugador: j })}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ accion: "estado", jugador: j })}>
                        Estado
                      </Button>
                      {j.familiaEmail && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setModal({ accion: "bloqueo", jugador: j })}>
                            {j.bloqueado ? "Desbloquear" : "Bloquear"}
                          </Button>
                          <ResetPasswordButton
                            action={resetPasswordFamiliaAction}
                            campos={{ jugadorId: j.id }}
                            destinatario={`la familia de ${j.nombre} ${j.apellido}`}
                          />
                        </>
                      )}
                      {esSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-alerta hover:text-alerta"
                          onClick={() => setModal({ accion: "eliminar", jugador: j })}
                        >
                          Eliminar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Paginacion page={res.page} totalPages={res.totalPages} totalItems={res.total} />
        </div>
      )}

      {modal?.accion === "editar" && (
        <JugadorEditarModal jugador={modal.jugador} categorias={categorias} onClose={cerrarModal} />
      )}
      {modal?.accion === "estado" && (
        <JugadorEstadoModal jugador={modal.jugador} onClose={cerrarModal} />
      )}
      {modal?.accion === "bloqueo" && (
        <JugadorBloqueoModal jugador={modal.jugador} onClose={cerrarModal} />
      )}
      {modal?.accion === "eliminar" && (
        <JugadorEliminarModal jugador={modal.jugador} onClose={cerrarModal} />
      )}
    </div>
  );
}
