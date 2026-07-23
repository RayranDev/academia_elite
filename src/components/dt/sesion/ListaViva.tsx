"use client";

import { useRef, useState } from "react";
import { Check, X, FileText, UserPlus, RefreshCw } from "lucide-react";
import { agregarConvocadoAction } from "@/actions/sesion.actions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ConvocadoSesionDTO } from "@/services/sesion.service";
import type {
  EstadoAsistencia,
  MarcaAsistencia,
} from "./useAsistenciaOptimista";

const MS_LONG_PRESS = 500;

export interface EstadoVisible {
  estado: EstadoAsistencia;
  /** Pre-llenado por la confirmación de la familia: el DT todavía no lo tocó. */
  tentativo: boolean;
}

/**
 * Paso 1 de la sesión: pasar lista sin submits (PLAN-UX-DT PR-3 §3.3).
 * Filas de ≥ 56px, un toque cicla el estado y el long-press abre los
 * modificadores. Presentacional: el estado de asistencia lo posee `ModoSesion`,
 * porque los tres pasos lo comparten.
 */
export function ListaViva({
  eventoId,
  filas,
  disponibles,
  marcas,
  pendientes,
  estadoDe,
  onCiclar,
  onModificar,
  onAgregado,
  onContinuar,
}: {
  eventoId: string;
  filas: ConvocadoSesionDTO[];
  disponibles: { id: string; nombre: string; apellido: string }[];
  marcas: Map<string, MarcaAsistencia>;
  pendientes: number;
  estadoDe: (c: ConvocadoSesionDTO) => EstadoVisible;
  onCiclar: (c: ConvocadoSesionDTO) => void;
  onModificar: (
    jugadorId: string,
    cambio: { llegoTarde?: boolean; salioAntes?: boolean },
  ) => void;
  onAgregado: (j: { id: string; nombre: string; apellido: string }) => void;
  onContinuar: () => void;
}) {
  const [sheetJugador, setSheetJugador] = useState<string | null>(null);
  const [abrirAgregar, setAbrirAgregar] = useState(false);

  const presentes = filas.filter((c) => estadoDe(c).estado === "PRESENTE").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          {presentes}/{filas.length} presentes
        </p>
        {pendientes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-xs text-muted">
            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
            {pendientes} sin sincronizar
          </span>
        )}
      </div>

      <ul className="divide-y divide-subtle rounded-lg border border-subtle">
        {filas.map((c) => (
          <FilaJugador
            key={c.jugadorId}
            convocado={c}
            {...estadoDe(c)}
            marca={marcas.get(c.jugadorId)}
            onToque={() => onCiclar(c)}
            onLongPress={() => setSheetJugador(c.jugadorId)}
          />
        ))}
      </ul>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => setAbrirAgregar(true)}
      >
        <UserPlus className="mr-1 h-4 w-4" aria-hidden /> Agregar jugador
      </Button>

      <Button type="button" size="lg" className="w-full" onClick={onContinuar}>
        Continuar →
      </Button>

      <ModificadoresSheet
        abierto={sheetJugador !== null}
        onCerrar={() => setSheetJugador(null)}
        marca={sheetJugador ? marcas.get(sheetJugador) : undefined}
        onCambiar={(cambio) => {
          if (sheetJugador) onModificar(sheetJugador, cambio);
        }}
      />

      <AgregarSheet
        abierto={abrirAgregar}
        onCerrar={() => setAbrirAgregar(false)}
        eventoId={eventoId}
        disponibles={disponibles}
        onAgregado={onAgregado}
      />
    </div>
  );
}

const VISUAL: Record<
  EstadoAsistencia,
  { icono: typeof Check; clase: string; etiqueta: string }
> = {
  PRESENTE: { icono: Check, clase: "bg-pitch/20 text-pitch", etiqueta: "Presente" },
  AUSENTE: { icono: X, clase: "bg-alerta/20 text-alerta", etiqueta: "Ausente" },
  JUSTIFICADO: {
    icono: FileText,
    clase: "bg-info/20 text-info",
    etiqueta: "Justificado",
  },
};

