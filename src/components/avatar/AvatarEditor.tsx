"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import type { AvatarConfigV2 } from "@/lib/avatar/toon-head";
import { avatarDesdeSeed } from "@/lib/avatar/config";
import type { Genero } from "@/types";
import { actualizarAvatarAction } from "@/actions/jugador.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AvatarEditor({
  jugadorId,
  inicial,
  seed,
  genero,
}: {
  jugadorId: string;
  inicial: AvatarConfigV2 | null;
  seed: string;
  genero: Genero | null;
}) {
  const router = useRouter();
  // Punto de partida del editor = el mismo avatar que ya se ve en la carta, así
  // que arranca del género declarado cuando todavía no hay config guardada.
  const [cfg, setCfg] = useState<AvatarConfigV2>(inicial ?? avatarDesdeSeed(seed, genero));
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof AvatarConfigV2>(k: K, v: AvatarConfigV2[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setGuardado(false);
  }

  function guardar() {
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    for (const k of [
      "hair", "rearHair", "beard", "eyes", "eyebrows", "mouth", "clothes",
      "skinColor", "hairColor", "clothesColor",
    ] as const) {
      fd.set(k, String(cfg[k]));
    }
    startTransition(async () => {
      const res = await actualizarAvatarAction(undefined, fd);
      if (res.ok) {
        setGuardado(true);
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <h2 className="mb-1 text-lg font-bold">Avatar</h2>
      <p className="mb-4 text-sm text-muted">
        Personaliza el avatar que aparece en la carta cuando no hay foto.
      </p>

      <AvatarPicker cfg={cfg} seed={seed} onChange={set} />

      {error && <p className="mt-3 text-sm text-alerta">{error}</p>}
      {guardado && <p className="mt-3 text-sm text-brand">Avatar guardado.</p>}

      <Button className="mt-4" onClick={guardar} disabled={pending}>
        {pending ? "Guardando…" : "Guardar avatar"}
      </Button>
    </Card>
  );
}
