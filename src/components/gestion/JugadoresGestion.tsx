"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { JugadorEditarModal } from "@/components/gestion/JugadorEditarModal";
import { JugadorEstadoModal } from "@/components/gestion/JugadorEstadoModal";
import { JugadorBloqueoModal } from "@/components/gestion/JugadorBloqueoModal";
import { JugadorEliminarModal } from "@/components/gestion/JugadorEliminarModal";
import { ResetPasswordButton } from "@/components/gestion/ResetPasswordButton";
import {
  resetPasswordFamiliaAction,
  restaurarJugadorAction,
} from "@/actions/gestion.actions";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";

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
  jugadores,
  categorias,
  esSuperAdmin,
}: {
  jugadores: JugadorGestionDTO[];
  categorias: { id: string; nombre: string }[];
  esSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [estado, setEstado] = useState("");
  const [modal, setModal] = useState<{ accion: Accion; jugador: JugadorGestionDTO } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (categoriaId && j.categoriaId !== categoriaId) return false;
      if (estado && j.estado !== estado) return false;
      if (
        texto &&
        !`${j.nombre} ${j.apellido} ${j.codigoRef ?? ""}`
          .toLowerCase()
          .includes(texto)
      )
        return false;
      return true;
    });
  }, [jugadores, q, categoriaId, estado]);

  function cerrarModal(cambio: boolean) {
    setModal(null);
    if (cambio) router.refresh();
  }

  function restaurar(jugadorId: string) {
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    startTransition(async () => {
      const res = await restaurarJugadorAction(undefined, fd);
      if (res.ok) router.refresh();
    });
  }

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
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={input} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={input} aria-label="Filtrar por estado">
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
                      {j.estado === "INACTIVO" ? "Reactivar" : "Inactivar"}
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
