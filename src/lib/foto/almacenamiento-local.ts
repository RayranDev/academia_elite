import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Almacenamiento de archivos en un directorio del DISCO, para entornos de
 * prueba aislados (`npm run qa:entorno`, ver `scripts/qa/`). Sin esto, un
 * agente que sube una foto escribiría en el bucket REAL de Supabase.
 *
 * Se activa SOLO con la variable `ALMACENAMIENTO_LOCAL_DIR`. Reglas de
 * seguridad (datos de menores):
 *  - Si además está `SUPABASE_URL`, la configuración es ambigua y se lanza un
 *    error: así no se puede activar por accidente donde hay Storage real.
 *  - Si corre en Vercel (`VERCEL` definida) se rechaza: el disco es efímero y
 *    es la señal inequívoca de un despliegue real.
 *  - El directorio lo elige quien arranca el proceso; NUNCA va dentro de
 *    `public/` (las fotos de menores no se sirven como estáticos): se
 *    entregan solo por `/api/archivos/*`, con sesión, tenant y consentimiento.
 *
 * Este módulo no importa `server-only` a propósito: lo reutilizan las
 * herramientas de `scripts/` (que corren bajo `tsx`) y las pruebas unitarias.
 */

/** Evita path traversal: solo nombres de archivo simples (UUID.ext). */
export function nombreValido(nombre: string): boolean {
  return !(
    nombre.length === 0 ||
    nombre.includes("/") ||
    nombre.includes("\\") ||
    nombre.includes("..")
  );
}

/** Mismo mapeo que usa el almacenamiento en Supabase. */
export function contentTypeDe(nombre: string): string {
  return nombre.endsWith(".png") ? "image/png" : "image/webp";
}

/**
 * Directorio local configurado, o `null` si el modo local no está activo
 * (comportamiento habitual: Supabase Storage). Lanza si la configuración es
 * ambigua o peligrosa.
 */
export function directorioLocalDesdeEnv(
  env: Record<string, string | undefined>,
): string | null {
  const dir = env.ALMACENAMIENTO_LOCAL_DIR?.trim();
  if (!dir) return null;
  if (env.SUPABASE_URL?.trim()) {
    throw new Error(
      "Configuración ambigua: ALMACENAMIENTO_LOCAL_DIR y SUPABASE_URL están definidas a la vez. " +
        "El almacenamiento local es solo para entornos de prueba aislados; " +
        "define una sola de las dos.",
    );
  }
  if (env.VERCEL) {
    throw new Error(
      "ALMACENAMIENTO_LOCAL_DIR no se admite en Vercel: es solo para entornos de prueba locales.",
    );
  }
  return path.resolve(dir);
}

function rutaDe(dir: string, nombre: string): string {
  return path.join(dir, nombre);
}

export async function guardarEnDisco(
  dir: string,
  nombre: string,
  buf: Buffer,
): Promise<void> {
  if (!nombreValido(nombre)) {
    throw new Error("Nombre de archivo inválido.");
  }
  await mkdir(dir, { recursive: true });
  await writeFile(rutaDe(dir, nombre), buf);
}

export async function leerDeDisco(
  dir: string,
  nombre: string,
): Promise<Buffer | null> {
  if (!nombreValido(nombre)) return null;
  try {
    return await readFile(rutaDe(dir, nombre));
  } catch {
    return null;
  }
}

/** Best-effort, igual que el borrado en Supabase: un fallo no rompe el flujo. */
export async function borrarDeDisco(
  dir: string,
  nombre: string,
): Promise<void> {
  if (!nombreValido(nombre)) return;
  try {
    await unlink(rutaDe(dir, nombre));
  } catch {
    // No existía o ya se borró: nada que hacer.
  }
}
