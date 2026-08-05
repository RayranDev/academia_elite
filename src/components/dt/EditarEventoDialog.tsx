"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { editarEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Franjas de 15 minutos, igual que el `step` que tenían los datetime-local viejos. */
const MINUTOS = [0, 15, 30, 45] as const;
const HORAS_DIA = Array.from({ length: 24 }, (_, h) => h);
const HORAS_DURACION = Array.from({ length: 7 }, (_, h) => h);
const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Convierte un ISO a valor de <input type="date"> en hora LOCAL del navegador. */
function paraInputFecha(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function EditarEventoDialog({
  evento,
  canchas,
}: {
  evento: {
    id: string;
    tipo: string;
    titulo: string;
    canchaId: string | null;
    rival: string | null;
    esLocal: boolean | null;
    inicio: string;
    fin: string;
    notas: string | null;
  };
  canchas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Precarga: separa el ISO guardado en sus componentes locales (fecha, hora
  // de inicio, duración) para poblar los selects, con getters LOCALES del
  // navegador (no UTC). Se calcula recién al abrir el diálogo (`abrir()`),
  // nunca en un lazy initializer de `useState`: ese initializer también corre
  // en el server durante el SSR de este client component, y `new Date(iso)`
  // en la zona del server (UTC) daría una hora distinta a la del DT — mismo
  // riesgo de hidratación que describe AGENTS.md §6 para `FechaLocal`.
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState(0);
  const [minutoInicio, setMinutoInicio] = useState(0);
  const [horasDuracion, setHorasDuracion] = useState(0);
  const [minutosDuracion, setMinutosDuracion] = useState(0);

  function abrir() {
    setFecha(paraInputFecha(evento.inicio));
    setHoraInicio(new Date(evento.inicio).getHours());
    setMinutoInicio(new Date(evento.inicio).getMinutes());
    const totalMin = Math.round(
      (new Date(evento.fin).getTime() - new Date(evento.inicio).getTime()) /
        60_000,
    );
    setHorasDuracion(Math.floor(totalMin / 60));
    setMinutosDuracion(totalMin % 60);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const duracionTotalMin = horasDuracion * 60 + minutosDuracion;
    if (duracionTotalMin < 15) {
      setError("La duración mínima es de 15 minutos.");
      return;
    }
    const [anio, mes, dia] = fecha.split("-").map(Number);
    if (!anio || !mes || !dia) {
      setError("Elige una fecha.");
      return;
    }
    // Construido con getters/constructor LOCALES: un <input type="date">
    // parseado con `new Date(string)` se interpreta como UTC medianoche y
    // corre el día en la zona de Colombia.
    const inicio = new Date(anio, mes - 1, dia, horaInicio, minutoInicio, 0);
    const fin = new Date(inicio.getTime() + duracionTotalMin * 60_000);

    const fd = new FormData(e.currentTarget);
    fd.set("inicio", inicio.toISOString());
    fd.set("fin", fin.toISOString());
    startTransition(async () => {
      const res = await editarEventoAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={abrir}>
        Editar
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar evento">
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="eventoId" value={evento.id} />

          <div>
            <label className="mb-1 block text-xs text-muted">Título</label>
            <input name="titulo" required defaultValue={evento.titulo} className={input} />
          </div>

          {canchas.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Cancha (opcional)</label>
              <select name="canchaId" defaultValue={evento.canchaId ?? ""} className={input}>
                <option value="">Sin cancha</option>
                {canchas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Fecha</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={input}
                aria-label="Fecha"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Hora de inicio</label>
              <div className="flex gap-1">
                <select
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(Number(e.target.value))}
                  className={input}
                  aria-label="Hora de inicio"
                >
                  {HORAS_DIA.map((h) => (
                    <option key={h} value={h}>
                      {dosDigitos(h)}
                    </option>
                  ))}
                </select>
                <select
                  value={minutoInicio}
                  onChange={(e) => setMinutoInicio(Number(e.target.value))}
                  className={input}
                  aria-label="Minuto de inicio"
                >
                  {MINUTOS.map((m) => (
                    <option key={m} value={m}>
                      {dosDigitos(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Duración (horas)</label>
              <select
                value={horasDuracion}
                onChange={(e) => setHorasDuracion(Number(e.target.value))}
                className={input}
                aria-label="Duración en horas"
              >
                {HORAS_DURACION.map((h) => (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Duración (min)</label>
              <select
                value={minutosDuracion}
                onChange={(e) => setMinutosDuracion(Number(e.target.value))}
                className={input}
                aria-label="Duración en minutos"
              >
                {MINUTOS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {evento.tipo === "PARTIDO" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Rival</label>
                <input name="rival" defaultValue={evento.rival ?? ""} className={input} />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  name="esLocal"
                  defaultChecked={evento.esLocal ?? false}
                  className="accent-[color:var(--brand)]"
                />
                Local
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Notas</label>
            <textarea name="notas" rows={2} defaultValue={evento.notas ?? ""} className={input} />
          </div>

          {error && <p className="text-sm text-alerta">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
