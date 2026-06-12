"use client";

import { useActionState } from "react";
import {
  subirFotoAction,
  actualizarConsentimientoAction,
} from "@/actions/jugador.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import type { ActionResult } from "@/lib/action-result";
import type { AvatarConfig } from "@/types";

export function FotoConsentimiento({
  jugadorId,
  tieneFoto,
  consentimiento,
  avatarConfig,
  seed,
}: {
  jugadorId: string;
  tieneFoto: boolean;
  consentimiento: boolean;
  avatarConfig: AvatarConfig | null;
  seed: string;
}) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(subirFotoAction, undefined);

  return (
    <Card className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-bold">Foto del jugador</h2>
        <p className="text-sm text-muted">
          La foto solo se muestra con tu consentimiento. Se procesa de forma
          segura (se eliminan metadatos) y nunca es pública.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-subtle bg-surface-2">
          {tieneFoto && consentimiento ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/archivos/foto/${jugadorId}`}
              alt="Foto del jugador"
              className="h-full w-full object-cover"
            />
          ) : (
            <PlayerAvatar config={avatarConfig} seed={seed} className="h-full w-full" />
          )}
        </div>
        <div>
          {consentimiento ? (
            <Badge tono="pitch">Consentimiento activo</Badge>
          ) : (
            <Badge tono="alerta">Sin consentimiento</Badge>
          )}
          <p className="mt-1 text-xs text-muted">
            {tieneFoto ? "Hay una foto cargada." : "No hay foto cargada."}
          </p>
        </div>
      </div>

      <form action={action} className="space-y-2">
        <input type="hidden" name="jugadorId" value={jugadorId} />
        <label className="block text-sm font-medium text-muted">
          Subir/actualizar foto (JPEG, PNG o WebP · máx. 5 MB)
        </label>
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-foreground"
        />
        {state && !state.ok && (
          <p className="text-sm text-alerta">{state.error}</p>
        )}
        {state?.ok && <p className="text-sm text-pitch">Foto actualizada.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Subiendo…" : "Subir foto"}
        </Button>
      </form>

      <form action={actualizarConsentimientoAction} className="border-t border-subtle pt-4">
        <input type="hidden" name="jugadorId" value={jugadorId} />
        <input type="hidden" name="consiente" value={consentimiento ? "false" : "true"} />
        <Button type="submit" variant={consentimiento ? "danger" : "primary"}>
          {consentimiento
            ? "Revocar consentimiento (ocultar foto)"
            : "Dar consentimiento (mostrar foto)"}
        </Button>
      </form>
    </Card>
  );
}
