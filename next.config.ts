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
 * Content-Security-Policy (Sección 6.6). Producción es estricta: NUNCA
 * 'unsafe-eval' de forma global. La ÚNICA excepción es `/jugador/perfil`
 * (`allowEval: true`), donde @imgly/background-removal necesita evaluar JS para
 * decodificar la imagen; ahí se sirve una CSP relajada SOLO para esa página.
 * En desarrollo se agrega 'unsafe-eval' + websockets para el HMR de Next.
 * Next inyecta scripts inline, por eso script-src incluye 'unsafe-inline'.
 */
function buildCsp(allowEval: boolean): string {
  const evalSrc = isDev || allowEval ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' compila el WASM de la remoción de fondo sin habilitar
    // eval() de JS. blob: cubre los workers de onnxruntime-web. El modelo es
    // 100% self-hosted (/imgly/): no hay CDN externo.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${evalSrc}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' blob:${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ]
    .join("; ")
    .concat(";");
}

function securityHeadersCon(cspValue: string) {
  return [
    { key: "Content-Security-Policy", value: cspValue },
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
}

const securityHeaders = securityHeadersCon(buildCsp(false));
const securityHeadersPerfil = securityHeadersCon(buildCsp(true));

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
        // Todo el sitio EXCEPTO /jugador/perfil. Se excluye con negative
        // lookahead: si /jugador/perfil recibiera TAMBIÉN la CSP estricta, el
        // navegador combinaría ambas de forma restrictiva y anularía el
        // 'unsafe-eval' de la CSP relajada.
        source: "/((?!jugador/perfil).*)",
        headers: securityHeaders,
      },
      {
        // /jugador/perfil: la remoción de fondo (@imgly) necesita 'unsafe-eval'.
        // Se sirve la CSP relajada SOLO acá. Página autenticada donde el padre
        // procesa su propia foto en su dispositivo.
        //
        // NO se ponen COOP/COEP acá a propósito: al marcar la página como
        // crossOriginIsolated, onnxruntime-web (motor de @imgly) intenta el
        // camino multi-thread con SharedArrayBuffer/workers y FALLA. Sin ese
        // aislamiento corre single-thread (unos segundos más lento) y funciona.
        source: "/jugador/perfil",
        headers: securityHeadersPerfil,
      },
    ];
  },
};

export default nextConfig;
