"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { validarSemanaDtAction } from "@/actions/progreso.actions";
import { HABITOS, ETIQUETA_HABITO, type Habito } from "@/lib/progreso/engine";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import type { JugadorProgresoDtDTO } from "@/services/progreso.service";

type Marca = Record<Habito, boolean>;
const VACIO: Marca = {
  academico: false,
  comportamiento: false,
  puntualidad: false,
  ayudaCasa: false,
  valores: false,
};

/** Etiqueta corta de cada hábito para las cabeceras de columna. */
const CORTO: Record<Habito, string> = {
  academico: "Acad.",
  comportamiento: "Comp.",
  puntualidad: "Punt.",
  ayudaCasa: "Casa",
  valores: "Valores",
};

/**
 * Validación masiva del progreso semanal por el DT. Marca hábitos por jugador
 * y valida en bloque; los ya validados (por el padre o un DT) quedan fijos.
 */
export function ProgresoMasivo({
  semana,
  jugadores,
  categorias,
}: {
  semana: string;
  jugadores: JugadorProgresoDtDTO[];
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<string>("");
  const [incluidos, setIncluidos] = useState<Set<string>>(new Set());
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibles = useMemo(
    () => jugadores.filter((j) => !filtro || j.categoriaId === filtro),
    [jugadores, filtro],
  );
  // Filas editables visibles (no validadas aún).
  const editablesVisibles = visibles.filter((j) => !j.semanaValidada);

  const marca = (id: string): Marca => marcas[id] ?? VACIO;

  function setHabito(id: string, h: Habito, val: boolean) {
    setMarcas((m) => ({ ...m, [id]: { ...marca(id), [h]: val } }));
    if (val) setIncluidos((s) => new Set(s).add(id));
  }

  function toggleIncluido(id: string, val: boolean) {
    setIncluidos((s) => {
      const n = new Set(s);
      if (val) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  /** Marca un hábito en todas las filas editables visibles e inclúyelas. */
  function marcarColumna(h: Habito) {
    setMarcas((m) => {
      const n = { ...m };
      for (const j of editablesVisibles)
        n[j.jugadorId] = { ...(n[j.jugadorId] ?? VACIO), [h]: true };
      return n;
    });
    setIncluidos((s) => {
      const n = new Set(s);
      for (const j of editablesVisibles) n.add(j.jugadorId);
      return n;
    });
  }

  function validar() {
    const entradas = jugadores
      .filter((j) => !j.semanaValidada && incluidos.has(j.jugadorId))
      .map((j) => ({ jugadorId: j.jugadorId, ...marca(j.jugadorId) }));
    if (entradas.length === 0) {
      setError("Marca al menos un jugador para validar.");
      return;
    }
    const fd = new FormData();
    fd.set("entradas", JSON.stringify(entradas));
    startTransition(async () => {
      const res = await validarSemanaDtAction(undefined, fd);
      if (res.ok) {
        setError(null);
        const { validados, omitidos } = res.data ?? { validados: 0, omitidos: 0 };
        setMensaje(
          `${validados} validados${omitidos > 0 ? ` · ${omitidos} ya estaban` : ""}.`,
        );
        setIncluidos(new Set());
        setMarcas({});
        router.refresh();
      } else {
        setMensaje(null);
        setError(res.error);
      }
    });
  }

  if (jugadores.length === 0) {
    return (
      <EmptyState
        icon={Users}
        titulo="Sin jugadores"
        texto="No tienes jugadores activos en tus categorías."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltro("")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            filtro === "" ? "bg-brand text-white" : "bg-surface-2 text-muted"
          }`}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filtro === c.id ? "bg-brand text-white" : "bg-surface-2 text-muted"
            }`}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-subtle bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle text-left text-xs text-muted">
              <th className="p-2 font-semibold">Jugador</th>
              {HABITOS.map((h) => (
                <th key={h} className="p-2 text-center font-semibold">
                  <button
                    type="button"
                    onClick={() => marcarColumna(h)}
                    className="hover:text-brand"
                    title={`Marcar "${ETIQUETA_HABITO[h]}" en todos`}
                  >
                    {CORTO[h]}
                  </button>
                </th>
              ))}
              <th className="p-2 text-center font-semibold">Validar</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((j) => {
              const m = marca(j.jugadorId);
              return (
                <tr key={j.jugadorId} className="border-b border-subtle/60 last:border-0">
                  <td className="p-2">
                    <p className="font-semibold">
                      {j.apellido} {j.nombre}
                    </p>
                    <p className="text-xs text-muted">{j.categoriaNombre}</p>
                  </td>
                  {HABITOS.map((h) => (
                    <td key={h} className="p-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${ETIQUETA_HABITO[h]} de ${j.nombre}`}
                        className="h-4 w-4 accent-[var(--brand)] disabled:opacity-40"
                        checked={j.semanaValidada ? true : m[h]}
                        disabled={j.semanaValidada || pending}
                        onChange={(e) => setHabito(j.jugadorId, h, e.target.checked)}
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    {j.semanaValidada ? (
                      <CheckCircle2 className="mx-auto h-5 w-5 text-brand" aria-label="Validada" />
                    ) : (
                      <input
                        type="checkbox"
                        aria-label={`Validar a ${j.nombre}`}
                        className="h-4 w-4 accent-[var(--brand)]"
                        checked={incluidos.has(j.jugadorId)}
                        disabled={pending}
                        onChange={(e) => toggleIncluido(j.jugadorId, e.target.checked)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-alerta">{error}</p>}
      {mensaje && <p className="text-sm text-brand">{mensaje}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={validar} disabled={pending}>
          {pending ? "Validando…" : "Validar marcados"}
        </Button>
        <span className="text-xs text-muted">Semana del {semana}</span>
      </div>
    </div>
  );
}
