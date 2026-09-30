"use client";

import { useActionState } from "react";
import { actualizarLandingAction } from "@/actions/landing.actions";
import { Button } from "@/components/ui/Button";
import { HeroIlustracion } from "@/components/landing/HeroIlustracion";
import { HEROES_LANDING, HERO_LANDING_DEFAULT_ID } from "@/lib/landing-heroes";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";
import type { LandingAdminDTO } from "@/services/landing.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function LandingForm({
  landing,
}: {
  landing: Omit<LandingAdminDTO, "slug">;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    actualizarLandingAction,
    undefined,
  );
  const heroActual = landing.heroId ?? HERO_LANDING_DEFAULT_ID;

  return (
    <form action={action} className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="publicada"
          defaultChecked={landing.publicada}
          className="h-4 w-4 accent-brand"
        />
        Publicar landing pública
      </label>

      <div>
        <label className="mb-1 block text-xs text-muted">Titular</label>
        <input
          name="titular"
          maxLength={80}
          defaultValue={landing.titular ?? ""}
          placeholder="Formamos jugadores, formamos personas"
          className={input}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">Descripción</label>
        <textarea
          name="descripcion"
          maxLength={500}
          rows={3}
          defaultValue={landing.descripcion ?? ""}
          className={input}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-muted">Imagen de portada</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {HEROES_LANDING.map((h) => (
            <label key={h.id} className="cursor-pointer text-center">
              <input
                type="radio"
                name="heroId"
                value={h.id}
                defaultChecked={heroActual === h.id}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "relative h-14 overflow-hidden rounded-lg border-2 border-transparent peer-checked:border-brand",
                  h.className,
                )}
              >
                <HeroIlustracion id={h.id} className="absolute inset-0 h-full w-full" />
              </div>
              <p className="mt-1 text-[10px] text-muted">{h.etiqueta}</p>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted">WhatsApp</label>
          <input
            name="whatsapp"
            defaultValue={landing.whatsapp ?? ""}
            placeholder="+57 300 1234567"
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Email de contacto</label>
          <input
            name="email"
            type="email"
            defaultValue={landing.email ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Instagram</label>
          <input
            name="instagram"
            defaultValue={landing.instagram ?? ""}
            placeholder="@usuario"
            className={input}
          />
        </div>
      </div>

      {state && !state.ok && <p className="text-sm text-alerta">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand">Landing actualizada.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar landing"}
      </Button>
    </form>
  );
}
