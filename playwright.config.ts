import { defineConfig, devices } from "@playwright/test";
import { urlDeE2E } from "./tests/e2e/global-setup";

// Playwright no lee .env por su cuenta (Next sí lo hace para la app). Se usa el
// cargador nativo de Node; en CI las variables ya vienen del entorno.
try {
  (process as NodeJS.Process & { loadEnvFile?: (p: string) => void }).loadEnvFile?.(
    ".env",
  );
} catch {
  // Sin .env local: se asume que el entorno ya trae DATABASE_URL/DIRECT_URL.
}

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// La app bajo prueba apunta al schema aislado `e2e`, el mismo que `globalSetup`
// recrea y siembra. Así la suite nunca lee ni escribe los datos reales.
const urlApp = process.env.DATABASE_URL
  ? urlDeE2E(process.env.DATABASE_URL)
  : undefined;
const urlDirecta = process.env.DIRECT_URL
  ? urlDeE2E(process.env.DIRECT_URL)
  : urlApp;

export default defineConfig({
  testDir: "./tests/e2e",
  // Base recreada antes de cada corrida: estado determinista, sin arrastre.
  globalSetup: "./tests/e2e/global-setup.ts",
  // Las pruebas comparten la base de E2E: se ejecutan en serie para evitar carreras.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Se ejecuta contra un build de producción (rutas precompiladas): mucho más
  // rápido y estable que el dev server (que compila on-demand).
  webServer: {
    command: `npm run build && npm run start:e2e`,
    url: BASE_URL,
    // NO se reutiliza un server previo: `globalSetup` recrea el schema `e2e`, y
    // un proceso que quedó vivo mantiene conexiones a tablas ya dropeadas. El
    // server debe arrancar SIEMPRE después del reset.
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      // El E2E no debe enviar correos reales: sin RESEND_API_KEY, Resend cae a
      // modo consola. Evita inundar la casilla de EMAIL_DEV_TO en cada corrida
      // y quita la latencia de red variable que desestabilizaba los flujos.
      RESEND_API_KEY: "",
      // Sin Upstash, `rateLimit` cae al contador en memoria, que muere con el
      // proceso. Es OBLIGATORIO acá: el rate limit de Upstash es distribuido y
      // PERSISTENTE, así que sobrevive al reinicio del server y al reset del
      // schema. Compartido entre corridas, agotaba el limite de altas por IP y
      // el registro del spec 02 empezaba a fallar sin motivo aparente.
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      ...(urlApp ? { DATABASE_URL: urlApp } : {}),
      ...(urlDirecta ? { DIRECT_URL: urlDirecta } : {}),
    },
  },
});
