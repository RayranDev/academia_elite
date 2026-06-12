"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";
import { equiparFondoAction } from "@/actions/jugador.actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FondoDTO } from "@/services/fondo.service";

/**
 * Galería de fondos de carta. Los desbloqueados se ven a color con "Equipar";
 * los bloqueados, en escala de grises con candado y el mérito que falta.
 */
export function FondosGaleria({
  jugadorId,
  fondos,
}: {
  jugadorId: string;
  fondos: FondoDTO[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function equipar(fondoId: string | null, id: string) {
    setPendingId(id);
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    if (fondoId) fd.set("fondoId", fondoId);
    startTransition(async () => {
      const res = await equiparFondoAction(undefined, fd);
      setPendingId(null);
      if (res.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-alerta">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fondos.map((f) => (
          <div
            key={f.id}
            className={cn(
              "overflow-hidden rounded-xl border",
              f.equipado ? "border-brand" : "border-subtle",
            )}
          >
            <div
              className="relative flex h-24 items-center justify-center"
              style={{ background: f.estilo, filter: f.desbloqueado ? undefined : "grayscale(1) brightness(0.6)" }}
            >
              {!f.desbloqueado && (
                <Lock className="h-6 w-6 text-white/90 drop-shadow" aria-hidden />
              )}
              {f.equipado && (
                <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                  <Check className="h-3 w-3" aria-hidden /> Equipado
                </span>
              )}
            </div>
            <div className="space-y-1 p-2">
              <p className="text-sm font-semibold">{f.nombre}</p>
              <p className="text-[11px] text-muted">
                {f.desbloqueado ? f.descripcion : f.requisito}
              </p>
              {f.desbloqueado ? (
                f.equipado ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={pendingId === f.id}
                    onClick={() => equipar(null, f.id)}
                  >
                    Quitar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={pendingId === f.id}
                    onClick={() => equipar(f.id, f.id)}
                  >
                    {pendingId === f.id ? "…" : "Equipar"}
                  </Button>
                )
              ) : (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                  <Lock className="h-3 w-3" aria-hidden /> Bloqueado
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
