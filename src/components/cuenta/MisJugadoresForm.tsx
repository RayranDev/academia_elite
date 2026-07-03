"use client";

import { useState, useTransition, type FormEvent } from "react";
import { actualizarMiJugadorAction } from "@/actions/cuenta.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

type MiJugador = { id: string; nombre: string; apellido: string };
type Aviso = { ok: boolean; texto: string } | null;

/**
 * Corrección de la identidad (nombre/apellido) de los jugadores vinculados al
 * tutor. Lo deportivo (posición, categoría, dorsal) lo gestiona el DT, no acá.
 */
export function MisJugadoresForm({ jugadores }: { jugadores: MiJugador[] }) {
  if (jugadores.length === 0) return null;
  return (
    <Card className="max-w-md space-y-4">
      <div>
        <h2 className="text-lg font-bold">Datos del jugador</h2>
        <p className="text-xs text-muted">
          Corregí el nombre o el apellido. La posición y la categoría las gestiona
          el entrenador.
        </p>
      </div>
      {jugadores.map((j, i) => (
        <EditarJugador key={j.id} jugador={j} conBorde={i > 0} />
      ))}
    </Card>
  );
}

function EditarJugador({
  jugador,
  conBorde,
}: {
  jugador: MiJugador;
  conBorde: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [nombre, setNombre] = useState(jugador.nombre);
  const [apellido, setApellido] = useState(jugador.apellido);
  const [msg, setMsg] = useState<Aviso>(null);

  function guardar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    fd.set("jugadorId", jugador.id);
    fd.set("nombre", nombre);
    fd.set("apellido", apellido);
    startTransition(async () => {
      const res = await actualizarMiJugadorAction(undefined, fd);
      setMsg(
        res.ok
          ? { ok: true, texto: "Datos actualizados." }
          : { ok: false, texto: res.error },
      );
    });
  }

  return (
    <form
      onSubmit={guardar}
      className={conBorde ? "space-y-2 border-t border-subtle pt-3" : "space-y-2"}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Apellido</label>
          <input
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className={input}
          />
        </div>
      </div>
      {msg && (
        <p
          className={`text-sm ${msg.ok ? "text-brand" : "text-alerta"}`}
          role="alert"
        >
          {msg.texto}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
