"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TIPOS_EVENTO } from "@/types";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Franjas de 15 minutos, igual que el `step` que tenían los datetime-local viejos. */
const MINUTOS = [0, 15, 30, 45] as const;
const HORAS_DIA = Array.from({ length: 24 }, (_, h) => h);
const HORAS_DURACION = Array.from({ length: 7 }, (_, h) => h);
const dosDigitos = (n: number) => String(n).padStart(2, "0");

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  categoriaId: string;
}

export function CrearEventoDialog({
  categorias,
  jugadores,
  canchas,
}: {
  categorias: { id: string; nombre: string }[];
  jugadores: Jugador[];
  canchas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("ENTRENAMIENTO");
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState(16);
  const [minutoInicio, setMinutoInicio] = useState(0);
  const [horasDuracion, setHorasDuracion] = useState(1);
  const [minutosDuracion, setMinutosDuracion] = useState(0);
  const [convocados, setConvocados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Al cambiar de categoría, la convocatoria previa deja de aplicar. */
  function cambiarCategoria(id: string) {
    setCategoriaId(id);
    setConvocados(new Set());
  }

  function alternarConvocado(id: string) {
    setConvocados((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
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
    // Construido con getters/constructor LOCALES a propósito: un <input
    // type="date"> parseado con `new Date(string)` se interpreta como UTC
    // medianoche y corre el día en la zona de Colombia. Acá se arma la fecha
    // en hora local del navegador y recién ahí se manda como ISO.
    const inicio = new Date(anio, mes - 1, dia, horaInicio, minutoInicio, 0);
    const fin = new Date(inicio.getTime() + duracionTotalMin * 60_000);

    const fd = new FormData(e.currentTarget);
    fd.set("inicio", inicio.toISOString());
    fd.set("fin", fin.toISOString());
    startTransition(async () => {
      const res = await crearEventoAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const convocables = jugadores.filter((j) => j.categoriaId === categoriaId);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categorias.length === 0}>
        + Nuevo evento
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo evento">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Tipo</label>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={input}
              >
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Categoría</label>
              <select
                name="categoriaId"
                value={categoriaId}
                onChange={(e) => cambiarCategoria(e.target.value)}
                className={input}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Título</label>
            <input
              name="titulo"
              required
              className={input}
              placeholder={
                tipo === "PARTIDO"
                  ? "Partido de liga, amistoso, torneo…"
                  : "Entrenamiento técnico"
              }
            />
          </div>

          {canchas.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Cancha (opcional)</label>
              <select name="canchaId" defaultValue="" className={input}>
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

          {tipo === "PARTIDO" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Rival</label>
                  <input name="rival" className={input} placeholder="vs. Academia Sur" />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" name="esLocal" className="accent-[color:var(--brand)]" />
                  Local
                </label>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs text-muted">
                    Convocados{convocados.size > 0 ? ` (${convocados.size})` : ""}
                  </label>
                  {convocables.length > 0 && (
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <input
                        type="checkbox"
                        className="accent-[color:var(--brand)]"
                        checked={convocados.size === convocables.length}
                        onChange={(e) =>
                          setConvocados(
                            e.target.checked
                              ? new Set(convocables.map((j) => j.id))
                              : new Set(),
                          )
                        }
                      />
                      Seleccionar todos
                    </label>
                  )}
                </div>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-subtle bg-surface-2 p-2">
                  {convocables.length === 0 ? (
                    <p className="text-xs text-muted">No hay jugadores en esta categoría.</p>
                  ) : (
                    convocables.map((j) => (
                      <label key={j.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="convocados"
                          value={j.id}
                          checked={convocados.has(j.id)}
                          onChange={() => alternarConvocado(j.id)}
                          className="accent-[color:var(--brand)]"
                        />
                        {j.nombre} {j.apellido}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {tipo === "ENTRENAMIENTO" && (
            <p className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-xs text-muted">
              Se convoca automáticamente a todo el plantel activo de la
              categoría y se avisa a las familias, que pueden confirmar o
              rechazar la asistencia.
            </p>
          )}

          {tipo !== "PARTIDO" && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="repetirSemanal" className="accent-[color:var(--brand)]" />
                Repetir semanal hasta
              </label>
              <input name="repetirHasta" type="date" className={`${input} w-auto`} />
            </div>
          )}

          {error && <p className="text-sm text-alerta">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Creando…" : "Crear evento"}
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
