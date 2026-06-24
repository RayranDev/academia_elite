"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  subirFotoAction,
  actualizarConsentimientoAction,
} from "@/actions/jugador.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import { FotoCropper } from "@/components/jugador/FotoCropper";
import { CamaraCaptura } from "@/components/jugador/CamaraCaptura";
import { prepararParaRecorte, removerFondoDeImagen } from "@/lib/foto/cliente";
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagen, setImagen] = useState<string | null>(null); // dataURL para recortar
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [version, setVersion] = useState(0); // cache-buster tras subir
  const [camara, setCamara] = useState(false); // captura desde la cámara
  const [procesandoFondo, setProcesandoFondo] = useState(false); // remoción de fondo en carga
  const [subiendo, startTransition] = useTransition();

  const fotoSrc = `/api/archivos/foto/${jugadorId}${version ? `?v=${version}` : ""}`;

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setOk(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Elige una imagen (JPEG, PNG o WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("La imagen es demasiado grande (máx. 15 MB).");
      return;
    }
    try {
      setProcesandoFondo(true);
      const dataUrl = await prepararParaRecorte(file);
      const transparentDataUrl = await removerFondoDeImagen(dataUrl);
      setImagen(transparentDataUrl); // abre el recortador
    } catch {
      setError("No se pudo leer la imagen.");
    } finally {
      setProcesandoFondo(false);
      // Permite volver a elegir el mismo archivo más tarde.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function subir(blob: Blob) {
    const fd = new FormData();
    fd.set("jugadorId", jugadorId);
    fd.set("foto", new File([blob], "foto.png", { type: "image/png" }));
    startTransition(async () => {
      const res = await subirFotoAction(undefined, fd);
      if (res.ok) {
        setImagen(null);
        setOk(true);
        setVersion(Date.now()); // fuerza recarga de la previsualización
        router.refresh();
      } else {
        setError(res.error);
        setImagen(null);
      }
    });
  }

  return (
    <Card className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-bold">Foto del jugador</h2>
        <p className="text-sm text-muted">
          La foto se comprime y se recorta a la proporción de la carta en tu
          dispositivo antes de subirla. Solo se muestra con tu consentimiento; se
          procesa de forma segura (se eliminan metadatos) y nunca es pública.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-subtle bg-surface-2">
          {tieneFoto && consentimiento ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoSrc}
              alt="Foto del jugador"
              className="h-full w-full object-cover object-top"
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

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">
          Subir/actualizar foto (JPEG, PNG o WebP)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={alElegirArchivo}
          className="hidden"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={subiendo || procesandoFondo}>
            {procesandoFondo ? "Procesando fondo..." : "Elegir foto…"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setOk(false);
              setCamara(true);
            }}
            disabled={subiendo || procesandoFondo}
          >
            Tomar foto
          </Button>
        </div>
        {procesandoFondo && (
          <p className="text-xs text-muted animate-pulse">
            Removiendo fondo localmente (100% privado)...
          </p>
        )}
        {camara && (
          <CamaraCaptura
            onCapturar={(dataUrl) => {
              setCamara(false);
              setImagen(dataUrl);
            }}
            onCancelar={() => setCamara(false)}
          />
        )}
        {error && <p className="text-sm text-alerta">{error}</p>}
        {ok && <p className="text-sm text-pitch">Foto actualizada.</p>}
      </div>

      <form action={actualizarConsentimientoAction} className="border-t border-subtle pt-4">
        <input type="hidden" name="jugadorId" value={jugadorId} />
        <input type="hidden" name="consiente" value={consentimiento ? "false" : "true"} />
        <Button type="submit" variant={consentimiento ? "danger" : "primary"}>
          {consentimiento
            ? "Revocar consentimiento (ocultar foto)"
            : "Dar consentimiento (mostrar foto)"}
        </Button>
      </form>

      {imagen && (
        <FotoCropper
          imagen={imagen}
          procesando={subiendo}
          onConfirmar={subir}
          onCancelar={() => setImagen(null)}
        />
      )}
    </Card>
  );
}
