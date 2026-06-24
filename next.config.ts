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
  `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://cdn.jsdelivr.net${isDev ? " ws: wss:" : ""}`,
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
