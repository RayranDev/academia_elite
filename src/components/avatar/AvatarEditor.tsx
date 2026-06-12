"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PlayerAvatar,
  PIEL,
  CABELLO,
  PEINADOS_COUNT,
  avatarDesdeSeed,
} from "@/components/avatar/PlayerAvatar";
import { actualizarAvatarAction } from "@/actions/jugador.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { GENEROS_AVATAR, type AvatarConfig, type GeneroAvatar } from "@/types";

const ETIQUETA_GENERO: Record<GeneroAvatar, string> = {
  M: "Masculino",
  F: "Femenino",
  X: "Otro",
};

export function AvatarEditor({
  jugadorId,
  inicial,
  seed,
}: {
  jugadorId: string;
  inicial: AvatarConfig | null;
  seed: string;
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AvatarConfig>(inicial ?? avatarDesdeSeed(seed));
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setGuardado(false);
  }

  function guardar() {
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    fd.set("genero", cfg.genero);
    fd.set("piel", String(cfg.piel));
    fd.set("peinado", String(cfg.peinado));
    fd.set("cabello", String(cfg.cabello));
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
    <Card className="max-w-lg">
      <h2 className="mb-1 text-lg font-bold">Avatar</h2>
      <p className="mb-4 text-sm text-muted">
        Personaliza el avatar que aparece en la carta cuando no hay foto.
      </p>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="mx-auto w-32 shrink-0 rounded-xl border border-subtle bg-surface-2 p-2">
          <PlayerAvatar config={cfg} seed={seed} className="h-auto w-full" />
        </div>

        <div className="flex-1 space-y-4">
          <Selector label="Género">
            {GENEROS_AVATAR.map((g) => (
              <Chip key={g} activo={cfg.genero === g} onClick={() => set("genero", g)}>
                {ETIQUETA_GENERO[g]}
              </Chip>
            ))}
          </Selector>

          <Selector label="Tono de piel">
            {PIEL.map((color, i) => (
              <Swatch key={i} color={color} activo={cfg.piel === i} onClick={() => set("piel", i)} />
            ))}
          </Selector>

          <Selector label="Color de cabello">
            {CABELLO.map((color, i) => (
              <Swatch key={i} color={color} activo={cfg.cabello === i} onClick={() => set("cabello", i)} />
            ))}
          </Selector>

          <Selector label="Peinado">
            {Array.from({ length: PEINADOS_COUNT }, (_, i) => (
              <Chip key={i} activo={cfg.peinado === i} onClick={() => set("peinado", i)}>
                {i + 1}
              </Chip>
            ))}
          </Selector>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-alerta">{error}</p>}
      {guardado && <p className="mt-3 text-sm text-brand">Avatar guardado.</p>}

      <Button className="mt-4" onClick={guardar} disabled={pending}>
        {pending ? "Guardando…" : "Guardar avatar"}
      </Button>
    </Card>
  );
}

function Selector({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
        activo ? "border-brand bg-brand/15 text-brand" : "border-subtle text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Swatch({
  color,
  activo,
  onClick,
}: {
  color: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={color}
      className={cn(
        "h-8 w-8 rounded-full border-2 transition-transform",
        activo ? "scale-110 border-brand" : "border-subtle hover:scale-105",
      )}
      style={{ background: color }}
    />
  );
}
