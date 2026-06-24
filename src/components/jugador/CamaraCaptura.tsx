"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Utilidad auxiliar para inyectar scripts en el cliente de forma segura
function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar el script: ${src}`));
    document.body.appendChild(script);
  });
}

interface SelfieSegmentationResults {
  image: HTMLVideoElement | HTMLCanvasElement;
  segmentationMask: HTMLCanvasElement;
}

interface SelfieSegmentationInstance {
  setOptions: (options: { modelSelection: number }) => void;
  onResults: (callback: (results: SelfieSegmentationResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
}

interface CustomWindow extends Window {
  SelfieSegmentation: new (options: {
    locateFile: (file: string) => string;
  }) => SelfieSegmentationInstance;
}

// Captura de foto in-app (MVP #8 + Remoción de fondo local A):
// cámara frontal (getUserMedia) + silueta de guía + segmentación local en cliente
// usando MediaPipe Selfie Segmentation (compilado localmente en WASM).
export function CamaraCaptura({
  onCapturar,
  onCancelar,
}: {
  onCapturar: (dataUrl: string) => void;
  onCancelar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segmenterRef = useRef<SelfieSegmentationInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargandoModelo, setCargandoModelo] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // 1. Cargar el motor de segmentación localmente (vía CDN de forma perezosa)
  useEffect(() => {
    let cancelado = false;

    async function inicializarSegmentador() {
      try {
        await cargarScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js"
        );
        if (cancelado) return;

        const win = window as unknown as CustomWindow;
        if (typeof window !== "undefined" && win.SelfieSegmentation) {
          const segmenter = new win.SelfieSegmentation({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
          });

          segmenter.setOptions({
            modelSelection: 1, // 1 = landscape (más rápido en tiempo de ejecución)
          });

          segmenterRef.current = segmenter;
        }
      } catch (err) {
        console.error("Error al inicializar SelfieSegmentation:", err);
        // Fallback no bloqueante: si falla la carga del CDN, dejamos que use la cámara común.
        setError(
          "El optimizador de fondo no está disponible, pero podés capturar la foto igual."
        );
      } finally {
        if (!cancelado) {
          setCargandoModelo(false);
        }
      }
    }

    inicializarSegmentador();

    return () => {
      cancelado = true;
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close();
        } catch (e) {
          console.error("Error cerrando segmenter:", e);
        }
      }
    };
  }, []);

  // 2. Abrir la stream de la cámara frontal
  useEffect(() => {
    let cancelado = false;

    async function abrirCámara() {
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
  }, []);

  function detener() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    if (segmenterRef.current) {
      setProcesando(true);

      // Configuramos el manejador de resultados para esta captura específica
      segmenterRef.current.onResults((results: SelfieSegmentationResults) => {
        try {
          if (!results.image || !results.segmentationMask) {
            capturarNormal();
            return;
          }

          const videoWidth = results.image.width;
          const videoHeight = results.image.height;
          const lado = Math.min(videoWidth, videoHeight);

          // Canvas de salida recortado de forma cuadrada (mismo lado)
          const canvas = document.createElement("canvas");
          canvas.width = lado;
          canvas.height = lado;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            capturarNormal();
            return;
          }

          // Coordenadas para el recorte cuadrado centrado
          const sx = (videoWidth - lado) / 2;
          const sy = (videoHeight - lado) / 2;

          ctx.save();
          ctx.clearRect(0, 0, lado, lado);

          // 1. Dibujar la máscara de segmentación (recorte centrado)
          ctx.drawImage(results.segmentationMask, sx, sy, lado, lado, 0, 0, lado, lado);

          // 2. Cambiar modo de composición a 'source-in'
          ctx.globalCompositeOperation = "source-in";

          // 3. Dibujar la imagen original (recorte centrado)
          ctx.drawImage(results.image, sx, sy, lado, lado, 0, 0, lado, lado);
          ctx.restore();

          // Exportamos como PNG para preservar el canal alfa de transparencia
          const dataUrl = canvas.toDataURL("image/png");

          detener();
          setProcesando(false);
          onCapturar(dataUrl);
        } catch (err) {
          console.error("Error durante el procesamiento de la máscara:", err);
          capturarNormal();
        }
      });

      // Procesar el frame del video en caliente
      segmenterRef.current.send({ image: video });
    } else {
      capturarNormal();
    }

    // Fallback de captura estándar en caso de que falle el segmentador
    function capturarNormal() {
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
      const dataUrl = canvas.toDataURL("image/webp", 0.92);
      detener();
      setProcesando(false);
      onCapturar(dataUrl);
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

        {/* Indicador de carga de modelo WASM (Local) */}
        {cargandoModelo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center text-xs text-white">
            <div className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Optimizando procesamiento de imagen local...</span>
          </div>
        )}

        {/* Indicador de procesamiento de máscara */}
        {procesando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center text-xs text-white">
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
            <span className="font-semibold text-pitch">Recortando fondo...</span>
            <span className="mt-1 text-[10px] text-muted">Procesamiento local 100% privado</span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        Buena luz · fondo claro o neutro · una sola persona · alineá el rostro con
        la guía.
      </p>

      {error && <p className="text-sm text-alerta">{error}</p>}

      <div className="flex justify-center gap-2">
        <Button onClick={capturar} disabled={!listo || cargandoModelo || procesando}>
          {procesando ? "Procesando..." : "Capturar"}
        </Button>
        <Button variant="secondary" onClick={cancelar} disabled={procesando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

