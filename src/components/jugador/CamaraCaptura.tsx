"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Zap, ZapOff, X, Check, RotateCcw } from "lucide-react";

// Torch (flash) no está en los tipos DOM estándar; lo declaramos acotado.
type CapsConTorch = MediaTrackCapabilities & { torch?: boolean };

/**
 * Captura de foto in-app A PANTALLA COMPLETA: cámara (getUserMedia) con silueta
 * de guía, revisión de la foto tomada (repetir o usar) y flash SOLO si el
 * dispositivo lo soporta (raro en cámara frontal: el navegador no lo permite en
 * casi ningún caso). La remoción de fondo la hace la página al recibir la foto.
 */
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [captura, setCaptura] = useState<string | null>(null); // foto tomada, en revisión
  const [flashSoportado, setFlashSoportado] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function abrir() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu dispositivo no permite usar la cámara. Usa “Elegir foto”.");
        return;
      }
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // ¿Este equipo/cámara soporta flash? (casi nunca en la frontal).
        const caps = stream.getVideoTracks()[0]?.getCapabilities?.() as
          | CapsConTorch
          | undefined;
        setFlashSoportado(!!caps?.torch);
        setFlashOn(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setListo(true);
        }
      } catch (err) {
        console.error("Error abriendo cámara:", err);
        setError(
          "No se pudo acceder a la cámara. Revisa los permisos o usa “Elegir foto”.",
        );
      }
    }

    abrir();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  function cambiarCamara() {
    setListo(false);
    setFacingMode((p) => (p === "user" ? "environment" : "user"));
  }

  async function alternarFlash() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const nuevo = !flashOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nuevo } as unknown as MediaTrackConstraintSet],
      });
      setFlashOn(nuevo);
    } catch {
      setFlashSoportado(false); // el equipo dijo que sí pero no pudo: lo ocultamos
    }
  }

  function detener() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  /** Toma la foto y la deja EN REVISIÓN (no la confirma todavía). */
  function tomar() {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) return;
    const lado = Math.min(vid.videoWidth, vid.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (vid.videoWidth - lado) / 2;
    const sy = (vid.videoHeight - lado) / 2;
    ctx.drawImage(vid, sx, sy, lado, lado, 0, 0, lado, lado);
    setCaptura(canvas.toDataURL("image/png"));
  }

  function usar() {
    if (!captura) return;
    detener();
    onCapturar(captura);
  }

  function cancelar() {
    detener();
    onCancelar();
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      {/* Barra superior: cerrar + flash (si el equipo lo soporta) */}
      <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={cancelar}
          aria-label="Cerrar cámara"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {flashSoportado && !captura && (
          <button
            type="button"
            onClick={alternarFlash}
            aria-pressed={flashOn}
            aria-label={flashOn ? "Apagar flash" : "Encender flash"}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10"
          >
            {flashOn ? <Zap className="h-5 w-5 text-oro" aria-hidden /> : <ZapOff className="h-5 w-5" aria-hidden />}
          </button>
        )}
      </div>

      {/* Área de imagen: video en vivo o la foto tomada en revisión */}
      <div className="relative flex-1 overflow-hidden">
        {captura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captura} alt="Foto tomada" className="h-full w-full object-contain" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {/* Silueta de cabeza/hombros como guía de encuadre. */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 mx-auto h-full max-w-[min(100%,60vh)]" aria-hidden>
              <ellipse cx="50" cy="40" rx="17" ry="21" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="3 2.5" />
              <path d="M24 100 Q24 72 50 69 Q76 72 76 100" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="3 2.5" />
            </svg>
          </>
        )}
      </div>

      {/* Ayuda + errores */}
      {!captura && (
        <p className="px-4 pb-1 text-center text-xs text-white/70">
          Buena luz · fondo claro o neutro · una sola persona · alineá el rostro con la guía.
        </p>
      )}
      {error && <p className="px-4 pb-1 text-center text-sm text-alerta">{error}</p>}

      {/* Controles inferiores */}
      <div className="flex items-center justify-center gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {captura ? (
          <>
            <button
              type="button"
              onClick={() => setCaptura(null)}
              className="flex min-h-14 items-center gap-2 rounded-full bg-white/10 px-6 font-semibold"
            >
              <RotateCcw className="h-5 w-5" aria-hidden /> Repetir
            </button>
            <button
              type="button"
              onClick={usar}
              className="flex min-h-14 items-center gap-2 rounded-full bg-pitch px-6 font-bold text-base"
            >
              <Check className="h-5 w-5" aria-hidden /> Usar esta foto
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={cambiarCamara}
              disabled={!listo}
              aria-label="Cambiar cámara"
              className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white/10 disabled:opacity-40"
            >
              <RefreshCw className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={tomar}
              disabled={!listo}
              aria-label="Tomar foto"
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
            >
              <Camera className="h-7 w-7" aria-hidden />
            </button>
            <span className="min-h-12 min-w-12" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}
