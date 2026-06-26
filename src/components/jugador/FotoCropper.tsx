"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { recortarABlob, ASPECTO_CARTA, type AreaPixels } from "@/lib/foto/cliente";

/**
 * Recortador de foto con proporción fija (la de la carta). Permite arrastrar y
 * hacer zoom para centrar el rostro y evitar que se corte la cabeza. Al
 * confirmar, entrega un Blob WebP ya optimizado.
 */
export function FotoCropper({
  imagen,
  procesando,
  onConfirmar,
  onCancelar,
}: {
  imagen: string;
  procesando: boolean;
  onConfirmar: (blob: Blob) => void;
  onCancelar: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<AreaPixels | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: unknown, pixels: AreaPixels) => {
    setArea(pixels);
  }, []);

  async function confirmar() {
    if (!area) return;
    try {
      const blob = await recortarABlob(imagen, area, 800, rotation);
      onConfirmar(blob);
    } catch {
      setError("No se pudo recortar la imagen. Intenta con otra.");
    }
  }

  return (
    <Modal open onClose={onCancelar} title="Ajusta la foto" className="max-w-lg">
      <div className="space-y-3">
        <div
          className="relative h-80 w-full overflow-hidden rounded-lg"
          // Tablero de transparencia: deja claro que un PNG/SVG sin fondo no
          // recibe fondo sólido.
          style={{
            backgroundColor: "#1f2937",
            backgroundImage:
              "linear-gradient(45deg,#374151 25%,transparent 25%),linear-gradient(-45deg,#374151 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#374151 75%),linear-gradient(-45deg,transparent 75%,#374151 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
          }}
        >
          <Cropper
            image={imagen}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECTO_CARTA}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex gap-4 items-center">
          <label className="flex-1 text-xs text-muted">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--brand)]"
              aria-label="Zoom de la foto"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="shrink-0"
          >
            Girar 90°
          </Button>
        </div>

        {error && <p className="text-sm text-alerta">{error}</p>}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={confirmar} disabled={procesando || !area}>
            {procesando ? "Subiendo…" : "Usar esta foto"}
          </Button>
          <Button variant="secondary" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
