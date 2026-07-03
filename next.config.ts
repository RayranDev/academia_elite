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
 * Cabeceras de seguridad NO-CSP (Sección 6.6), globales para todo el sitio.
 *
 * La Content-Security-Policy NO se define acá: `headers()` de next.config sólo
 * ACUMULA cabeceras (no reemplaza), así que dos reglas que se solapan emiten dos
 * CSP y el navegador se queda con la intersección (la más restrictiva). Eso
 * rompía el 'unsafe-eval' que @imgly necesita en /jugador/perfil. La CSP se
 * emite en UN solo lugar y por-ruta desde `src/proxy.ts` (ver ahí).
 */
const securityHeaders = [
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
  // `sharp` es un módulo NATIVO: si Next lo bundlea, su binario rompe en el
  // runtime serverless de Vercel (500 en toda función que lo importe vía
  // escuela.service/foto.service — layouts dt/escuela/jugador y admin). Marcarlo
  // como external hace que se cargue desde node_modules con su binario correcto.
  serverExternalPackages: ["sharp"],
  // El `.node` de sharp carga libvips-cpp.so con dlopen en runtime; el análisis
  // estático de Next NO lo ve y NO lo copia a la función serverless (ERR_DLOPEN
  // en Vercel). Forzamos la inclusión de TODO el scope @img (binarios + libvips)
  // en cada función para que el .so esté presente.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/**/*"],
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.ngrok-free.dev", "*.ngrok.io", ...getLocalIPs()],
  experimental: {
    // El límite por defecto de body de las Server Actions es 1 MB y lo lanza
    // Next ANTES de ejecutar la acción. Lo subimos para cubrir la importación
    // de jugadores (.xlsx) y la subida de foto (el cliente recorta a ≤800px,
    // así que el body real es chico). Tope en 4mb: Vercel rechaza cualquier
    // request de más de 4.5 MB a nivel plataforma — ofrecer más sería mentir.
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],
    },
  },
  async headers() {
    return [
      {
        // Cabeceras de seguridad no-CSP para todo el sitio (incluidas rutas
        // /api y estáticos). La CSP se emite aparte desde src/proxy.ts.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
