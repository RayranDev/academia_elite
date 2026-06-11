import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/** Carpeta de uploads (Fase 1). Fuera de /public: nunca se sirve como estático. */
export function uploadsDir(): string {
  const dir = process.env.UPLOADS_DIR ?? "./storage/uploads";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export async function guardarFoto(nombre: string, buf: Buffer): Promise<void> {
  const dir = uploadsDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, nombre), buf);
}

export async function leerFoto(nombre: string): Promise<Buffer | null> {
  // Evita path traversal: solo nombres de archivo simples.
  if (nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) {
    return null;
  }
  try {
    return await fs.readFile(path.join(uploadsDir(), nombre));
  } catch {
    return null;
  }
}
