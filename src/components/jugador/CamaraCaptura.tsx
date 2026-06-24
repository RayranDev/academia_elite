"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Captura de foto in-app (MVP #8): cámara frontal (getUserMedia) + silueta de guía;
// devuelve un dataURL que entra al mismo pipeline que "Elegir foto" (recorte → WebP
// → API protegida, sin metadatos). No quita el fondo (fase posterior, sin API
// externa por tratarse de fotos de menores).
export function CamaraCaptura({
  onCapturar,
  onCancelar,
}: {
  onCapturar: (dataUrl: string) => void;
  onCancelar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function abrir() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu dispositivo no permite usar la cámara. Usá “Elegir foto”.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1080 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setListo(true);
        }
      } catch {
        setError(
          "No se pudo acceder a la cámara. Revisá los permisos o usá “Elegir foto”.",
        );
      }
    }

    abrir();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function detener() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Recorte cuadrado centrado del frame; el recortador ajusta después a la carta.
    const lado = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - lado) / 2;
    const sy = (video.videoHeight - lado) / 2;
    ctx.drawImage(video, sx, sy, lado, lado, 0, 0, lado, lado);
    const dataUrl = canvas.toDataURL("image/webp", 0.92);
    detener();
    onCapturar(dataUrl);
  }

  function cancelar() {
    detener();
    onCancelar();
  }

  return (
    <div className="space-y-3 rounded-xl border border-subtle bg-surface-2 p-3">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {/* Silueta de cabeza/hombros como guía de encuadre. */}
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <ellipse
            cx="50"
            cy="40"
            rx="17"
            ry="21"
            fill="none"
            stroke="white"
            strokeOpacity="0.65"
            strokeWidth="1.2"
            strokeDasharray="3 2.5"
          />
          <path
            d="M24 100 Q24 72 50 69 Q76 72 76 100"
            fill="none"
            stroke="white"
            strokeOpacity="0.65"
            strokeWidth="1.2"
            strokeDasharray="3 2.5"
          />
        </svg>
      </div>

      <p className="text-center text-xs text-muted">
        Buena luz · fondo claro o neutro · una sola persona · alineá el rostro con
        la guía.
      </p>

      {error && <p className="text-sm text-alerta">{error}</p>}

      <div className="flex justify-center gap-2">
        <Button onClick={capturar} disabled={!listo}>
          Capturar
        </Button>
        <Button variant="secondary" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