function FilaJugador({
  convocado,
  estado,
  tentativo,
  marca,
  onToque,
  onLongPress,
}: {
  convocado: ConvocadoSesionDTO;
  estado: EstadoAsistencia;
  tentativo: boolean;
  marca?: MarcaAsistencia;
  onToque: () => void;
  onLongPress: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const largo = useRef(false);
  const v = VISUAL[estado];
  const Icono = v.icono;
  const tarde = marca?.llegoTarde ?? convocado.llegoTarde;
  const antes = marca?.salioAntes ?? convocado.salioAntes;

  function abajo() {
    largo.current = false;
    timer.current = setTimeout(() => {
      largo.current = true;
      onLongPress();
    }, MS_LONG_PRESS);
  }
  function arriba() {
    if (timer.current) clearTimeout(timer.current);
    if (!largo.current) onToque();
  }

  return (
    <li>
      <button
        type="button"
        onPointerDown={abajo}
        onPointerUp={arriba}
        onPointerLeave={() => timer.current && clearTimeout(timer.current)}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
        aria-label={`${convocado.nombre} ${convocado.apellido}: ${v.etiqueta}`}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            v.clase,
            tentativo && "border-2 border-dashed border-current",
          )}
        >
          <Icono className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">
            {convocado.nombre} {convocado.apellido}
          </span>
          <span className="text-xs text-muted">
            {v.etiqueta}
            {tentativo && " (sin confirmar)"}
            {convocado.agregadoEnCancha && " · sumado en cancha"}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted">
          {tarde && "⏱"}
          {antes && "↩"}
        </span>
      </button>
    </li>
  );
}

function ModificadoresSheet({
  abierto,
  onCerrar,
  marca,
  onCambiar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  marca?: MarcaAsistencia;
  onCambiar: (c: { llegoTarde?: boolean; salioAntes?: boolean }) => void;
}) {
  return (
    <BottomSheet open={abierto} onClose={onCerrar} title="Detalle de asistencia">
      <div className="space-y-2">
        <Button
          type="button"
          variant={marca?.llegoTarde ? "primary" : "secondary"}
          className="w-full"
          onClick={() => {
            onCambiar({ llegoTarde: !marca?.llegoTarde });
            onCerrar();
          }}
        >
          ⏱ Llegó tarde
        </Button>
        <Button
          type="button"
          variant={marca?.salioAntes ? "primary" : "secondary"}
          className="w-full"
          onClick={() => {
            onCambiar({ salioAntes: !marca?.salioAntes });
            onCerrar();
          }}
        >
          ↩ Se retiró antes
        </Button>
      </div>
    </BottomSheet>
  );
}

function AgregarSheet({
  abierto,
  onCerrar,
  eventoId,
  disponibles,
  onAgregado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  eventoId: string;
  disponibles: { id: string; nombre: string; apellido: string }[];
  onAgregado: (j: { id: string; nombre: string; apellido: string }) => void;
}) {
  const [buscar, setBuscar] = useState("");
  const filtrados = disponibles.filter((d) =>
    `${d.nombre} ${d.apellido}`.toLowerCase().includes(buscar.trim().toLowerCase()),
  );

  return (
    <BottomSheet open={abierto} onClose={onCerrar} title="Agregar jugador">
      <input
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar…"
        aria-label="Buscar jugador"
        className="mb-3 w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {filtrados.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          No hay más jugadores en esta categoría.
        </p>
      ) : (
        <ul className="divide-y divide-subtle">
          {filtrados.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => {
                  onAgregado(j);
                  void agregarConvocadoAction({ eventoId, jugadorId: j.id });
                  onCerrar();
                }}
                className="min-h-12 w-full px-1 py-2 text-left text-sm font-semibold"
              >
                {j.nombre} {j.apellido}
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
