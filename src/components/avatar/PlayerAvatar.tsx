import { avatarDataUri, type AvatarConfigV2 } from "@/lib/avatar/toon-head";
import { avatarDesdeSeed } from "@/lib/avatar/config";
import type { Genero } from "@/types";

/**
 * Avatar del jugador (DiceBear v10, estilo "toon-head"), generado en el propio
 * proceso — nunca una API externa (privacidad de menores). Es el fallback
 * cuando no hay foto real con consentimiento. `toDataUri` es síncrono, así que
 * funciona tanto en Server como en Client Components.
 *
 * `genero` solo pesa cuando NO hay `config`: una vez que la familia editó el
 * avatar, manda lo que eligió.
 */
export function PlayerAvatar({
  config,
  seed = "jugador",
  genero,
  className,
}: {
  config?: AvatarConfigV2 | null;
  seed?: string;
  genero?: Genero | null;
  className?: string;
}) {
  const cfg = config ?? avatarDesdeSeed(seed, genero);
  const uri = avatarDataUri(cfg, seed);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={uri} alt="Avatar del jugador" className={className} draggable={false} />
  );
}
