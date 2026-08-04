"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import {
  prepararParaRecorte,
  removerFondoDeImagen,
  ErrorRemocionFondo,
} from "@/lib/foto/cliente";
import type { AvatarConfig } from "@/types";

// La CSP con 'unsafe-eval' (necesaria para @imgly/background-removal) la fija
// el proxy por DOCUMENTO, solo en /jugador/perfil. Si se llegó acá navegando
// del lado del cliente (<Link>, sin recarga completa), el navegador sigue
// usando la CSP del documento anterior — sin 'unsafe-eval' — aunque la URL ya
// diga /jugador/perfil. Se detecta probando eval real y, si está bloqueado, se
// fuerza UNA sola recarga completa (bandera anti-loop) para que el navegador
// vuelva a pedir el documento y reciba la CSP correcta de esta ruta.
const CLAVE_RECARGA_CSP = "csp-eval-recarga-jugador-perfil";

function evalDisponible(): boolean {
  try {
    new Function("return 1")();
    return true;
  } catch {
    return false;
  }
}

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
  const [mensajeFondo, setMensajeFondo] = useState("Preparando…"); // progreso visible
  // Aviso (no error): la foto sirve igual, pero no se le pudo quitar el fondo.
  const [avisoFondo, setAvisoFondo] = useState<string | null>(null);
  const [subiendo, startTransition] = useTransition();

  useEffect(() => {
    if (evalDisponible()) return;
    try {
      if (sessionStorage.getItem(CLAVE_RECARGA_CSP)) return;
      sessionStorage.setItem(CLAVE_RECARGA_CSP, "1");
    } catch {
      // sessionStorage no disponible: igual intentamos la recarga una vez.
    }
    window.location.reload();
  }, []);

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
      setMensajeFondo("Preparando…");
      setProcesandoFondo(true);
      const dataUrl = await prepararParaRecorte(file);
      const transparentDataUrl = await removerFondoDeImagen(
        dataUrl,
        setMensajeFondo,
      );
      setImagen(transparentDataUrl); // abre el recortador
    } catch (e) {
      // Si SOLO falló la remoción de fondo seguimos con la foto original: se
      // avisa, pero no se pierde el trabajo del usuario.
      if (e instanceof ErrorRemocionFondo) {
        setAvisoFondo(e.message);
        setImagen(e.original);
      } else {
        setError("No se pudo leer la imagen.");
      }
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
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
            <span>{mensajeFondo} · 100% en tu dispositivo</span>
          </div>
        )}
        {camara && (
          <CamaraCaptura
            onCapturar={async (dataUrl) => {
              setCamara(false);
              setMensajeFondo("Preparando…");
              setProcesandoFondo(true);
              try {
                const transparentDataUrl = await removerFondoDeImagen(
                  dataUrl,
                  setMensajeFondo,
                );
                setImagen(transparentDataUrl);
              } catch (e) {
                if (e instanceof ErrorRemocionFondo) setAvisoFondo(e.message);
                setImagen(dataUrl);
              } finally {
                setProcesandoFondo(false);
              }
            }}
            onCancelar={() => setCamara(false)}
          />
        )}
        {error && <p className="text-sm text-alerta">{error}</p>}
        {avisoFondo && (
          <p className="text-sm text-oro" role="status">
            {avisoFondo} La foto se subió igual, con su fondo original.
          </p>
        )}
        {ok && <p className="text-sm text-pitch">Foto actualizada.</p>}

        <div className="rounded-lg border border-subtle bg-surface-2 p-3 text-xs space-y-1.5 mt-2">
          <p className="font-semibold text-foreground">🔒 Tu foto no sale del dispositivo</p>
          <p className="text-muted leading-relaxed">
            La compresión, el recorte y la remoción de fondo se hacen 100% en tu
            navegador. Si la iluminación no es óptima y el recorte no queda
            perfecto, prueba con buena luz y un fondo claro o neutro, o usa el
            avatar mientras tanto.
          </p>
        </div>
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
