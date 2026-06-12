"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Medal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LogroFormModal } from "@/components/logros/LogroFormModal";
import {
  crearLogroAdminAction,
  activarLogroAdminAction,
} from "@/actions/logro.actions";
import { POSICIONES } from "@/types";
import type { LogroCatalogoDTO } from "@/services/logro.service";

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function LogrosAdmin({ logros }: { logros: LogroCatalogoDTO[] }) {
  const router = useRouter();
  const [posicion, setPosicion] = useState("");
  const [tipo, setTipo] = useState("");
  const [crear, setCrear] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtrados = useMemo(
    () =>
      logros.filter((l) => {
        if (posicion === "GENERAL" && l.posicion) return false;
        if (posicion && posicion !== "GENERAL" && l.posicion !== posicion) return false;
        if (tipo && l.tipo !== tipo) return false;
        return true;
      }),
    [logros, posicion, tipo],
  );

  function alternarActivo(l: LogroCatalogoDTO) {
    const fd = new FormData();
    fd.set("logroId", l.id);
    fd.set("activo", String(!l.activo));
    startTransition(async () => {
      const res = await activarLogroAdminAction(undefined, fd);
      if (res.ok) router.refresh();
    });
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
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={input} aria-label="Filtrar por tipo">
          <option value="">Insignias y bonus</option>
          <option value="INSIGNIA">Insignias</option>
          <option value="BONUS">Bonus</option>
        </select>
        <span className="text-xs text-muted">{filtrados.length} logros</span>
        <div className="ml-auto">
          <Button onClick={() => setCrear(true)}>+ Nuevo logro</Button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Medal} titulo="Sin logros" texto="Ningún logro coincide con los filtros." />
      ) : (
        <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
          {filtrados.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 hover:bg-surface-2/50">
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{l.nombre}</p>
                <p className="text-xs text-muted">{l.descripcion}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tono={l.posicion ? "info" : "neutral"}>{l.posicion ?? "GEN"}</Badge>
                <Badge tono={l.tipo === "BONUS" ? "oro" : "pitch"}>
                  {l.tipo === "BONUS" ? `BONUS +${l.valorBonus} ${l.statBonus}` : "INSIGNIA"}
                </Badge>
                {l.repetible && <Badge>Repetible</Badge>}
                {!l.activo && <Badge tono="alerta">Inactivo</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => alternarActivo(l)} disabled={pending}>
                {l.activo ? "Desactivar" : "Activar"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {crear && (
        <LogroFormModal
          action={crearLogroAdminAction}
          titulo="Nuevo logro (catálogo global)"
          onClose={(cambio) => {
            setCrear(false);
            if (cambio) router.refresh();
          }}
        />
      )}
    </div>
  );
}
