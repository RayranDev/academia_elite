"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import {
  HAIR,
  REAR_HAIR,
  BEARD,
  EYES,
  EYEBROWS,
  MOUTH,
  CLOTHES,
  SKIN,
  HAIR_COLOR,
  CLOTHES_COLOR,
  etiqueta,
  type AvatarConfigV2,
} from "@/lib/avatar/toon-head";
import { avatarDesdeSeed } from "@/lib/avatar/config";
import { actualizarAvatarAction } from "@/actions/jugador.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// Campos de variante (índice 0..n-1) y los opcionales (admiten -1 = ninguno).
type VarKey = "hair" | "eyes" | "eyebrows" | "mouth" | "clothes";
type OptKey = "rearHair" | "beard";
type ColKey = "skinColor" | "hairColor" | "clothesColor";

const VARIANTES: { key: VarKey; label: string; lista: string[] }[] = [
  { key: "hair", label: "Peinado", lista: HAIR },
  { key: "eyes", label: "Ojos", lista: EYES },
  { key: "eyebrows", label: "Cejas", lista: EYEBROWS },
  { key: "mouth", label: "Boca", lista: MOUTH },
  { key: "clothes", label: "Ropa", lista: CLOTHES },
];
const OPCIONALES: { key: OptKey; label: string; lista: string[] }[] = [
  { key: "rearHair", label: "Pelo largo", lista: REAR_HAIR },
  { key: "beard", label: "Barba", lista: BEARD },
];
const COLORES: { key: ColKey; label: string; lista: string[] }[] = [
  { key: "skinColor", label: "Tono de piel", lista: SKIN },
  { key: "hairColor", label: "Color de cabello", lista: HAIR_COLOR },
  { key: "clothesColor", label: "Color de ropa", lista: CLOTHES_COLOR },
];

export function AvatarEditor({
  jugadorId,
  inicial,
  seed,
}: {
  jugadorId: string;
  inicial: AvatarConfigV2 | null;
  seed: string;
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AvatarConfigV2>(inicial ?? avatarDesdeSeed(seed));
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

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="mx-auto w-32 shrink-0 self-start rounded-xl border border-subtle bg-surface-2 p-2">
          <PlayerAvatar config={cfg} seed={seed} className="h-auto w-full" />
        </div>

        <div className="flex-1 space-y-4">
          {VARIANTES.map(({ key, label, lista }) => (
            <Selector key={key} label={label}>
              {lista.map((nombre, i) => (
                <Chip key={nombre} activo={cfg[key] === i} onClick={() => set(key, i)}>
                  {etiqueta(nombre)}
                </Chip>
              ))}
            </Selector>
          ))}

          {OPCIONALES.map(({ key, label, lista }) => (
            <Selector key={key} label={label}>
              <Chip activo={cfg[key] === -1} onClick={() => set(key, -1)}>
                Ninguno
              </Chip>
              {lista.map((nombre, i) => (
                <Chip key={nombre} activo={cfg[key] === i} onClick={() => set(key, i)}>
                  {etiqueta(nombre)}
                </Chip>
              ))}
            </Selector>
          ))}

          {COLORES.map(({ key, label, lista }) => (
            <Selector key={key} label={label}>
              {lista.map((color, i) => (
                <Swatch key={color + i} color={color} activo={cfg[key] === i} onClick={() => set(key, i)} />
              ))}
            </Selector>
          ))}
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
