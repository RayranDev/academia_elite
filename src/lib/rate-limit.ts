import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting distribuido (Upstash Redis) con ventana deslizante por clave
// (p. ej. "login:ip:email"). En serverless la memoria del proceso no se
// comparte entre lambdas, así que el límite real vive en Redis.
//
// Fallback: sin las envs de Upstash (dev local, E2E) se usa la implementación
// en memoria de siempre — suficiente para un solo proceso.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Upstash fija limit+ventana por instancia de Ratelimit: memoizamos una por
// par (limit, windowMs). Los pares distintos no comparten contadores.
const limiters = new Map<string, Ratelimit>();

function limiterDe(limit: number, windowMs: number): Ratelimit {
  const clave = `${limit}:${windowMs}`;
  let limiter = limiters.get(clave);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis as Redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: `rl:${clave}`,
    });
    limiters.set(clave, limiter);
  }
  return limiter;
}

function rateLimitEnMemoria(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/**
 * @param key clave única del cliente/acción
 * @param limit nº máximo de intentos por ventana
 * @param windowMs duración de la ventana en ms
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!redis) return rateLimitEnMemoria(key, limit, windowMs);

  try {
    const { success, remaining, reset } = await limiterDe(limit, windowMs).limit(key);
    return {
      ok: success,
      remaining,
      retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()),
    };
  } catch {
    // Redis caído no debe tumbar el login: degradar al límite en memoria.
    return rateLimitEnMemoria(key, limit, windowMs);
  }
}

// Limpieza perezosa del fallback en memoria (no aplica al modo Redis).
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
