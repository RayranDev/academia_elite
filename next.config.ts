import type { NextConfig } from "next";
import os from "os";

const isDev = process.env.NODE_ENV !== "production";

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }
  }
  return ips;
}

/**
 * Content-Security-Policy (Sección 6.6). En desarrollo se permite 'unsafe-eval'
 * y websockets para el HMR de Next; en producción la política es más estricta.
 * Nota: Next inyecta scripts inline, por eso script-src incluye 'unsafe-inline'
 * (pero NUNCA 'unsafe-eval' en producción). Tailwind v4 usa estilos inline.
 */
const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' permite compilar el modelo WASM de remocion de fondo
  // (@imgly/background-removal) sin habilitar eval() de JS. blob: cubre los
  // workers de onnxruntime-web. Ambos son necesarios tambien en produccion.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ""}`,
  // onnxruntime-web instancia su runtime en un Web Worker (blob: URL).
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // El modelo se sirve desde el mismo origen (/imgly/, 'self'); blob: cubre el
  // fetch de los binarios WASM que la libreria expone como object URLs.
  `connect-src 'self' blob: https://cdn.jsdelivr.net${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(!isDev ? ["upgrade-insecure-requests"] : []),
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(!isDev
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.ngrok-free.dev", "*.ngrok.io", ...getLocalIPs()],
  experimental: {
    // El límite por defecto de body de las Server Actions es 1 MB y lo lanza
    // Next ANTES de ejecutar la acción. Lo subimos para cubrir la importación
    // de jugadores (.xlsx) y la subida de foto (hasta ~5 MB antes de recortar).
    serverActions: {
      bodySizeLimit: "6mb",
      allowedOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Aislamiento de origen SOLO en la pantalla de foto (donde corre la
        // remocion de fondo). Habilita crossOriginIsolated -> SharedArrayBuffer
        // -> onnxruntime-web multi-thread (mas rapido). Si el navegador no lo
        // soporta, la libreria cae a single-thread y sigue funcionando.
        // Scope acotado: la pagina solo renderiza recursos del mismo origen, asi
        // que 'credentialless' no rompe nada (y es menos estricto que require-corp).
        source: "/jugador/perfil",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
