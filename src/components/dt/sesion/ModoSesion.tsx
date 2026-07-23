"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LogOut } from "lucide-react";
import { iniciarSesionAction } from "@/actions/sesion.actions";
import { Cronometro } from "./Cronometro";
import { ListaViva, type EstadoVisible } from "./ListaViva";
import { SesionVivo } from "./SesionVivo";
import { PartidoVivo } from "./PartidoVivo";
import { CierreSesion } from "./CierreSesion";
import {
  useAsistenciaOptimista,
  type EstadoAsistencia,
  type MarcaAsistencia,
} from "./useAsistenciaOptimista";
import { cn } from "@/lib/cn";
import type { SesionDTO, ConvocadoSesionDTO } from "@/services/sesion.service";

type Paso = "LISTA" | "VIVO" | "CIERRE";

/** Un toque cicla: Presente → Ausente → Justificado → Presente. */
const CICLO: Record<EstadoAsistencia, EstadoAsistencia> = {
  PRESENTE: "AUSENTE",
  AUSENTE: "JUSTIFICADO",
  JUSTIFICADO: "PRESENTE",
};

/**
 * Modo Sesión: el evento como flujo guiado en vez de una página de secciones
 * (PLAN-UX-DT PR-3). Posee el estado de asistencia porque los tres pasos lo
 * comparten. La lista NUNCA se congela: el botón "Lista" vuelve al paso 1 en
 * cualquier momento. Salir no pierde nada: todo se guardó toque a toque.
 */
