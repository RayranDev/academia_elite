"use client";

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
import { cn } from "@/lib/cn";

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

/**
 * Selector visual del avatar (peinado/ojos/cejas/boca/ropa/colores), sin
 * guardado propio. Lo usan `AvatarEditor` (persiste con actualizarAvatarAction)
 * y `SimuladorCarta` (solo vista previa, no guarda nada) para no duplicar los
 * ~150 líneas de chips/swatches en los dos lugares.
 */
export function AvatarPicker({
  cfg,
  seed,
  onChange,
}: {
  cfg: AvatarConfigV2;
  seed: string;
  onChange: <K extends keyof AvatarConfigV2>(k: K, v: AvatarConfigV2[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="mx-auto w-32 shrink-0 self-start rounded-xl border border-subtle bg-surface-2 p-2">
        <PlayerAvatar config={cfg} seed={seed} className="h-auto w-full" />
      </div>

      <div className="flex-1 space-y-4">
        {VARIANTES.map(({ key, label, lista }) => (
          <Selector key={key} label={label}>
            {lista.map((nombre, i) => (
              <Chip key={nombre} activo={cfg[key] === i} onClick={() => onChange(key, i)}>
                {etiqueta(nombre)}
              </Chip>
            ))}
          </Selector>
        ))}

        {OPCIONALES.map(({ key, label, lista }) => (
          <Selector key={key} label={label}>
            <Chip activo={cfg[key] === -1} onClick={() => onChange(key, -1)}>
              Ninguno
            </Chip>
            {lista.map((nombre, i) => (
              <Chip key={nombre} activo={cfg[key] === i} onClick={() => onChange(key, i)}>
                {etiqueta(nombre)}
              </Chip>
            ))}
          </Selector>
        ))}

        {COLORES.map(({ key, label, lista }) => (
          <Selector key={key} label={label}>
            {lista.map((color, i) => (
              <Swatch key={color + i} color={color} activo={cfg[key] === i} onClick={() => onChange(key, i)} />
            ))}
          </Selector>
        ))}
      </div>
    </div>
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
