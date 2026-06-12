"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Medal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LogroFormModal } from "@/components/logros/LogroFormModal";
import { LogroVentanaModal } from "@/components/logros/LogroVentanaModal";
import {
  LogroOtorgarModal,
  type JugadorOtorgable,
} from "@/components/logros/LogroOtorgarModal";
import { crearLogroDtAction } from "@/actions/logro.actions";
import { POSICIONES } from "@/types";
import type { LogroCatalogoDTO } from "@/services/logro.service";

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

type ModalDt =
  | { tipo: "crear" }
  | { tipo: "ventana"; logro: LogroCatalogoDTO }
  | { tipo: "otorgar"; logro: LogroCatalogoDTO };

export function LogrosDt({
  logros,
  jugadores,
}: {
  logros: LogroCatalogoDTO[];
  jugadores: JugadorOtorgable[];
}) {
  const router = useRouter();
  const [posicion, setPosicion] = useState("");
  const [modal, setModal] = useState<ModalDt | null>(null);

  const filtrados = useMemo(
    () =>
      logros.filter((l) => {
        if (!l.activo) return false; // desactivados del catálogo global no aplican
        if (posicion === "GENERAL" && l.posicion) return false;
        if (posicion && posicion !== "GENERAL" && l.posicion !== posicion) return false;
        return true;
      }),
    [logros, posicion],
  );

  function cerrar(cambio: boolean) {
    setModal(null);
    if (cambio) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={posicion} onChange={(e) => setPosicion(e.target.value)} className={input} aria-label="Filtrar por posición">
          <option value="">Todas las posiciones</option>
          <option value="GENERAL">Generales</option>
          {POSICIONES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-xs text-muted">{filtrados.length} logros</span>
        <div className="ml-auto">
          <Button onClick={() => setModal({ tipo: "crear" })}>+ Logro propio</Button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Medal} titulo="Sin logros" texto="No hay logros para este filtro." />
      ) : (
        <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
          {filtrados.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 hover:bg-surface-2/50">
              <div className="min-w-48 flex-1">
                <p className="font-semibold">
                  {l.nombre}
                  {l.esPropio && <Badge className="ml-2">Propio</Badge>}
                </p>
                <p className="text-xs text-muted">{l.descripcion}</p>
                {(l.desde || l.hasta) && (
                  <p className="mt-0.5 text-xs text-info">
                    Ventana: {l.desde ? l.desde.slice(0, 10) : "…"} → {l.hasta ? l.hasta.slice(0, 10) : "…"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tono={l.posicion ? "info" : "neutral"}>{l.posicion ?? "GEN"}</Badge>
                <Badge tono={l.tipo === "BONUS" ? "oro" : "pitch"}>
                  {l.tipo === "BONUS" ? `BONUS +${l.valorBonus} ${l.statBonus}` : "INSIGNIA"}
                </Badge>
                {l.disponibleAhora ? (
                  <Badge tono="pitch">Disponible</Badge>
                ) : (
                  <Badge tono="alerta">No disponible</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: "ventana", logro: l })}>
                  Programar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!l.disponibleAhora}
                  onClick={() => setModal({ tipo: "otorgar", logro: l })}
                >
                  Otorgar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal?.tipo === "crear" && (
        <LogroFormModal action={crearLogroDtAction} titulo="Logro propio de la escuela" onClose={cerrar} />
      )}
      {modal?.tipo === "ventana" && <LogroVentanaModal logro={modal.logro} onClose={cerrar} />}
      {modal?.tipo === "otorgar" && (
        <LogroOtorgarModal logro={modal.logro} jugadores={jugadores} onClose={cerrar} />
      )}
    </div>
  );
}