export function ModoSesion({ sesion }: { sesion: SesionDTO }) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>(
    sesion.sesionCerradaAt ? "CIERRE" : "LISTA",
  );
  const [sumados, setSumados] = useState<ConvocadoSesionDTO[]>([]);

  const inicial = useMemo(() => {
    const m = new Map<string, MarcaAsistencia>();
    for (const c of sesion.convocados) {
      if (!c.estado) continue;
      m.set(c.jugadorId, {
        jugadorId: c.jugadorId,
        estado: c.estado,
        llegoTarde: c.llegoTarde,
        salioAntes: c.salioAntes,
      });
    }
    return m;
  }, [sesion.convocados]);

  const { marcas, marcar, pendientes } = useAsistenciaOptimista(
    sesion.eventoId,
    inicial,
  );

  // Arranca el cronómetro al entrar. Idempotente: el server solo lo fija si
  // todavía era null, así que reentrar no lo resetea.
  useEffect(() => {
    if (sesion.sesionIniciadaAt || sesion.sesionCerradaAt) return;
    void iniciarSesionAction({ eventoId: sesion.eventoId }).then(() =>
      router.refresh(),
    );
  }, [sesion.eventoId, sesion.sesionIniciadaAt, sesion.sesionCerradaAt, router]);

  const filas = useMemo(
    () => [...sesion.convocados, ...sumados],
    [sesion.convocados, sumados],
  );

  /**
   * Estado a mostrar. Lo marcado manda; si no, se pre-llena TENTATIVAMENTE.
   * El default (incluido PENDIENTE, que es la mayoría) es Presente: el DT pasa
   * lista de quienes SÍ vinieron, así el caso común se resuelve con un toque.
   * Si arrancara en Ausente harían falta tres por jugador presente.
   */
  function estadoDe(c: ConvocadoSesionDTO): EstadoVisible {
    const m = marcas.get(c.jugadorId);
    if (m) return { estado: m.estado, tentativo: false };
    if (c.confirmacion === "RECHAZADO")
      return { estado: "JUSTIFICADO", tentativo: true };
    return { estado: "PRESENTE", tentativo: true };
  }

  function ciclar(c: ConvocadoSesionDTO) {
    const { estado, tentativo } = estadoDe(c);
    const m = marcas.get(c.jugadorId);
    marcar({
      jugadorId: c.jugadorId,
      // El primer toque CONFIRMA la tentativa; recién después cicla.
      estado: tentativo ? estado : CICLO[estado],
      llegoTarde: m?.llegoTarde ?? false,
      salioAntes: m?.salioAntes ?? false,
    });
  }

  function modificar(
    jugadorId: string,
    cambio: { llegoTarde?: boolean; salioAntes?: boolean },
  ) {
    const c = filas.find((f) => f.jugadorId === jugadorId);
    if (!c) return;
    const actual = marcas.get(jugadorId);
    marcar({
      jugadorId,
      estado: actual?.estado ?? estadoDe(c).estado,
      llegoTarde: cambio.llegoTarde ?? actual?.llegoTarde ?? false,
      salioAntes: cambio.salioAntes ?? actual?.salioAntes ?? false,
    });
  }

  const presentes = filas.filter((c) => estadoDe(c).estado === "PRESENTE");
  const esPartido = sesion.tipo === "PARTIDO";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-subtle bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{sesion.titulo}</p>
          <p className="text-xs text-muted">{sesion.categoriaNombre}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Cronometro inicio={sesion.sesionIniciadaAt} className="text-lg" />
          {paso !== "LISTA" && (
            <button
              type="button"
              onClick={() => setPaso("LISTA")}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-surface-2 px-3 text-xs font-semibold"
            >
              <Users className="h-4 w-4" aria-hidden /> Lista
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/dt/eventos/${sesion.eventoId}`)}
            aria-label="Salir de la sesión"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Salir
          </button>
        </div>
      </header>

      <nav className="flex border-b border-subtle text-xs font-semibold">
        {(["LISTA", "VIVO", "CIERRE"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPaso(p)}
            aria-current={paso === p ? "step" : undefined}
            className={cn(
              "min-h-11 flex-1 border-b-2 uppercase tracking-widest",
              paso === p
                ? "border-brand text-brand"
                : "border-transparent text-muted",
            )}
          >
            {p === "LISTA" ? "Lista" : p === "VIVO" ? "En vivo" : "Cierre"}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4">
        {paso === "LISTA" && (
          <ListaViva
            eventoId={sesion.eventoId}
            filas={filas}
            disponibles={sesion.disponibles.filter(
              (d) => !sumados.some((s) => s.jugadorId === d.id),
            )}
            marcas={marcas}
            pendientes={pendientes}
            estadoDe={estadoDe}
            onCiclar={ciclar}
            onModificar={modificar}
            onAgregado={(j) => {
              setSumados((prev) => [
                ...prev,
                {
                  jugadorId: j.id,
                  nombre: j.nombre,
                  apellido: j.apellido,
                  confirmacion: "PENDIENTE",
                  estado: "PRESENTE",
                  llegoTarde: false,
                  salioAntes: false,
                  agregadoEnCancha: true,
                  // Recién sumado: arranca sin estadística en el partido.
                  estadistica: {
                    minutos: 0,
                    goles: 0,
                    asistencias: 0,
                    amarillas: 0,
                    roja: false,
                  },
                },
              ]);
              marcar({
                jugadorId: j.id,
                estado: "PRESENTE",
                llegoTarde: false,
                salioAntes: false,
              });
            }}
            onContinuar={() => setPaso("VIVO")}
          />
        )}

        {paso === "VIVO" &&
          (esPartido ? (
            <PartidoVivo
              eventoId={sesion.eventoId}
              inicio={sesion.sesionIniciadaAt}
              esLocal={sesion.esLocal}
              rival={sesion.rival}
              presentes={presentes}
              marcadorInicial={{
                local: sesion.resultadoLocal ?? 0,
                visitante: sesion.resultadoVisitante ?? 0,
              }}
            />
          ) : (
            <SesionVivo
              eventoId={sesion.eventoId}
              inicio={sesion.sesionIniciadaAt}
              presentes={presentes}
            />
          ))}

        {paso === "CIERRE" && (
          <CierreSesion
            eventoId={sesion.eventoId}
            filas={filas}
            estadoDe={(c) => estadoDe(c).estado}
            notaInicial={sesion.notaSesion}
            esPartido={esPartido}
          />
        )}
      </main>

      {paso === "VIVO" && (
        <div className="sticky bottom-0 border-t border-subtle bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setPaso("CIERRE")}
            className="min-h-12 w-full rounded-lg bg-pitch font-bold text-base"
          >
            Terminar sesión →
          </button>
        </div>
      )}
    </div>
  );
}
