"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Captura de foto in-app (simplificada):
// cámara frontal (getUserMedia) + silueta de guía + captura cuadrada PNG.
// La remoción de fondo se delega al pipeline unificado de la página mediante @imgly/background-removal.
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
  const [procesando, setProcesando] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Abrir la stream de la cámara frontal/trasera
  useEffect(() => {
    let cancelado = false;

    async function abrirCámara() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu dispositivo no permite usar la cámara. Usá “Elegir foto”.");
        return;
      }
      try {
        // Apagamos cualquier stream anterior para evitar bloqueos
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
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
      } catch (err) {
        console.error("Error abriendo cámara:", err);
        setError(
          "No se pudo acceder a la cámara. Revisá los permisos o usá “Elegir foto”."
        );
      }
    }

    abrirCámara();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  const toggleCámara = () => {
    setListo(false);
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  function detener() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function capturar() {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) return;
    setProcesando(true);
    try {
      const lado = Math.min(vid.videoWidth, vid.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sx = (vid.videoWidth - lado) / 2;
      const sy = (vid.videoHeight - lado) / 2;
      ctx.drawImage(vid, sx, sy, lado, lado, 0, 0, lado, lado);
      const dataUrl = canvas.toDataURL("image/png");
      detener();
      setProcesando(false);
      onCapturar(dataUrl);
    } catch (err) {
      console.error("Error capturando foto:", err);
      setError("No se pudo capturar la foto. Intenta de nuevo.");
      setProcesando(false);
    }
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

        {/* Indicador de procesamiento */}
        {procesando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center text-xs text-white">
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
            <span className="font-semibold text-pitch">Guardando foto...</span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        Buena luz · fondo claro o neutro · una sola persona · alineá el rostro con
        la guía.
      </p>

      {error && <p className="text-sm text-alerta">{error}</p>}

      <div className="flex justify-center gap-2">
        <Button onClick={capturar} disabled={!listo || procesando}>
          {procesando ? "Procesando..." : "Capturar"}
        </Button>
        <Button variant="secondary" onClick={toggleCámara} disabled={!listo || procesando}>
          Cambiar cámara
        </Button>
        <Button variant="secondary" onClick={cancelar} disabled={procesando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
