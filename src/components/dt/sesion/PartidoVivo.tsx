"use client";

import { useState, useTransition } from "react";
import { registrarGolAction, marcarTarjetaAction } from "@/actions/sesion.actions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Cronometro } from "./Cronometro";
import { ObservacionSheet } from "./ObservacionSheet";
import type { ConvocadoSesionDTO } from "@/services/sesion.service";

type Marcador = { local: number; visitante: number };
type SheetAbierta = "GOL" | "ASISTENCIA" | "DESHACER" | "JUGADOR" | null;

/**
 * Modo PARTIDO en vivo (PLAN-UX-DT PR-4 §4.1). El gol nace del juego: al
 * registrarlo alimenta el marcador Y la estadística individual en la misma
 * operación, en vez de cargar una planilla después. Nada de esto notifica a las
 * familias: la difusión ocurre una sola vez, al cerrar la sesión.
 */
export function PartidoVivo({
  eventoId,
  inicio,
  esLocal,
  rival,
  presentes,
  marcadorInicial,
}: {
  eventoId: string;
  inicio: string | null;
  esLocal: boolean | null;
  rival: string | null;
  presentes: ConvocadoSesionDTO[];
  marcadorInicial: Marcador;
}) {
  const [marcador, setMarcador] = useState<Marcador>(marcadorInicial);
  const [sheet, setSheet] = useState<SheetAbierta>(null);
  const [anotador, setAnotador] = useState<string | null>(null);
  const [jugador, setJugador] = useState<ConvocadoSesionDTO | null>(null);
  const [observando, setObservando] = useState(false);
  const [golesPropios, setGolesPropios] = useState<
    { anotadorId: string | null; nombre: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El equipo propio va primero SIEMPRE: el DT lee su marcador, no el del acta.
  const propio = esLocal === false ? marcador.visitante : marcador.local;
  const ajeno = esLocal === false ? marcador.local : marcador.visitante;

  function aplicar(
    input: {
      anotadorId?: string;
      asistenteId?: string;
      esRival: boolean;
      delta: 1 | -1;
    },
    despues?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await registrarGolAction({ eventoId, ...input });
      if (res.ok && res.data) {
        setMarcador(res.data);
        despues?.();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function registrarGolPropio(anotadorId: string | null, asistenteId?: string) {
    aplicar(
      {
        ...(anotadorId ? { anotadorId } : {}),
        ...(asistenteId ? { asistenteId } : {}),
        esRival: false,
        delta: 1,
      },
      () => {
        const n = anotadorId
          ? (presentes.find((p) => p.jugadorId === anotadorId)?.nombre ??
            "Jugador")
          : "Sin registrar";
        setGolesPropios((prev) => [...prev, { anotadorId, nombre: n }]);
      },
    );
    setAnotador(null);
    setSheet(null);
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Cronometro inicio={inicio} className="text-2xl" />
      </div>

      {/* Marcador enorme: es lo que el DT mira de reojo desde el banco. */}
      <div className="grid grid-cols-2 gap-3">
        <LadoMarcador
          etiqueta="Mi equipo"
          valor={propio}
          onMas={() => setSheet("GOL")}
          onMenos={() => setSheet("DESHACER")}
          deshabilitado={pending}
          destacado
        />
        <LadoMarcador
          etiqueta={rival ?? "Rival"}
          valor={ajeno}
          onMas={() => aplicar({ esRival: true, delta: 1 })}
          onMenos={() => aplicar({ esRival: true, delta: -1 })}
          deshabilitado={pending}
        />
      </div>

      {error && (
        <p className="text-center text-sm text-alerta" role="alert">
          {error}
        </p>
      )}

      <div>
        <p className="mb-2 text-xs text-muted">
          Tocá un jugador para tarjeta u observación.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {presentes.map((p) => (
            <Button
              key={p.jugadorId}
              type="button"
              variant="secondary"
              className="min-h-16 flex-col whitespace-normal px-1 text-xs leading-tight"
              onClick={() => {
                setJugador(p);
                setSheet("JUGADOR");
              }}
            >
              <span className="font-bold">{p.nombre}</span>
              <span className="opacity-70">
                {p.estadistica.goles > 0 && `⚽${p.estadistica.goles} `}
                {p.estadistica.amarillas > 0 && "🟨"}
                {p.estadistica.roja && "🟥"}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* ¿Quién anotó? */}
      <BottomSheet
        open={sheet === "GOL"}
        onClose={() => setSheet(null)}
        title="¿Quién anotó?"
      >
        <div className="grid grid-cols-2 gap-2">
          {presentes.map((p) => (
            <Button
              key={p.jugadorId}
              type="button"
              variant="secondary"
              className="min-h-12 whitespace-normal text-xs"
              onClick={() => {
                setAnotador(p.jugadorId);
                setSheet("ASISTENCIA");
              }}
            >
              {p.nombre} {p.apellido}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 text-xs"
            onClick={() => registrarGolPropio(null)}
          >
            Sin registrar
          </Button>
        </div>
      </BottomSheet>

      {/* ¿Asistencia? (opcional) */}
      <BottomSheet
        open={sheet === "ASISTENCIA"}
        onClose={() => registrarGolPropio(anotador)}
        title="¿Asistencia? (opcional)"
      >
        <div className="grid grid-cols-2 gap-2">
          {presentes
            .filter((p) => p.jugadorId !== anotador)
            .map((p) => (
              <Button
                key={p.jugadorId}
                type="button"
                variant="secondary"
                className="min-h-12 whitespace-normal text-xs"
                onClick={() => registrarGolPropio(anotador, p.jugadorId)}
              >
                {p.nombre} {p.apellido}
              </Button>
            ))}
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 text-xs"
            onClick={() => registrarGolPropio(anotador)}
          >
            Sin asistencia
          </Button>
        </div>
      </BottomSheet>

      {/* Deshacer: se elige CUÁL gol revertir, para bajar también su stat. */}
      <BottomSheet
        open={sheet === "DESHACER"}
        onClose={() => setSheet(null)}
        title="Deshacer gol"
      >
        {golesPropios.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            No hay goles registrados en esta sesión para deshacer.
          </p>
        ) : (
          <div className="space-y-2">
            {golesPropios.map((g, i) => (
              <Button
                key={`${g.anotadorId ?? "sin"}-${i}`}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  aplicar(
                    {
                      ...(g.anotadorId ? { anotadorId: g.anotadorId } : {}),
                      esRival: false,
                      delta: -1,
                    },
                    () =>
                      setGolesPropios((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      ),
                  );
                  setSheet(null);
                }}
              >
                Quitar gol de {g.nombre}
              </Button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Acciones rápidas del jugador */}
      <BottomSheet
        open={sheet === "JUGADOR"}
        onClose={() => setSheet(null)}
        title={jugador ? `${jugador.nombre} ${jugador.apellido}` : "Jugador"}
      >
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending}
            onClick={() => {
              if (!jugador) return;
              startTransition(async () => {
                await marcarTarjetaAction({
                  eventoId,
                  jugadorId: jugador.jugadorId,
                  tipo: "AMARILLA",
                });
              });
              setSheet(null);
            }}
          >
            🟨 Amarilla
          </Button>
          <Button
            type="button"
            variant="danger"
            className="w-full"
            disabled={pending}
            onClick={() => {
              if (!jugador) return;
              startTransition(async () => {
                await marcarTarjetaAction({
                  eventoId,
                  jugadorId: jugador.jugadorId,
                  tipo: "ROJA",
                });
              });
              setSheet(null);
            }}
          >
            🟥 Roja
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSheet(null);
              setObservando(true);
            }}
          >
            📝 Observación
          </Button>
        </div>
      </BottomSheet>

      <ObservacionSheet
        abierto={observando}
        onCerrar={() => setObservando(false)}
        eventoId={eventoId}
        jugador={
          jugador ? { id: jugador.jugadorId, nombre: jugador.nombre } : null
        }
      />
    </div>
  );
}

function LadoMarcador({
  etiqueta,
  valor,
  onMas,
  onMenos,
  deshabilitado,
  destacado,
}: {
  etiqueta: string;
  valor: number;
  onMas: () => void;
  onMenos: () => void;
  deshabilitado: boolean;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        destacado ? "border-brand/50 bg-brand/5" : "border-subtle"
      }`}
    >
      <p className="truncate text-xs font-bold uppercase tracking-widest text-muted">
        {etiqueta}
      </p>
      <p className="tabular font-display text-5xl leading-tight">{valor}</p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={deshabilitado}
          onClick={onMenos}
          aria-label={`Quitar gol de ${etiqueta}`}
        >
          −
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={deshabilitado}
          onClick={onMas}
          aria-label={`Gol de ${etiqueta}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}
